#!/bin/bash

echo "🗑️  Deleting duplicate testing documentation files..."
echo ""

cd /Users/chingcheonglee/Repos/rust/2025-10-27-shell-script-manager-tauri/backend-spring

# List of files to delete (all are duplicates of TESTING_AND_CONTAINERS_COMPLETE.md)
FILES_TO_DELETE=(
    "CONNECT_TO_TEST_DB.md"
    "CONTAINER_REUSE_FIXED.md"
    "CREATE_TESTCONTAINERS_PROPERTIES.md"
    "DATA_INJECTION_QUICK_REF.md"
    "DATA_INJECTION_TEST_GUIDE.md"
    "DB_CONNECTION_QUICK_REF.md"
    "DOCUMENTATION_CONSOLIDATED.md"
    "INMEMORY_EVENTQUEUE_REMOVED.md"
    "JPA_FOREIGN_KEYS.md"
    "PRISMA_MIGRATIONS_TEST.md"
    "PRISMA_SPRING_WORKFLOW.md"
    "RESTART_DOCKER_SOLUTION.md"
    "SPRING_PRISMA_INTEGRATION.md"
    "SPRING_TESTCONTAINERS_LIFECYCLE.md"
    "SQLITE_ERROR_FIXED.md"
    "STOP_CONTAINER_QUICK_REF.md"
    "STOP_TEST_CONTAINER.md"
    "TABLES_DROPPING_EXPLAINED.md"
    "TESTING_GUIDE_COMPLETE.md"
    "TESTING_GUIDE_COMPLETE.pdf"
)

for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "✅ Deleted: $file"
    else
        echo "⚠️  Not found: $file"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📚 Remaining testing documentation:"
echo "   - TESTING_AND_CONTAINERS_COMPLETE.md (THE ONLY ONE YOU NEED)"
echo ""
echo "📚 Remaining documentation files:"
ls -1 *.md 2>/dev/null | sort

