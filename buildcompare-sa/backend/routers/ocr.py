from fastapi import APIRouter, File, UploadFile, HTTPException
from backend.services.ocr_service import ocr_service

router = APIRouter(
    prefix="/api/v1/ocr",
    tags=["ocr"]
)

@router.post("/upload")
async def upload_boq(file: UploadFile = File(...)):
    """
    Upload an image of a Bill of Quantities (handwritten or printed) for OCR processing.
    """
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are supported.")
    
    try:
        contents = await file.read()
        extracted_text = ocr_service.process_image(contents)
        return {
            "filename": file.filename,
            "extracted_text": extracted_text,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
