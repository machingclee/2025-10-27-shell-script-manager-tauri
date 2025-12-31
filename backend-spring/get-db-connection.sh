#!/bin/bash

echo "🔍 Finding PostgreSQL test container..."
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first:"
    echo "   open -a Docker"
    exit 1
fi

# Find PostgreSQL container
CONTAINER=$(docker ps | grep postgres | head -1)

if [ -z "$CONTAINER" ]; then
    echo "❌ No PostgreSQL container is running."
    echo ""
    echo "To start it, run your tests:"
    echo "   cd backend-spring"
    echo "   ./gradlew test"
    echo ""
    echo "The container will start and stay alive (reuse=true)."
    exit 1
fi

# Extract connection details
CONTAINER_ID=$(echo "$CONTAINER" | awk '{print $1}')
PORT=$(docker port "$CONTAINER_ID" 5432 | sed 's/.*://')

echo "✅ Found PostgreSQL test container!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 GUI Tool Connection (DataGrip, DBeaver, TablePlus, etc.)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "   Host:     localhost"
echo "   Port:     $PORT  ← USE THIS PORT!"
echo "   Database: testdb"
echo "   User:     test"
echo "   Password: test"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://test:test@localhost:$PORT/testdb"
echo ""
echo "🐘 Connect with psql:"
echo "   docker exec -it $CONTAINER_ID psql -U test -d testdb"
echo ""
echo "💡 Note: The port ($PORT) is dynamically assigned by Docker"
echo "   It stays the same while container is reused"
echo ""

