# Python Backend Development

This folder contains the Python FastAPI backend for development purposes.

## Setup

```bash
cd python-backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

## Run Development Server

```bash
python app.py
```

The server will start on port 8000 by default.

## Endpoints

- `GET /` - Root endpoint with API info
- `GET /health` - Health check endpoint
- `GET /api/example` - Example API endpoint
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /openapi.json` - OpenAPI schema

## Production Bundling

During the build process (`yarn bundle`), the Python scripts are automatically copied to `src-tauri/resources/python-scripts/` for bundling with the Tauri app.

The bundled app uses the Python runtime at `src-tauri/resources/python-runtime/` to execute the scripts.
