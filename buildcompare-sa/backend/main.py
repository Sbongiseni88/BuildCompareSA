import os
import sys
import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, Any

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
from backend.logging_config import setup_logging, get_logger

# Initialize structured logging
setup_logging("DEBUG")
log = get_logger("main")

# Load environment variables
load_dotenv()


# ---------------------------------------------------------------------------
# Environment validation — fail fast if critical config is missing
# ---------------------------------------------------------------------------
def _validate_environment() -> Dict[str, str]:
    """
    Check required and optional env vars at startup.
    Returns a dict of { var_name: status } for the startup banner.
    """
    env_status: Dict[str, str] = {}

    # Required vars — warn but don't crash (app can still serve some endpoints)
    required_vars = {
        "GROQ_API_KEY": "AI/LLM features (chat, OCR, RAG)",
    }
    optional_vars = {
        "SUPABASE_URL": "Database access",
        "SUPABASE_SERVICE_KEY": "Database admin operations",
        "ALLOWED_ORIGINS": "CORS origins (defaults to localhost)",
    }

    missing_critical = []
    for var, purpose in required_vars.items():
        value = os.getenv(var)
        if value:
            env_status[var] = "✅ set"
        else:
            env_status[var] = f"⚠️ MISSING — {purpose} will be unavailable"
            missing_critical.append(var)

    for var, purpose in optional_vars.items():
        value = os.getenv(var)
        env_status[var] = "✅ set" if value else f"ℹ️ not set — {purpose}"

    return env_status


# Run validation
_env_status = _validate_environment()

# Startup timestamp
_startup_time = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="BuildCompare AI Backend",
    description="High-concurrency FastAPI server for BuildCompare SA with Groq RAG",
    version="2.1.0"
)

# CORS middleware
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://buildcompare-sa.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(prices.router)
app.include_router(ocr.router)
app.include_router(estimator.router)


# ---------------------------------------------------------------------------
# Startup banner
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def _startup_banner() -> None:
    # Log banner lines individually (looks cleaner in structured logs)
    log.info("startup", msg="BuildCompare SA — Backend v2.1.0 starting")
    log.info("startup_env", status=_env_status)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def read_root() -> Dict[str, Any]:
    return {
        "status": "online",
        "service": "BuildCompare Data & AI Agent",
        "version": "2.1.0",
        "llm_provider": "Groq Cloud (Llama 3.3 / Llama 4 Scout)",
    }


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Comprehensive health check for load balancers and monitoring.
    Checks: uptime, Groq API key, ChromaDB collection, and memory.
    """
    import psutil  # Optional but useful — graceful fallback if not installed

    checks: Dict[str, Any] = {
        "status": "healthy",
        "uptime_seconds": round((datetime.now(timezone.utc) - _startup_time).total_seconds()),
        "version": "2.1.0",
        "checks": {},
    }

    # Check 1: Groq API key
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    checks["checks"]["groq_api"] = "ok" if groq_ok else "missing"

    # Check 2: ChromaDB collection
    chroma_ok = groq_rag_service.collection is not None
    checks["checks"]["chromadb"] = "ok" if chroma_ok else "not_connected"

    # Check 3: Memory usage
    try:
        process = psutil.Process()
        mem_mb = round(process.memory_info().rss / 1024 / 1024, 1)
        checks["checks"]["memory_mb"] = mem_mb
    except Exception:
        checks["checks"]["memory_mb"] = "unknown"

    # Overall status
    if not groq_ok:
        checks["status"] = "degraded"

    return checks


@app.get("/ready")
async def readiness_check() -> Dict[str, str]:
    """
    Readiness probe — lightweight check used by orchestrators (K8s, Railway).
    Returns 200 only if the service can handle requests.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="Service not ready: GROQ_API_KEY not configured"
        )
    return {"status": "ready"}


@app.post("/rag/query", response_model=RAGQueryResponse)
async def query_knowledge_base(request: RAGQueryRequest):
    """
    RAG Endpoint using Groq Cloud (async, non-blocking):
    1. Search ChromaDB for relevant context.
    2. Pass context + query to Groq Llama 3.1.
    3. Return synthesized answer.
    """
    try:
        result = await asyncio.to_thread(
            groq_rag_service.query,
            user_query=request.query,
            n_context_results=request.n_context_results
        )
        return RAGQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")


@app.post("/calc/technical")
async def technical_calculation(request: CalculationRequest):
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
