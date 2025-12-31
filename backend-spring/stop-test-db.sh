#!/bin/bash

echo "🔍 Looking for PostgreSQL test container..."
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running"
    exit 1
fi

# Find postgres container
CONTAINER=$(docker ps -q --filter ancestor=postgres:15-alpine)

if [ -z "$CONTAINER" ]; then
    echo "✅ No PostgreSQL test container is running"

    # Check if there's a stopped one
    STOPPED=$(docker ps -aq --filter ancestor=postgres:15-alpine)
    if [ -n "$STOPPED" ]; then
        echo "🗑️  Found stopped container, removing it..."
        docker rm $STOPPED
        echo "✅ Stopped container removed"
    fi
    exit 0
fi

echo "Found container: $CONTAINER"
echo ""

# Get container details
CONTAINER_NAME=$(docker ps --filter id=$CONTAINER --format "{{.Names}}")
PORT=$(docker port $CONTAINER 5432 2>/dev/null | sed 's/.*://')

echo "Container Name: $CONTAINER_NAME"
echo "Port: $PORT"
echo ""

# Stop the container
echo "🛑 Stopping container..."
docker stop $CONTAINER

# Remove the container
echo "🗑️  Removing container..."
docker rm $CONTAINER

echo ""
echo "✅ Test container stopped and removed!"
echo ""
echo "ℹ️  Next test run will create a fresh container with new port."

