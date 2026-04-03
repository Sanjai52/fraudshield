FROM python:3.10-slim

# Install system deps
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements FIRST (better caching)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy rest of project
COPY . .

# Start FastAPI (IMPORTANT FIX HERE)
CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "8000"]