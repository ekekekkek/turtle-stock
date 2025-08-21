FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend directory contents to /app
COPY backend/ .

# Set environment variables
ENV PORT=8000
ENV PYTHONPATH=/app

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 