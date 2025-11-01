#!/bin/bash

# Production Build Script for Shell Script Manager
# This script builds the Spring Boot backend, downloads JRE, and builds the Tauri app

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend-spring"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
RESOURCES_DIR="$TAURI_DIR/resources"

echo "========================================="
echo "Building Shell Script Manager Production"
echo "========================================="
echo ""

# Step 1: Build Spring Boot JAR
echo "Step 1: Building Spring Boot JAR..."
cd "$BACKEND_DIR"
./gradlew clean bootJar
echo "✓ Spring Boot JAR built successfully"
echo ""

# Step 2: Download JRE if not exists
echo "Step 2: Checking for JRE..."
if [ ! -d "$BACKEND_DIR/jre" ]; then
    echo "JRE not found. Downloading..."
    cd "$BACKEND_DIR"
    ./download-jre.sh
else
    echo "✓ JRE already exists"
fi
echo ""

# Step 3: Create resources directory structure
echo "Step 3: Preparing Tauri resources..."
mkdir -p "$RESOURCES_DIR/backend-spring"

# Copy the JAR file
echo "Copying Spring Boot JAR..."
JAR_FILE=$(find "$BACKEND_DIR/build/libs" -name "*.jar" -not -name "*-plain.jar" | head -n 1)
if [ -z "$JAR_FILE" ]; then
    echo "ERROR: Could not find Spring Boot JAR file"
    exit 1
fi
cp "$JAR_FILE" "$RESOURCES_DIR/backend-spring/app.jar"
echo "✓ JAR copied to: $RESOURCES_DIR/backend-spring/app.jar"

# Copy the JRE
echo "Copying JRE..."
if [ -d "$RESOURCES_DIR/backend-spring/jre" ]; then
    rm -rf "$RESOURCES_DIR/backend-spring/jre"
fi
cp -R "$BACKEND_DIR/jre" "$RESOURCES_DIR/backend-spring/jre"
echo "✓ JRE copied to: $RESOURCES_DIR/backend-spring/jre"
echo ""

# Step 4: Build frontend
echo "Step 4: Building frontend..."
cd "$PROJECT_ROOT"
yarn build
echo "✓ Frontend built successfully"
echo ""

# Step 5: Build Tauri app
echo "Step 5: Building Tauri application..."
cd "$PROJECT_ROOT"
yarn tauri build
echo ""

echo "========================================="
echo "✓ Production build completed!"
echo "========================================="
echo ""
echo "Your application bundle can be found in:"
echo "  $TAURI_DIR/target/release/bundle/"
echo ""

