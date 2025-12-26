import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Shell Script Manager Python API")

# Enable CORS for Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri uses custom protocols
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "python-api",
        "port": int(os.getenv("PORT", 8000))
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Shell Script Manager Python API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }


@app.get("/api/example")
async def example_endpoint():
    """Example API endpoint"""
    return {
        "message": "This is an example endpoint",
        "data": {
            "key": "value",
            "items": [1, 2, 3]
        }
    }


if __name__ == "__main__":
    # Get port from environment variable (set by Tauri)
    port = int(os.getenv("PORT", 8000))

    print(f"Starting Python FastAPI server on port {port}...")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info"
    )
