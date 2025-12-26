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

# Step 0: Ensure Python runtime is installed
echo "Step 0: Checking Python runtime..."
sh "$PROJECT_ROOT/install_python_runtime.sh"
echo ""

# Step 0.5: Copy Python scripts to resources
echo "Step 0.5: Copying Python scripts to resources..."
sh "$PROJECT_ROOT/copy-python-scripts.sh"
echo ""

# Step 0.6: Update tauri.conf.json to include Python resources
echo "Step 0.6: Updating tauri.conf.json for production build..."
TAURI_CONF="$TAURI_DIR/tauri.conf.json"
# Backup original config
cp "$TAURI_CONF" "$TAURI_CONF.backup"

# Add Python resources using jq (or sed if jq not available)
if command -v jq &> /dev/null; then
    jq '.bundle.resources += ["resources/python-runtime/**/*", "resources/python-backend/**/*"]' "$TAURI_CONF" > "$TAURI_CONF.tmp"
    mv "$TAURI_CONF.tmp" "$TAURI_CONF"
    echo "✓ Added Python resources to tauri.conf.json"
else
    # Fallback to sed if jq is not available
    sed -i '' 's/"resources\/backend-spring\/backend-native"/"resources\/backend-spring\/backend-native",\n            "resources\/python-runtime\/**\/*",\n            "resources\/python-backend\/**\/*"/' "$TAURI_CONF"
    echo "✓ Added Python resources to tauri.conf.json (using sed)"
fi
echo ""

# Step 1: Clean up old build artifacts
echo "Step 1: Cleaning up old build artifacts..."
if [ -f "$TAURI_DIR/target/release/bundle/dmg/shell-script-manager_0.1.0_aarch64.dmg" ]; then
    rm -f "$TAURI_DIR/target/release/bundle/dmg/shell-script-manager_0.1.0_aarch64.dmg"
    echo "✓ Removed old DMG"
fi
if [ -d "$TAURI_DIR/target/release/bundle/macos/shell-script-manager.app" ]; then
    rm -rf "$TAURI_DIR/target/release/bundle/macos/shell-script-manager.app"
    echo "✓ Removed old .app bundle"
fi
echo ""

# Step 2: Build GraalVM Native Image
echo "Step 2: Building GraalVM Native Image (this may take 5-10 minutes)..."
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

# Step 3: Create resources directory structure
echo "Step 3: Preparing Tauri resources..."
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

# Step 4: Build frontend
echo "Step 4: Building frontend..."
cd "$PROJECT_ROOT"
yarn build
echo "✓ Frontend built successfully"
echo ""

# Step 5: Build Tauri app (without DMG to avoid bundling error)
echo "Step 5: Building Tauri application..."
cd "$PROJECT_ROOT"
yarn tauri build --bundles app
echo "✓ .app bundle created successfully"
echo ""

# Step 6: Manually create DMG using create-dmg
echo "Step 6: Creating DMG installer..."
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
        # Remove quarantine attributes for local testing
        xattr -cr "$DMG_DIR/shell-script-manager_0.1.0_aarch64.dmg"
        echo "✓ Quarantine attributes removed"
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

