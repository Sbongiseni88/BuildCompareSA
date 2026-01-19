from fastapi.testclient import TestClient
from backend.main import app
import os

client = TestClient(app)

def test_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "online", "service": "BuildCompare Data & AI Agent"}
    print("Health check passed.")

def test_price_aggregator():
    response = client.get("/api/v1/prices/?query=cement")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "supplier" in data[0]
    assert "price" in data[0]
    print("Price aggregator test passed.")

def test_ocr_upload_simulated():
    # Create a dummy image file
    from PIL import Image
    from io import BytesIO
    
    file = BytesIO()
    image = Image.new('RGB', (100, 100), color = 'red')
    image.save(file, 'png')
    file.seek(0)
    
    response = client.post(
        "/api/v1/ocr/upload",
        files={"file": ("test.png", file, "image/png")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "extracted_text" in data
    print("OCR upload test passed.")

if __name__ == "__main__":
    print("Running tests...")
    try:
        test_health()
        test_price_aggregator()
        test_ocr_upload_simulated()
        print("All tests passed successfully!")
    except ImportError as e:
        print(f"Test failed due to missing dependency: {e}")
    except Exception as e:
        print(f"Test failed: {e}")
