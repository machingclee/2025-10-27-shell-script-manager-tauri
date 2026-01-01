#!/bin/bash

# View Test Report
# Opens the latest test report in your default browser

REPORT_PATH="build/reports/tests/test/index.html"

if [ -f "$REPORT_PATH" ]; then
    echo "🔍 Opening test report in browser..."
    open "$REPORT_PATH"
else
    echo "❌ No test report found at: $REPORT_PATH"
    echo "💡 Run tests first: ./gradlew test"
    exit 1
fi

