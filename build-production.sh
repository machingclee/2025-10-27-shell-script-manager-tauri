#!/bin/bash

# Production Build Script for Shell Script Manager
# This script compiles the backend to a GraalVM native image and builds the Tauri app

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend-spring"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
RESOURCES_DIR="$TAURI_DIR/resources"

echo "========================================="
echo "Building Shell Script Manager Production"
echo "========================================="
echo ""

# Step 1: Build GraalVM Native Image
echo "Step 1: Building GraalVM Native Image (this may take 5-10 minutes)..."
cd "$BACKEND_DIR"

# Detect GraalVM installation
if [ -d "/Library/Java/JavaVirtualMachines/graalvm-jdk-17/Contents/Home" ]; then
    export JAVA_HOME="/Library/Java/JavaVirtualMachines/graalvm-jdk-17/Contents/Home"
    echo "Using GraalVM at: $JAVA_HOME"
elif command -v java &> /dev/null && java -version 2>&1 | grep -q "GraalVM"; then
    echo "Using GraalVM from PATH"
else
    echo "ERROR: GraalVM not found. Please install GraalVM 17:"
    echo "  brew install --cask graalvm/tap/graalvm-jdk17"
    exit 1
fi

./gradlew clean nativeCompile
echo "✓ Native image built successfully"
echo ""

# Step 2: Create resources directory structure
echo "Step 2: Preparing Tauri resources..."
mkdir -p "$RESOURCES_DIR/backend-spring"

# Copy the native binary
echo "Copying native binary..."
NATIVE_BINARY="$BACKEND_DIR/build/native/nativeCompile/backend-native"
if [ ! -f "$NATIVE_BINARY" ]; then
    echo "ERROR: Native binary not found at $NATIVE_BINARY"
    exit 1
fi
cp "$NATIVE_BINARY" "$RESOURCES_DIR/backend-spring/backend-native"
chmod +x "$RESOURCES_DIR/backend-spring/backend-native"
echo "✓ Native binary copied to: $RESOURCES_DIR/backend-spring/backend-native"
echo ""

# Step 3: Build frontend
echo "Step 3: Building frontend..."
cd "$PROJECT_ROOT"
yarn build
echo "✓ Frontend built successfully"
echo ""

# Step 4: Build Tauri app (without DMG to avoid bundling error)
echo "Step 4: Building Tauri application..."
cd "$PROJECT_ROOT"
yarn tauri build --bundles app
echo "✓ .app bundle created successfully"
echo ""

# Step 5: Manually create DMG using create-dmg
echo "Step 5: Creating DMG installer..."
APP_PATH="$TAURI_DIR/target/release/bundle/macos/shell-script-manager.app"
DMG_DIR="$TAURI_DIR/target/release/bundle/dmg"
mkdir -p "$DMG_DIR"

if [ -d "$APP_PATH" ]; then
    create-dmg \
        --volname "Shell Script Manager" \
        --window-pos 200 120 \
        --window-size 800 400 \
        --icon-size 100 \
        --icon "shell-script-manager.app" 200 190 \
        --hide-extension "shell-script-manager.app" \
        --app-drop-link 600 185 \
        "$DMG_DIR/shell-script-manager_0.1.0_aarch64.dmg" \
        "$APP_PATH" || echo "⚠️  DMG creation failed, but .app is ready"
    
    if [ -f "$DMG_DIR/shell-script-manager_0.1.0_aarch64.dmg" ]; then
        echo "✓ DMG created successfully"
    fi
else
    echo "⚠️  .app not found at $APP_PATH"
fi
echo ""

echo "========================================="
echo "✓ Production build completed!"
echo "========================================="
echo ""
echo "Your application bundle can be found in:"
echo "  .app: $TAURI_DIR/target/release/bundle/macos/shell-script-manager.app"
echo "  .dmg: $TAURI_DIR/target/release/bundle/dmg/shell-script-manager_0.1.0_aarch64.dmg"
echo ""

