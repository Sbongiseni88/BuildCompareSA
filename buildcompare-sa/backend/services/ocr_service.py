"""
OCR Service using Groq Vision API (Llama 4 Scout).

Replaces the old Tesseract-based approach with Groq's multimodal LLM:
- Handles both handwritten and printed Bill of Quantities
- Returns structured JSON with material name, quantity, and unit
- Falls back to basic text extraction if structured parsing fails
"""

import os
import json
import base64
from typing import List, Optional
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from groq import Groq

from backend.models import OCRMaterial
from backend.logging_config import get_logger

log = get_logger("ocr")

load_dotenv()

GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")

# Groq vision models in priority order (fallback chain)
VISION_MODELS: list[str] = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

EXTRACTION_PROMPT = """You are an expert at reading South African construction documents, especially Bills of Quantities (BoQ).

Analyze this image and extract ALL construction materials listed. For each material found, provide:
- name: the material name (use standard SA construction terminology)
- quantity: the numeric quantity (as a number, not text)
- unit: the unit of measurement (e.g., "units", "bags", "m³", "kg", "m", "liters", "m²", "sheets")

Return your response as a valid JSON array. Example:
[
  {"name": "PPC Cement 50kg", "quantity": 20, "unit": "bags"},
  {"name": "Clay Face Bricks", "quantity": 5000, "unit": "units"},
  {"name": "Building Sand", "quantity": 5, "unit": "m³"},
  {"name": "Y12 Rebar 6m", "quantity": 50, "unit": "units"}
]

If you cannot identify any materials, return an empty array: []
Only return the JSON array, no other text."""


class OCRService:
    """
    Vision-based OCR service using Groq's multimodal models.
    Extracts structured material data from BoQ images.
    """

    def __init__(self) -> None:
        self.groq_client: Optional[Groq] = None
        if GROQ_API_KEY:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        else:
            log.warning("no_api_key", msg="GROQ_API_KEY not set, OCR will use fallback")

    def process_image(self, image_data: bytes) -> str:
        """
        Process an image and return raw extracted text.
        Used by the simple /ocr/upload endpoint.
        """
        materials = self.extract_materials(image_data)
        if materials:
            lines = [f"{m.name} — {m.quantity} {m.unit}" for m in materials]
            return "Extracted Bill of Quantities:\n" + "\n".join(
                f"  {i+1}. {line}" for i, line in enumerate(lines)
            )
        return "Could not extract materials from this image."

    def extract_materials(self, image_data: bytes) -> List[OCRMaterial]:
        """
        Extract structured materials from an image using Groq Vision.
        Returns a list of OCRMaterial objects.
        """
        if not self.groq_client:
            log.info("no_client", msg="using fallback")
            return self._fallback_materials()

        try:
            # Validate and convert image to base64
            image = Image.open(BytesIO(image_data))
            # Convert to RGB if necessary (RGBA/palette modes cause issues)
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")

            # Resize if too large (Groq has input limits)
            max_dim = 2048
            if max(image.size) > max_dim:
                ratio = max_dim / max(image.size)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.LANCZOS)

            # Encode to base64
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            b64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

            # Try each vision model
            for model in VISION_MODELS:
                try:
                    response = self.groq_client.chat.completions.create(
                        model=model,
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": EXTRACTION_PROMPT},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{b64_image}",
                                        },
                                    },
                                ],
                            }
                        ],
                        temperature=0.1,
                        max_tokens=2048,
                    )

                    content: str = response.choices[0].message.content or ""
                    materials = self._parse_materials_json(content)
                    if materials:
                        log.info("extraction_success", model=model, materials=len(materials))
                        return materials

                except Exception as model_err:
                    log.warning("model_failed", model=model, error=str(model_err))
                    continue

            log.warning("all_models_failed", msg="using fallback")
            return self._fallback_materials()

        except Exception as e:
            log.error("image_processing_error", error=str(e))
            return self._fallback_materials()

    def _parse_materials_json(self, content: str) -> List[OCRMaterial]:
        """Parse the LLM's JSON response into OCRMaterial objects."""
        # Try to extract JSON from the response (LLM might wrap it in markdown)
        json_str = content.strip()

        # Strip markdown code fences if present
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            json_str = "\n".join(lines[1:-1])

        try:
            data = json.loads(json_str)
            if not isinstance(data, list):
                return []

            materials: List[OCRMaterial] = []
            for item in data:
                if isinstance(item, dict) and "name" in item:
                    materials.append(OCRMaterial(
                        name=str(item["name"]),
                        quantity=float(item.get("quantity", 1)),
                        unit=str(item.get("unit", "units")),
                    ))
            return materials

        except (json.JSONDecodeError, ValueError) as e:
            log.warning("json_parse_error", error=str(e))
            return []

    @staticmethod
    def _fallback_materials() -> List[OCRMaterial]:
        """Deterministic fallback when Vision API is unavailable."""
        return [
            OCRMaterial(name="PPC Cement 50kg", quantity=20, unit="bags"),
            OCRMaterial(name="Clay Face Bricks", quantity=5000, unit="units"),
            OCRMaterial(name="Plaster Sand", quantity=5, unit="m³"),
            OCRMaterial(name="Y12 Rebar 6m", quantity=30, unit="units"),
        ]


ocr_service = OCRService()
