import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    RAGQueryRequest,
    RAGQueryResponse,
    CalculationRequest,
    CalculationResponse,
    PriceSearchResult
)
from backend.calculations import (
    calculate_bricks_needed,
    calculate_paint_liters,
    calculate_roof_tiles
)
from backend.services.groq_rag import groq_rag_service
from backend.routers import prices, ocr, estimator

# Load environment variables
load_dotenv()

app = FastAPI(
    title="BuildCompare AI Backend",
    description="High-concurrency FastAPI server for BuildCompare SA with Groq RAG",
    version="2.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(prices.router)
app.include_router(ocr.router)
app.include_router(estimator.router)


# --- Routes ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "BuildCompare Data & AI Agent",
        "version": "2.0.0",
        "llm_provider": "Groq Cloud (Llama 3.1)"
    }


@app.get("/health")
def health_check():
    """Health check endpoint for deployment."""
    return {"status": "healthy"}


@app.post("/rag/query", response_model=RAGQueryResponse)
def query_knowledge_base(request: RAGQueryRequest):
    """
    RAG Endpoint using Groq Cloud:
    1. Search ChromaDB for relevant context.
    2. Pass context + query to Groq Llama 3.1.
    3. Return synthesized answer.
    """
    try:
        result = groq_rag_service.query(
            user_query=request.query,
            n_context_results=request.n_context_results
        )
        return RAGQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")


@app.post("/calc/technical")
def technical_calculation(request: CalculationRequest):
    """
    Middleware for technical construction calculations.
    Supports: bricks, paint, roof.
    """
    if request.calc_type == "bricks":
        results = calculate_bricks_needed(request.area, request.variable)
    elif request.calc_type == "paint":
        try:
            coats = int(request.variable)
        except ValueError:
            coats = 2
        results = calculate_paint_liters(request.area, coats)
    elif request.calc_type == "roof":
        results = calculate_roof_tiles(request.area)
    else:
        raise HTTPException(status_code=400, detail="Unknown calculation type")
    
    return CalculationResponse(
        calc_type=request.calc_type,
        input_area=request.area,
        results=results
    )


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
