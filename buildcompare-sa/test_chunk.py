import asyncio
import httpx
import os

PROMPT = """### ROLE: Chunk Parser
### INSTRUCTIONS: Extract materials.
### OUTPUT RULES: Return ONLY a raw JSON object string.
### JSON SCHEMA:
{"items": [{"material": "something"}]}
"""

async def process_chunk(client, chunk_str, api_key):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "system", "content": PROMPT}, {"role": "user", "content": chunk_str}],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=20.0)
    print("Status", resp.status_code)
    if resp.status_code != 200:
        print("Error", resp.text)
    else:
        print("Output:", resp.json()["choices"][0]["message"]["content"])

async def main():
    async with httpx.AsyncClient() as client:
        await process_chunk(client, "test data", os.getenv('GROQ_API_KEY'))

asyncio.run(main())
