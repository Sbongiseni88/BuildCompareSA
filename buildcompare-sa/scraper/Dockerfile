# Must match the version in requirements.txt (1.44.0) exactly to avoid browser mismatch!
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# In case any missing playwright dependencies slip through
RUN playwright install-deps chromium

COPY . .

EXPOSE 8000

# Bind to 0.0.0.0 instead of 127.0.0.1 for AWS reachability
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
