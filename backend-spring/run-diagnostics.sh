#!/bin/bash
# Quick diagnostic script for JDBC commit error

echo "========================================="
echo "Testing Database Connectivity"
echo "========================================="
cd /Users/chingcheonglee/Repos/rust/2025-10-27-shell-script-manager-tauri/backend-spring

echo ""
echo "Step 1: Test basic database operations..."
./gradlew test --tests "MinimalDatabaseTest" --info

echo ""
echo "========================================="
echo "Getting Full Error Details"
echo "========================================="
echo "Step 2: Capture full error stack trace..."
./gradlew clean test --tests "DebugCommitErrorTest" --info 2>&1 | tee debug-output.txt

echo ""
echo "========================================="
echo "Testing Working Solution"
echo "========================================="
echo "Step 3: Test with @DirtiesContext..."
./gradlew test --tests "SimpleEventTest"

echo ""
echo "========================================="
echo "Results"
echo "========================================="
echo "Debug output saved to: debug-output.txt"
echo ""
echo "To view error details:"
echo "  cat debug-output.txt | grep -A 20 'ERROR CAUGHT'"
echo ""
echo "To check Docker:"
echo "  docker ps | grep postgres"

