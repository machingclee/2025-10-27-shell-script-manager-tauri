#!/bin/bash

# Script to download and extract JRE for bundling with the application
# This uses Amazon Corretto 17 which is free and production-ready

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JRE_DIR="$SCRIPT_DIR/jre"

# Detect OS and architecture
OS=$(uname -s)
ARCH=$(uname -m)

echo "Detected OS: $OS"
echo "Detected Architecture: $ARCH"

# Clean up existing JRE
if [ -d "$JRE_DIR" ]; then
    echo "Removing existing JRE directory..."
    rm -rf "$JRE_DIR"
fi

mkdir -p "$JRE_DIR"

case "$OS" in
    Darwin)
        # macOS
        if [ "$ARCH" = "arm64" ]; then
            echo "Downloading Amazon Corretto 17 JRE for macOS ARM64..."
            JRE_URL="https://corretto.aws/downloads/latest/amazon-corretto-17-aarch64-macos-jdk.tar.gz"
        else
            echo "Downloading Amazon Corretto 17 JRE for macOS x64..."
            JRE_URL="https://corretto.aws/downloads/latest/amazon-corretto-17-x64-macos-jdk.tar.gz"
        fi
        
        echo "Downloading from: $JRE_URL"
        curl -L -o "$JRE_DIR/jre.tar.gz" "$JRE_URL"
        
        echo "Extracting JRE..."
        cd "$JRE_DIR"
        tar -xzf jre.tar.gz
        
        # Find the extracted directory (it will have a version number)
        EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "amazon-corretto-*" | head -n 1)
        
        if [ -n "$EXTRACTED_DIR" ]; then
            # Move contents to jre directory
            mv "$EXTRACTED_DIR"/* .
            rm -rf "$EXTRACTED_DIR"
        fi
        
        rm jre.tar.gz
        echo "JRE downloaded and extracted successfully for macOS"
        ;;
        
    Linux)
        # Linux
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            echo "Downloading Amazon Corretto 17 JRE for Linux ARM64..."
            JRE_URL="https://corretto.aws/downloads/latest/amazon-corretto-17-aarch64-linux-jdk.tar.gz"
        else
            echo "Downloading Amazon Corretto 17 JRE for Linux x64..."
            JRE_URL="https://corretto.aws/downloads/latest/amazon-corretto-17-x64-linux-jdk.tar.gz"
        fi
        
        echo "Downloading from: $JRE_URL"
        curl -L -o "$JRE_DIR/jre.tar.gz" "$JRE_URL"
        
        echo "Extracting JRE..."
        cd "$JRE_DIR"
        tar -xzf jre.tar.gz
        
        # Find the extracted directory
        EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "amazon-corretto-*" | head -n 1)
        
        if [ -n "$EXTRACTED_DIR" ]; then
            mv "$EXTRACTED_DIR"/* .
            rm -rf "$EXTRACTED_DIR"
        fi
        
        rm jre.tar.gz
        echo "JRE downloaded and extracted successfully for Linux"
        ;;
        
    MINGW*|MSYS*|CYGWIN*)
        # Windows (Git Bash/MSYS2)
        echo "For Windows, please run download-jre.ps1 instead"
        exit 1
        ;;
        
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

echo ""
echo "JRE is ready at: $JRE_DIR"
echo "You can now build the production Tauri app"

