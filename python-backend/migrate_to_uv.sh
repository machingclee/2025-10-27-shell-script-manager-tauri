#!/bin/bash

# Script to convert requirements.txt to pyproject.toml dependencies format
# Usage: ./migrate_to_uv.sh [requirements.txt] [pyproject.toml]

REQUIREMENTS_FILE="${1:-requirements.txt}"
PYPROJECT_FILE="${2:-pyproject.toml}"

if [ ! -f "$REQUIREMENTS_FILE" ]; then
    echo "❌ Error: $REQUIREMENTS_FILE not found"
    exit 1
fi

if [ ! -f "$PYPROJECT_FILE" ]; then
    echo "❌ Error: $PYPROJECT_FILE not found"
    exit 1
fi

echo "🔍 Converting $REQUIREMENTS_FILE to $PYPROJECT_FILE format..."

# Extract dependencies and format them
TMP_DEPS=$(mktemp)
grep -E "^[a-zA-Z0-9_-]+==.*" "$REQUIREMENTS_FILE" | sed 's/==/>=/g' | awk '{print "    \"" $0 "\","}' > "$TMP_DEPS"

# Remove trailing comma from last line
sed -i '' '$ s/,$//' "$TMP_DEPS"

# Create temporary output file
TMP_FILE=$(mktemp)

# Read through pyproject.toml and replace dependencies
IN_DEPS=0
while IFS= read -r line; do
    if [[ "$line" == "dependencies = [" ]]; then
        echo "$line" >> "$TMP_FILE"
        cat "$TMP_DEPS" >> "$TMP_FILE"
        IN_DEPS=1
    elif [[ $IN_DEPS -eq 1 && "$line" == "]" ]]; then
        echo "$line" >> "$TMP_FILE"
        IN_DEPS=0
    elif [[ $IN_DEPS -eq 0 ]]; then
        echo "$line" >> "$TMP_FILE"
    fi
done < "$PYPROJECT_FILE"

# Replace original file
mv "$TMP_FILE" "$PYPROJECT_FILE"
rm "$TMP_DEPS"

echo "✅ Successfully converted dependencies to $PYPROJECT_FILE"
echo "📦 Dependencies added:"
grep -E "^[a-zA-Z0-9_-]+==.*" "$REQUIREMENTS_FILE" | head -10
TOTAL=$(grep -cE "^[a-zA-Z0-9_-]+==.*" "$REQUIREMENTS_FILE")
if [ "$TOTAL" -gt 10 ]; then
    echo "   ... and $(expr $TOTAL - 10) more"
fi
echo ""
echo "💡 Next step: Run 'uv sync' to install dependencies"
