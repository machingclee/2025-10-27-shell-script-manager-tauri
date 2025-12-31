#!/bin/bash

# Quick Setup and Test Script for New Developers
# This script helps you get started with integration testing

set -e  # Exit on error

echo "🚀 Setting up integration testing environment..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Check Docker
print_step "Step 1: Checking Docker..."
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null 2>&1; then
        print_success "Docker is running"
    else
        print_error "Docker is installed but not running"
        echo "Please start Docker Desktop:"
        echo "  macOS: open -a Docker"
        echo "  Linux: sudo systemctl start docker"
        exit 1
    fi
else
    print_error "Docker is not installed"
    echo "Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Step 2: Check Node.js
print_step "Step 2: Checking Node.js..."
if command -v node &> /dev/null; then
    print_success "Node.js $(node --version) found"
else
    print_warning "Node.js not found (optional, but recommended for Prisma)"
    echo "Install: brew install node"
fi

# Step 3: Check Prisma
print_step "Step 3: Checking Prisma..."
if command -v npx &> /dev/null; then
    print_success "Prisma available via npx"
else
    print_warning "npx not found (Prisma schema won't be applied)"
fi

# Step 4: Pull PostgreSQL image
print_step "Step 4: Pulling PostgreSQL Docker image..."
if docker image inspect postgres:15-alpine &> /dev/null 2>&1; then
    print_success "PostgreSQL image already exists"
else
    echo "Downloading PostgreSQL image (this may take 2-3 minutes)..."
    if docker pull postgres:15-alpine; then
        print_success "PostgreSQL image downloaded"
    else
        print_error "Failed to download PostgreSQL image"
        exit 1
    fi
fi

# Step 5: Enable Testcontainers reuse
print_step "Step 5: Configuring Testcontainers reuse..."
TESTCONTAINERS_PROPS="$HOME/.testcontainers.properties"
if grep -q "testcontainers.reuse.enable=true" "$TESTCONTAINERS_PROPS" 2>/dev/null; then
    print_success "Testcontainers reuse already enabled"
else
    echo "testcontainers.reuse.enable=true" >> "$TESTCONTAINERS_PROPS"
    print_success "Enabled Testcontainers reuse (faster subsequent runs)"
fi

# Step 6: Build project
print_step "Step 6: Building project..."
if ./gradlew build -x test; then
    print_success "Project built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 7: Run tests
print_step "Step 7: Running integration tests..."
echo ""
echo "This may take a few minutes on first run..."
echo ""

if ./gradlew test --tests CommandInvokerIntegrationTest; then
    print_success "Tests passed!"
    echo ""
    echo "🎉 Setup complete! You're ready to write integration tests."
    echo ""
    echo "📚 Next steps:"
    echo "   1. Read TESTCONTAINERS_GUIDE.md for detailed documentation"
    echo "   2. Check src/test/kotlin/com/scriptmanager/integration/ for examples"
    echo "   3. Run all tests: ./gradlew test"
    echo ""
else
    print_error "Tests failed"
    echo ""
    echo "Common issues:"
    echo "  - Docker not running: open -a Docker"
    echo "  - Port conflict: docker stop \$(docker ps -q)"
    echo "  - Missing dependencies: ./gradlew build --refresh-dependencies"
    echo ""
    echo "📚 See TESTCONTAINERS_GUIDE.md for troubleshooting"
    exit 1
fi

