# ⚠️ DEPRECATED: Replaced with Prisma Workflow

**Date**: November 1, 2025

## 📢 This File is Outdated

Flyway and Liquibase have been **removed** from this project.

---

## ✅ New Approach: Prisma + Spring Boot

We now use a **simple hybrid approach**:

- ✅ **Prisma** - Handles all database migrations
- ✅ **Spring Boot** - Provides REST API only (read-only)

---

## 🔗 New Documentation

Please refer to:

📖 **[5_PRISMA_SPRING_WORKFLOW.md](5_PRISMA_SPRING_WORKFLOW.md)** - New workflow guide

📖 **[backend-spring/PRISMA_SPRING_WORKFLOW.md](../backend-spring/PRISMA_SPRING_WORKFLOW.md)** - Complete guide

---

## 🚀 Quick Start

### 1. Edit Prisma Schema

```prisma
model ShellScript {
  // ... existing fields ...
  description String?  // NEW
}
```

### 2. Generate Migration

```bash
cd src-tauri
npx prisma migrate dev --name add_description
```

### 3. Update JPA Entity

Use LLM (ChatGPT/Claude) to convert Prisma model to JPA entity.

### 4. Restart Spring Boot

```bash
cd backend-spring
./gradlew bootRun
```

---

**That's it! No Flyway, no Liquibase, just Prisma!** 🎉

See the new documentation for details.
