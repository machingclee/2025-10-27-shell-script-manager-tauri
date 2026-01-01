# Documentation Index

## 📚 Main Documentation

### ⭐ TESTING_AND_CONTAINERS_COMPLETE.md

**THE COMPLETE TESTING GUIDE** - Start here for everything about testing!

Covers:

- ✅ Testcontainers setup with PostgreSQL
- ✅ BaseIntegrationTest for automatic cleanup
- ✅ Schema management and table truncation
- ✅ Test queue vs database events strategy
- ✅ Jackson vs Gson comparison
- ✅ IDE performance optimization
- ✅ Test reports and helper scripts
- ✅ Troubleshooting and FAQ
- ✅ Code examples and best practices

**Status**: Active (January 2026)  
**Replaces**: 10+ previous testing documents

---

## 🎯 Application Documentation

### README.md

Main project README with overview and setup instructions.

### QUICK_START.md

Quick start guide for running the application.

- Build and run commands
- API testing examples
- Development workflow

### EVENT_DRIVEN_ARCHITECTURE.md

Event-driven architecture documentation.

- Event flow diagrams
- Policy-based side effects
- Script execution recording
- Domain events

### ACTION_SUMMARY.md

Historical troubleshooting documentation.

- "Unable to commit" error resolution
- Transaction management fixes
- Diagnostic tests created

**Note**: This is historical documentation. Current testing setup is in TESTING_AND_CONTAINERS_COMPLETE.md.

---

## 🗑️ Consolidated Documents (Deleted)

The following documents have been consolidated into `TESTING_AND_CONTAINERS_COMPLETE.md`:

### Testing Strategy

- ❌ `EVENT_TESTING_QUICK_START.md` → Section: "Quick Start"
- ❌ `EVENT_TESTING_GUIDE.md` → Section: "Testing Strategies"
- ❌ `TESTING_STRATEGY.md` → Section: "Test Queue vs Database Events"
- ❌ `TESTING_QUICK_REFERENCE.md` → Section: "Quick Start" + "Code Examples"

### Technical Guides

- ❌ `JACKSON_VS_GSON.md` → Section: "Jackson vs Gson"
- ❌ `EXCLUDE_BUILD_FROM_INDEXING.md` → Section: "IDE Performance"

### Historical/Troubleshooting (Obsolete)

- ❌ `CHANGES_EVENT_TESTING.md` → Integrated into main guide
- ❌ `FIX_ROLLBACK_ERROR.md` → Historical, issue resolved
- ❌ `TROUBLESHOOTING_JDBC_COMMIT.md` → Historical, issue resolved
- ❌ `URGENT_FIX_STEPS.md` → Historical, issue resolved

---

## 📁 Helper Scripts

### test-and-view.sh

Run tests and automatically open the test report in browser.

```bash
./test-and-view.sh
```

### view-test-report.sh

Open the latest test report without running tests.

```bash
./view-test-report.sh
```

---

## 🧪 Test Files

### Configuration

- `src/test/kotlin/com/scriptmanager/config/TestcontainersConfiguration.kt`
    - PostgreSQL container setup
    - Schema application
    - Table truncation

### Base Classes

- `src/test/kotlin/com/scriptmanager/integration/BaseIntegrationTest.kt`
    - Automatic event cleanup
    - Base class for all integration tests

### Example Tests

- `src/test/kotlin/com/scriptmanager/integration/SimpleEventTest.kt`
    - Database events approach examples
    - Event persistence testing

- `src/test/kotlin/com/scriptmanager/integration/EventTestingWithQueueExamples.kt`
    - Test queue approach examples
    - Fast business logic testing

### Resources

- `src/test/resources/schema.sql`
    - PostgreSQL schema (converted from SQLite)
- `src/test/resources/application-test.yml`
    - Test configuration
- `src/test/resources/junit-platform.properties`
    - JUnit configuration

---

## 📊 Quick Navigation

**I want to...**

| Goal                     | Document                           | Section                       |
|--------------------------|------------------------------------|-------------------------------|
| Start testing            | TESTING_AND_CONTAINERS_COMPLETE.md | Quick Start                   |
| Write a command test     | TESTING_AND_CONTAINERS_COMPLETE.md | Code Examples → Example 1     |
| Test event persistence   | TESTING_AND_CONTAINERS_COMPLETE.md | Code Examples → Example 2     |
| Understand test strategy | TESTING_AND_CONTAINERS_COMPLETE.md | Test Queue vs Database Events |
| Fix IDE freezing         | TESTING_AND_CONTAINERS_COMPLETE.md | IDE Performance               |
| View test reports        | TESTING_AND_CONTAINERS_COMPLETE.md | Test Reports                  |
| Choose JSON library      | TESTING_AND_CONTAINERS_COMPLETE.md | Jackson vs Gson               |
| Troubleshoot tests       | TESTING_AND_CONTAINERS_COMPLETE.md | Troubleshooting               |
| Run the application      | QUICK_START.md                     | -                             |
| Understand events        | EVENT_DRIVEN_ARCHITECTURE.md       | -                             |

---

## 🎯 For New Team Members

**Start with these in order:**

1. **README.md** - Understand the project
2. **QUICK_START.md** - Get the app running
3. **TESTING_AND_CONTAINERS_COMPLETE.md** - Learn testing (comprehensive!)
4. **EVENT_DRIVEN_ARCHITECTURE.md** - Understand event system

**For testing specifically:**

Read **TESTING_AND_CONTAINERS_COMPLETE.md** from top to bottom. It has everything:

- Quick start (get going in 3 steps)
- Setup explanation (understand what you have)
- Testing strategies (when to use what)
- Code examples (copy and adapt)
- Best practices (Jackson, IDE, etc.)
- Troubleshooting (when things go wrong)

---

## 📝 Documentation Maintenance

### Active Documents

These are actively maintained:

- ✅ TESTING_AND_CONTAINERS_COMPLETE.md
- ✅ README.md
- ✅ QUICK_START.md
- ✅ EVENT_DRIVEN_ARCHITECTURE.md

### Historical Documents

These are kept for historical reference but not actively updated:

- 📚 ACTION_SUMMARY.md

### Archived Documents

These have been consolidated and deleted:

- 🗑️ All testing guides (10+ files) → TESTING_AND_CONTAINERS_COMPLETE.md

---

**Last Updated**: January 1, 2026  
**Documentation Version**: 2.0

