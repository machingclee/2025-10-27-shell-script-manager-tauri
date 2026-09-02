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

# Spring Boot 4 AOT metadata is reachability-metadata.json (GraalVM 23+).
# GraalVM 17 ignores it and tree-shakes ApplicationKt__ApplicationContextInitializer,
# which then crashes at runtime with AotInitializerNotFoundException.
find_graalvm25_home() {
    local candidate
    for candidate in \
        "/Library/Java/JavaVirtualMachines/graalvm-25.jdk/Contents/Home" \
        "/Library/Java/JavaVirtualMachines/graalvm-jdk-25/Contents/Home" \
        "/Library/Java/JavaVirtualMachines/graalvm-community-openjdk-25/Contents/Home"
    do
        if [ -x "$candidate/bin/native-image" ]; then
            echo "$candidate"
            return 0
        fi
    done

    for candidate in /Library/Java/JavaVirtualMachines/*/Contents/Home; do
        if [ -x "$candidate/bin/native-image" ] && \
            "$candidate/bin/java" -version 2>&1 | grep -Eq 'GraalVM.*25|25\..*GraalVM'; then
            echo "$candidate"
            return 0
        fi
    done

    if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/native-image" ] && \
        "$JAVA_HOME/bin/java" -version 2>&1 | grep -Eq 'GraalVM.*25|25\..*GraalVM'; then
        echo "$JAVA_HOME"
        return 0
    fi

    return 1
}

GRAALVM_HOME="$(find_graalvm25_home || true)"
if [ -z "$GRAALVM_HOME" ]; then
    echo "ERROR: GraalVM 25 with native-image is required for Spring Boot 4 native builds."
    echo "GraalVM 17 will produce a binary that fails at startup with:"
    echo "  AotInitializerNotFoundException: ApplicationKt__ApplicationContextInitializer"
    echo ""
    echo "Install it with:"
    echo "  brew install --cask graalvm-jdk@25"
    echo "Then re-run: yarn bundle"
    exit 1
fi

export JAVA_HOME="$GRAALVM_HOME"
export PATH="$JAVA_HOME/bin:$PATH"
echo "Using GraalVM at: $JAVA_HOME"
"$JAVA_HOME/bin/java" -version
"$JAVA_HOME/bin/native-image" --version

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

