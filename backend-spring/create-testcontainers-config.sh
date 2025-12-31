#!/bin/bash

echo "🔧 Creating .testcontainers.properties file..."
echo ""

# Show home directory
echo "📁 Your home directory: $HOME"
echo ""

# Create the file
echo "testcontainers.reuse.enable=true" > ~/.testcontainers.properties

# Verify it was created
if [ -f ~/.testcontainers.properties ]; then
    echo "✅ SUCCESS! File created at: ~/.testcontainers.properties"
    echo ""
    echo "📄 File contents:"
    echo "---"
    cat ~/.testcontainers.properties
    echo "---"
    echo ""
    echo "🎉 Container reuse is now enabled!"
    echo ""
    echo "Next steps:"
    echo "  1. Run your test in IntelliJ (click green play button)"
    echo "  2. Container will stay alive after test finishes"
    echo "  3. Check with: docker ps | grep postgres"
else
    echo "❌ ERROR: Failed to create file"
    echo ""
    echo "Try manually:"
    echo "  1. Open Terminal"
    echo "  2. Run: echo 'testcontainers.reuse.enable=true' > ~/.testcontainers.properties"
    echo "  3. Verify: cat ~/.testcontainers.properties"
fi

