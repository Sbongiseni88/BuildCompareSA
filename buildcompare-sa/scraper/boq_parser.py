from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
import asyncio
import httpx
import json

def guess_cat(text):
    text = text.lower()
    if 'cement' in text: return 'cement'
    if 'brick' in text: return 'bricks'
    if 'steel' in text or 'rebar' in text: return 'steel'
    if 'timber' in text or 'wood' in text: return 'timber'
    if 'roof' in text: return 'roofing'
    if 'plumb' in text or 'pipe' in text: return 'plumbing'
    if 'wire' in text or 'electric' in text: return 'electrical'
    if 'paint' in text: return 'paint'
    return 'other'

router = APIRouter()

CONSTRUCTION_KEYWORDS = ['brick', 'cement', 'concrete', 'steel', 'timber', 'wood', 'plumb', 'electric', 'paint', 'roof', 'hardware', 'tile', 'door', 'window', 'rebar', 'sand']

PROMPT = """### ROLE: Chunk-Based BoQ Parser
### CONTEXT: 
You are receiving a segmented portion (a "chunk") of a large South African Construction Bill of Quantities. Your task is to extract material data from THIS CHUNK ONLY.

### CRITICAL PARSING RULES:
1. **Qualitative Filters** (CLASSIFICATION ONLY — never arithmetic):
   - Specs like "30MPa", "42.5N", "CEM II", "IBR 0.47mm", "Y12", "Ref 193"
   - These identify the GRADE/TYPE of material. Place them in the `specs` field.
   - NEVER multiply grade numbers by quantities (e.g., "30MPa × 5m³" = 5m³ of 30MPa concrete, NOT 150).

2. **Quantitative Multipliers** (ARITHMETIC VALUES):
   - Numeric columns labeled Quantity, Length, Area, Volume, Count, No.
   - Extract these as the `qty` field. These are physical measurements.

3. **Unit of Measure (UOM) Integrity**:
   - Always pair qty with the correct unit: bags, m², m³, lengths, each, sheets, kg.
   - If a price seems per-unit but qty suggests bulk, flag by appending "(verify UOM)" to search_query.

### GENERAL INSTRUCTIONS:
4. **Handle Incomplete Rows**: IGNORE rows cut off without descriptions.
5. **Ignore Metadata**: Discard headers, page numbers, and preamble.
6. **Localization**: Formulate `search_query` for South African retailers based on {location}.

### OUTPUT RULES:
- Return ONLY a raw JSON object string.
- If no materials are found, return `{"items": []}`.

### JSON SCHEMA:
{
  "items": [
    {
      "material": "Standardized Name (Title Case)",
      "specs": "Grade/Dimensions (e.g. 42.5N, 0.47mm)",
      "qty": 0,
      "unit": "Unit",
      "search_query": "Optimized Store Query"
    }
  ]
}"""

async def process_chunk(client: httpx.AsyncClient, chunk_str: str, location: str, api_key: str):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": PROMPT.replace("{location}", location)},
            {"role": "user", "content": chunk_str}
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    try:
        resp = await client.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload, timeout=20.0)
        if resp.status_code == 200:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            # remove formatting if deepseek returns markdown despite json_object format
            content = content.replace("```json", "").replace("```", "").strip()
            return content
    except Exception as e:
        pass
    return "[]"

@router.post("/boq/extract")
async def extract_boq(file: UploadFile = File(...), location: str = Form(""), deepseek_key: str = Form("")):
    if not deepseek_key:
        raise HTTPException(status_code=400, detail="Missing deepseek_api")

    content = await file.read()
    
    # Python-First: Pandas parsing
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content), on_bad_lines='skip', engine='python')
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        df = pd.DataFrame()

    # If parsing failed or empty, fallback to raw text strings if possible, but Pandas should handle mostly everything.
    if df.empty:
        raise HTTPException(status_code=400, detail="Could not parse file into tabular data.")

    # Convert all columns to strings and fillna
    df = df.astype(str).fillna("")

    # Create a unified searchable string per row to fuzzy match
    df['searchable'] = df.apply(lambda x: ' '.join(x).lower(), axis=1)

    # Keyword filter Drop 90% non-materials
    pattern = '|'.join(CONSTRUCTION_KEYWORDS)
    df_filtered = df[df['searchable'].str.contains(pattern)]

    if df_filtered.empty:
         # If strict filtering dropped everything, fallback to full dataset
         df_filtered = df
    else:
         df_filtered = df_filtered.drop(columns=['searchable'])
    
    # Return as list of CSV rows
    csv_str = df_filtered.to_csv(index=False)
    lines = csv_str.split("\n")
    
    # Async Chunking 
    CHUNK_SIZE = 150
    chunks = []
    for i in range(1, len(lines), CHUNK_SIZE): # skip header
        chunk = lines[i:i + CHUNK_SIZE]
        if chunk:
            chunks.append("\n".join(chunk))

    async def stream_ai_chunks():
        # First send an opening event
        init_event = json.dumps({"stage": "analyze", "progress": 30, "message": f"Python Pandas filtered rows down to {len(df_filtered)}. Starting AI chunking..."})
        yield init_event + "\n"
        
        async with httpx.AsyncClient() as client:
            tasks = [process_chunk(client, chunk, location, deepseek_key) for chunk in chunks]
            
            all_materials = []
            completed = 0
            
            for f in asyncio.as_completed(tasks):
                result_str = await f
                if result_str and result_str != "[]":
                    try:
                        obj = json.loads(result_str)
                        arr = obj.get("items", []) if isinstance(obj, dict) else obj
                        if isinstance(arr, dict):
                            arr = [arr] # Handle single object responses
                        if isinstance(arr, list):
                            all_materials.extend(arr)
                    except Exception as e:
                        print("JSON parsing error:", e)
                
                completed += 1
                progress = 30 + int((completed / max(1, len(tasks))) * 60)
                event = json.dumps({
                    "stage": "pricing",
                    "progress": progress,
                    "message": f"Processed AI Chunk {completed}/{len(tasks)}",
                    "partialResults": [], # Can't price dynamically here without DB logic
                })
                yield event + "\n"
            
            # Final event
            final_materials = []
            for i, m in enumerate(all_materials):
                final_materials.append({
                    "id": f"boq-py-{i}",
                    "name": m.get("material", "Unknown"),
                    "brand": m.get("specs", ""),
                    "category": guess_cat(m.get("material", "")),
                    "quantity": float(m.get("qty", 1)),
                    "unit": m.get("unit", "ea"),
                    "search_string": m.get("search_query", ""),
                })
                
            final_event = json.dumps({
                "stage": "complete",
                "progress": 100,
                "message": f"Complete. Extracted {len(final_materials)} items.",
                "materials": final_materials
            })
            yield final_event + "\n"

    return StreamingResponse(stream_ai_chunks(), media_type="application/x-ndjson")
