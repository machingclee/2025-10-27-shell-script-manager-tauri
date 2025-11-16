#!/bin/bash

# Frontend-Only Build Script for Shell Script Manager
# This script builds ONLY the frontend and Tauri app (skips backend compilation)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_DIR="$PROJECT_ROOT/src-tauri"
RESOURCES_DIR="$TAURI_DIR/resources"

echo "========================================="
echo "Building Frontend Only"
echo "========================================="
echo ""

# Step 0: Check if backend binary exists
echo "Step 0: Checking for existing backend binary..."
BACKEND_BINARY="$RESOURCES_DIR/backend-spring/backend-native"
if [ ! -f "$BACKEND_BINARY" ]; then
    echo "⚠️  WARNING: Backend binary not found at $BACKEND_BINARY"
    echo "Please run 'yarn bundle' first to build the backend, or manually copy the backend binary."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Backend binary found (using existing)"
fi
echo ""

# Step 1: Clean up old Tauri build artifacts
echo "Step 1: Cleaning up old Tauri build artifacts..."
if [ -f "$TAURI_DIR/target/release/bundle/dmg/shell-script-manager_0.1.0_aarch64.dmg" ]; then
    rm -f "$TAURI_DIR/target/release/bundle/dmg/shell-script-manager_0.1.0_aarch64.dmg"
    echo "✓ Removed old DMG"
fi
if [ -d "$TAURI_DIR/target/release/bundle/macos/shell-script-manager.app" ]; then
    rm -rf "$TAURI_DIR/target/release/bundle/macos/shell-script-manager.app"
    echo "✓ Removed old .app bundle"
fi
echo ""

# Step 2: Build frontend
echo "Step 2: Building frontend..."
cd "$PROJECT_ROOT"
yarn build
echo "✓ Frontend built successfully"
echo ""

# Step 3: Build Tauri app (without DMG to avoid bundling error)
echo "Step 3: Building Tauri application..."
cd "$PROJECT_ROOT"
yarn tauri build --bundles app
echo "✓ .app bundle created successfully"
echo ""

# Step 4: Manually create DMG using create-dmg
echo "Step 4: Creating DMG installer..."
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
echo "✓ Frontend build completed!"
echo "========================================="
echo ""
echo "Your application bundle can be found in:"
echo "  .app: $TAURI_DIR/target/release/bundle/macos/shell-script-manager.app"
if [ -f "$DMG_DIR/shell-script-manager_0.1.0_aarch64.dmg" ]; then
    echo "  .dmg: $TAURI_DIR/target/release/bundle/dmg/shell-script-manager_0.1.0_aarch64.dmg"
fi
echo ""

