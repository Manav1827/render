# Use official Python image
FROM python:3.12-slim

# Install system dependencies (espeak is needed for pyttsx3)
RUN apt-get update && apt-get install -y espeak

# Set working directory inside the container
WORKDIR /backend

# Copy all files from your project into the container
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose FastAPI default port
EXPOSE 8000

# Start the FastAPI server
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
