#!/bin/bash
# Copy Python scripts from development folder to resources for bundling

echo "Copying Python scripts to resources..."

# Create target directory
mkdir -p src-tauri/resources/python-backend

# Copy Python files (exclude dev files like .venv, pyproject.toml, etc.)
cp python-backend/*.py src-tauri/resources/python-backend/

echo "Python scripts copied successfully!"
