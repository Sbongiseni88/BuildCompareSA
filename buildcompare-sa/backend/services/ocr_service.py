from PIL import Image
from io import BytesIO

# Try importing pytesseract, set to None if missing
try:
    import pytesseract
except ImportError:
    pytesseract = None


class OCRService:
    def process_image(self, image_data: bytes) -> str:
        try:
            image = Image.open(BytesIO(image_data))
            # Perform OCR
            # Note: This requires Tesseract to be installed on the system and in PATH.
            # If not found, we will return a simulated response for the prototype.
            try:
                if pytesseract is None:
                    raise ImportError("pytesseract module not found")
                text = pytesseract.image_to_string(image)
                return text
            except (ImportError, AttributeError):
                 # Fallback for when tesseract binary/module is not found locally
                return self._simulated_ocr_extraction()
            except Exception as e:
                return f"OCR processing failed: {str(e)}"
        except Exception as e:
            return f"Invalid image format: {str(e)}"

    def _simulated_ocr_extraction(self):
        """
        Fallback simulation if Tesseract isn't configured in the environment.
        Simulates extracting a Bill of Quantities.
        """
        return """
        Parsed Bill of Quantities (Simulated):
        1. Cement Bags (50kg) - 20 units
        2. Clay Bricks - 5000 units
        3. Plaster Sand - 5 cubic meters
        """

ocr_service = OCRService()
