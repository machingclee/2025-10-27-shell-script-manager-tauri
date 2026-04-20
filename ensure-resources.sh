#!/bin/bash
# Ensure resource directories exist for development mode

echo "Ensuring resource directories exist..."

# Create backend-spring resources directory
mkdir -p src-tauri/resources/backend-spring
if [ ! -f src-tauri/resources/backend-spring/.gitkeep ]; then
    touch src-tauri/resources/backend-spring/.gitkeep
    echo "✓ Created src-tauri/resources/backend-spring/.gitkeep"
fi

echo "✓ Resource directories ready"
