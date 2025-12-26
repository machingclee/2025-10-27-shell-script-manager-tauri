#!/bin/bash
# Download and install Python 3.12 standalone runtime if not present

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$SCRIPT_DIR/src-tauri/resources/python-runtime"

echo "Checking Python runtime installation..."

# Check if runtime already exists
if [ -d "$RUNTIME_DIR/aarch64" ] || [ -d "$RUNTIME_DIR/x86_64" ]; then
    echo "✓ Python runtime already installed"
    exit 0
fi

echo "Python runtime not found. Installing..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    ARCH="aarch64"
    PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/20241016/cpython-3.12.7+20241016-aarch64-apple-darwin-install_only.tar.gz"
elif [ "$ARCH" = "x86_64" ]; then
    PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/20241016/cpython-3.12.7+20241016-x86_64-apple-darwin-install_only.tar.gz"
else
    echo "ERROR: Unsupported architecture: $ARCH"
    exit 1
fi

echo "Downloading Python 3.12.7 for $ARCH..."
mkdir -p "$RUNTIME_DIR"
cd "$RUNTIME_DIR"

# Download with wget (with progress bar)
if ! wget --show-progress -O python.tar.gz "$PYTHON_URL"; then
    echo "ERROR: Failed to download Python runtime"
    rm -f python.tar.gz
    exit 1
fi

# Verify it's a valid tar.gz file
if ! file python.tar.gz | grep -q "gzip compressed"; then
    echo "ERROR: Downloaded file is not a valid gzip archive"
    echo "File type: $(file python.tar.gz)"
    rm -f python.tar.gz
    exit 1
fi

echo "Extracting Python runtime..."
if ! tar -xzf python.tar.gz; then
    echo "ERROR: Failed to extract Python runtime"
    rm -f python.tar.gz
    exit 1
fi

# Move extracted files to arch-specific directory
if [ -d "python" ]; then
    mv python "$ARCH"
    echo "✓ Python runtime installed to: $RUNTIME_DIR/$ARCH"
else
    echo "ERROR: Unexpected archive structure"
    exit 1
fi

# Clean up archive
rm python.tar.gz

echo "✓ Python runtime extracted"
echo ""

# Copy requirements.txt from python-backend to python-runtime
if [ -f "$SCRIPT_DIR/python-backend/requirements.txt" ]; then
    echo "Copying requirements.txt from python-backend..."
    cp "$SCRIPT_DIR/python-backend/requirements.txt" "$RUNTIME_DIR/requirements.txt"
    echo "✓ Requirements file copied"
else
    echo "WARNING: python-backend/requirements.txt not found"
fi

# Install dependencies
echo "Installing Python dependencies..."
PYTHON_BIN="$ARCH/bin/python3.12"
TARGET_DIR="$ARCH/lib/python3.12/site-packages"

if [ -f "$RUNTIME_DIR/requirements.txt" ]; then
    $PYTHON_BIN -m pip install \
        --no-cache-dir \
        --target "$TARGET_DIR" \
        -r "$RUNTIME_DIR/requirements.txt"
    
    echo "✓ Dependencies installed"
else
    echo "WARNING: No requirements.txt found. Skipping dependency installation."
fi

echo ""
echo "Running post-installation cleanup..."

# Navigate to architecture directory
cd "$ARCH" || exit 1

# 1. Remove Python cache files
echo "1. Removing Python cache files..."
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null

# 2. Remove macOS metadata files
echo "2. Removing macOS metadata files..."
find . -name ".DS_Store" -delete

# 3. Clear extended attributes (quarantine flags)
echo "3. Clearing extended attributes..."
xattr -rc . 2>/dev/null

# 4. Check for and resolve any symlinks
echo "4. Checking for symlinks..."
SYMLINK_COUNT=$(find . -type l | wc -l | tr -d ' ')
if [ "$SYMLINK_COUNT" -gt 0 ]; then
    echo "   Found $SYMLINK_COUNT symlinks. Resolving them..."
    find . -type l | while read link; do
        target=$(readlink "$link")
        if [ -f "$(dirname "$link")/$target" ] || [ -f "$target" ]; then
            rm "$link"
            if [ -f "$(dirname "$link")/$target" ]; then
                cp "$(dirname "$link")/$target" "$link"
            else
                cp "$target" "$link"
            fi
            echo "   Resolved: $link"
        fi
    done
else
    echo "   No symlinks found"
fi

# 5. Normalize all file permissions
echo "5. Normalizing file permissions..."
find . -type f -exec chmod 644 {} +
find . -type d -exec chmod 755 {} +

# 6. Re-apply execute permissions to binaries
echo "6. Setting execute permissions on binaries..."
chmod +x bin/python* bin/2to3* bin/idle3* bin/pydoc3* bin/pip* 2>/dev/null
find lib/python3.12/site-packages -type f -name "*.so" -exec chmod 755 {} \; 2>/dev/null

echo ""
echo "✓ Python runtime installation and setup complete!"
echo "✓ Runtime is ready for bundling"
echo ""
echo "Location: $RUNTIME_DIR/$ARCH"
