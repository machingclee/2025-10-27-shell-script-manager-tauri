#!/bin/bash

# Test and View Report
# Runs tests and automatically opens the report in browser

echo "🧪 Running tests..."
./gradlew test

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Tests passed!"
else
    echo "⚠️  Some tests failed (exit code: $EXIT_CODE)"
fi

echo ""
echo "📊 Opening test report..."
open build/reports/tests/test/index.html

exit $EXIT_CODE

