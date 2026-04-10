from fastapi import APIRouter, File, UploadFile, HTTPException
from backend.services.ocr_service import ocr_service
from backend.models import OCRResult

router = APIRouter(
    prefix="/api/v1/ocr",
    tags=["ocr"]
)


@router.post("/upload", response_model=OCRResult)
async def upload_boq(file: UploadFile = File(...)):
    """
    Upload an image of a Bill of Quantities (handwritten or printed) for OCR processing.
    Returns structured material data extracted via Groq Vision API.
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Supported: JPEG, PNG, WebP."
        )

    # Limit file size (10MB max)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    try:
        materials = ocr_service.extract_materials(contents)
        raw_text = ocr_service.process_image(contents)

        return OCRResult(
            filename=file.filename or "unknown",
            materials=materials,
            raw_text=raw_text,
            status="success" if materials else "fallback",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
