#!/bin/bash
# Ensure resource directories exist for development mode

echo "Ensuring resource directories exist..."

# Create backend-spring resources directory
mkdir -p src-tauri/resources/backend-spring
if [ ! -f src-tauri/resources/backend-spring/.gitkeep ]; then
    touch src-tauri/resources/backend-spring/.gitkeep
    echo "✓ Created src-tauri/resources/backend-spring/.gitkeep"
fi

# Create python-backend resources directory
mkdir -p src-tauri/resources/python-backend
if [ ! -f src-tauri/resources/python-backend/.gitkeep ]; then
    touch src-tauri/resources/python-backend/.gitkeep
    echo "✓ Created src-tauri/resources/python-backend/.gitkeep"
fi

# Create python-runtime resources directory
mkdir -p src-tauri/resources/python-runtime
if [ ! -f src-tauri/resources/python-runtime/.gitkeep ]; then
    touch src-tauri/resources/python-runtime/.gitkeep
    echo "✓ Created src-tauri/resources/python-runtime/.gitkeep"
fi

echo "✓ Resource directories ready"
