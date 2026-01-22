from fastapi import APIRouter, HTTPException
from backend.models import EstimatorRequest
from backend.services.groq_rag import groq_rag_service
import json

router = APIRouter(
    prefix="/api/v1/estimator",
    tags=["estimator"]
)

@router.post("/boq")
async def generate_boq_estimate(request: EstimatorRequest):
    """
    Generate a Bill of Quantities using Groq Llama 3.1 based on project specs.
    Returns a structured JSON list of materials.
    """
    try:
        # Convert request model to dict for the service
        specs = request.dict()
        
        # Call the RAG service which now uses Llama 3.1 in JSON mode
        json_string = groq_rag_service.generate_boq(specs)
        
        # Parse the JSON string returned by the LLM
        try:
            result = json.loads(json_string)
        except json.JSONDecodeError:
            # If LLM failed to return pure JSON (rare with Llama 3.1 but possible)
            # We construct a simple error response or try to extract JSON from text
            print(f"Failed to parse LLM JSON: {json_string}")
            return {"materials": []} # Fail safe
            
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimator failure: {str(e)}")
