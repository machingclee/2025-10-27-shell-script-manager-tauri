#!/bin/bash

# Script to install from requirements.txt and sync to pyproject.toml
# Usage: ./sync_to_uv.sh [requirements.txt]

REQUIREMENTS_FILE="${1:-requirements.txt}"

if [ ! -f "$REQUIREMENTS_FILE" ]; then
    echo "❌ Error: $REQUIREMENTS_FILE not found"
    exit 1
fi

if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found"
    exit 1
fi

echo "� Step 1: Ensuring virtual environment exists..."
if [ ! -d ".venv" ]; then
    echo "   Creating .venv..."
    uv venv
fi

echo ""
echo "📦 Step 2: Installing packages from $REQUIREMENTS_FILE..."
uv pip install -r "$REQUIREMENTS_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to install packages"
    exit 1
fi

echo ""
echo "🔍 Step 2: Reading installed packages..."

# Get installed packages in format: package==version
INSTALLED=$(uv pip freeze | grep -v "^-e " | sort)

# Format for pyproject.toml
TMP_DEPS=$(mktemp)
echo "$INSTALLED" | sed 's/==/>=/g' | awk '{print "    \"" $0 "\","}' > "$TMP_DEPS"

# Remove trailing comma from last line
sed -i '' '$ s/,$//' "$TMP_DEPS"

echo ""
echo "✏️  Step 4: Updating pyproject.toml..."

# Create temporary output file
TMP_FILE=$(mktemp)

# Read through pyproject.toml and replace dependencies
IN_DEPS=0
while IFS= read -r line; do
    if [[ "$line" =~ ^dependencies[[:space:]]*=[[:space:]]*\[ ]]; then
        # Handle both "dependencies = [" and "dependencies = []"
        echo "dependencies = [" >> "$TMP_FILE"
        cat "$TMP_DEPS" >> "$TMP_FILE"
        echo "]" >> "$TMP_FILE"
        IN_DEPS=1
        # If it's on one line (dependencies = []), skip it entirely
        if [[ "$line" =~ \]$ ]]; then
            IN_DEPS=0
        fi
    elif [[ $IN_DEPS -eq 1 && "$line" =~ ^\] ]]; then
        # Already closed above, skip this line
        IN_DEPS=0
    elif [[ $IN_DEPS -eq 0 ]]; then
        echo "$line" >> "$TMP_FILE"
    fi
    # else: skip lines inside the old dependencies array
done < "pyproject.toml"

# Replace original file
mv "$TMP_FILE" "pyproject.toml"
rm "$TMP_DEPS"

echo "✅ Successfully synced $(echo "$INSTALLED" | wc -l | tr -d ' ') packages to pyproject.toml"
echo ""
echo "📦 Sample dependencies added:"
echo "$INSTALLED" | head -10
TOTAL=$(echo "$INSTALLED" | wc -l | tr -d ' ')
if [ "$TOTAL" -gt 10 ]; then
    echo "   ... and $(expr $TOTAL - 10) more"
fi

echo ""
echo "🔄 Step 5: Running uv sync to update lock file..."
uv sync

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Complete! Your environment is now synced with pyproject.toml and uv.lock"
else
    echo ""
    echo "⚠️  Warning: uv sync had issues, but pyproject.toml was updated"
fi
