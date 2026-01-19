import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from backend.services.scraper import scraper_service
from backend.services.ocr_service import ocr_service

async def test_scraper():
    print("Testing Scraper...")
    results = await scraper_service.get_prices("cement")
    assert len(results) == 3
    assert results[0]['supplier'] in ["Builders Warehouse", "Cashbuild", "Leroy Merlin"]
    print("Scraper test passed.")

def test_ocr():
    print("Testing OCR...")
    # Simulate bytes
    dummy_bytes = b"fakeimagecontent"
    # This should fail to open image and return "Invalid image format" or similar since bytes are garbage
    # OR if we want to test fallback we need a valid image but no pytesseract.
    # Let's test providing invalid bytes handles gracefully.
    result = ocr_service.process_image(dummy_bytes)
    print(f"OCR Result for garbage bytes: {result}")
    assert "Invalid image format" in result or "OCR processing failed" in result

    # Test logic if we could import it. 
    # Since we can't easily mock pytesseract availability here without reloading modules,
    # we just check that it runs without crashing.
    print("OCR test passed.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_scraper())
    test_ocr()
