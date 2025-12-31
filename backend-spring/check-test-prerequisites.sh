#!/bin/bash

# Testcontainers Prerequisites Check Script
# This script verifies that all prerequisites for running integration tests are met

echo "🔍 Checking Testcontainers prerequisites..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

all_good=true

# Check 1: Docker
echo -n "1. Docker... "
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✅ Docker is running${NC}"
    else
        echo -e "${RED}❌ Docker is installed but not running${NC}"
        echo -e "   ${YELLOW}Start Docker Desktop or run: open -a Docker${NC}"
        all_good=false
    fi
else
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo -e "   ${YELLOW}Install from: https://www.docker.com/products/docker-desktop${NC}"
    all_good=false
fi

# Check 2: Node.js
echo -n "2. Node.js... "
if command -v node &> /dev/null; then
    version=$(node --version)
    echo -e "${GREEN}✅ Node.js $version${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js not found${NC}"
    echo -e "   Optional for tests, but required for Prisma schema application"
    echo -e "   Install: brew install node"
fi

# Check 3: npm
echo -n "3. npm... "
if command -v npm &> /dev/null; then
    version=$(npm --version)
    echo -e "${GREEN}✅ npm $version${NC}"
else
    echo -e "${YELLOW}⚠️  npm not found${NC}"
    echo -e "   Optional for tests, but required for Prisma schema application"
fi

# Check 4: Prisma
echo -n "4. Prisma CLI... "
if command -v prisma &> /dev/null; then
    version=$(prisma --version | head -1)
    echo -e "${GREEN}✅ $version${NC}"
elif command -v npx &> /dev/null; then
    echo -e "${GREEN}✅ Available via npx${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma not found${NC}"
    echo -e "   Optional - will use npx prisma if available"
fi

# Check 5: Prisma schema
echo -n "5. Prisma schema... "
prisma_paths=(
    "../src-tauri/prisma/schema.prisma"
    "../../src-tauri/prisma/schema.prisma"
    "prisma/schema.prisma"
)
found_schema=false
for path in "${prisma_paths[@]}"; do
    if [ -f "$path" ]; then
        echo -e "${GREEN}✅ Found at $path${NC}"
        found_schema=true
        break
    fi
done
if [ "$found_schema" = false ]; then
    echo -e "${YELLOW}⚠️  No Prisma schema found${NC}"
    echo -e "   Tests will use Hibernate DDL instead"
fi

# Check 6: PostgreSQL image
echo -n "6. PostgreSQL Docker image... "
if docker image inspect postgres:15-alpine &> /dev/null; then
    echo -e "${GREEN}✅ Already downloaded${NC}"
else
    echo -e "${YELLOW}⚠️  Not downloaded yet${NC}"
    echo -e "   Will be downloaded on first test run (~2 minutes)"
fi

echo ""
if [ "$all_good" = true ]; then
    echo -e "${GREEN}✅ All critical prerequisites met! You can run integration tests.${NC}"
    echo ""
    echo "Run tests with:"
    echo "  ./gradlew test"
else
    echo -e "${RED}❌ Some critical prerequisites are missing. Please fix them before running tests.${NC}"
    exit 1
fi

