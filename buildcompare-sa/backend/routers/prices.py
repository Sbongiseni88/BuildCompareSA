from fastapi import APIRouter, HTTPException, Query
from backend.services.scraper import scraper_service
from typing import List, Dict, Any

router = APIRouter(
    prefix="/api/v1/prices",
    tags=["prices"]
)

@router.get("/", response_model=List[Dict[str, Any]])
async def get_aggregated_prices(query: str = Query(..., min_length=2)):
    """
    Fetch and aggregate prices from multiple retailers (Builders, Cashbuild, Leroy Merlin).
    Prioritizes AsyncIO for concurrency.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query string is required")
    
    results = await scraper_service.get_prices(query)
    return results
