FROM python:3.10-slim

# Install system deps
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy lightweight requirements
COPY requirements-prod.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements-prod.txt

# Copy project
COPY . .

# Start FastAPI
CMD ["uvicorn", "services.ai.main:app", "--host", "0.0.0.0", "--port", "8080"]