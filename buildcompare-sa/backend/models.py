from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class PriceItem(BaseModel):
    """Schema for scraped price data from retailers."""
    supplier: str
    product: str
    price: float = Field(..., gt=0)
    currency: str = "ZAR"
    in_stock: bool = True
    stock_quantity: Optional[int] = None
    link: Optional[str] = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


class PriceSearchResult(BaseModel):
    """Response model for price search endpoint."""
    query: str
    results: List[PriceItem]
    count: int
    cached: bool = False


class OCRMaterial(BaseModel):
    """Single material item extracted from OCR."""
    name: str
    quantity: float
    unit: str


class OCRResult(BaseModel):
    """Response model for OCR extraction."""
    filename: str
    materials: List[OCRMaterial]
    raw_text: str
    status: str = "success"


class RAGQueryRequest(BaseModel):
    """Request model for RAG queries."""
    query: str = Field(..., min_length=3, max_length=500)
    n_context_results: int = Field(default=3, ge=1, le=10)


class RAGQueryResponse(BaseModel):
    """Response model for RAG queries."""
    query: str
    context_retrieved: List[str]
    llm_response: str
    model_used: str


class CalculationRequest(BaseModel):
    """Request model for technical calculations."""
    calc_type: str = Field(..., pattern="^(bricks|paint|roof)$")
    area: float = Field(..., gt=0)
    variable: str = "standard"


class CalculationResponse(BaseModel):
    """Generic response for calculations."""
    calc_type: str
    input_area: float
    results: dict


class EstimatorRequest(BaseModel):
    """Request model for AI BoQ estimation."""
    foundation: str = ""
    structure: str = ""
    roofing: str = ""
    finishing: str = ""
