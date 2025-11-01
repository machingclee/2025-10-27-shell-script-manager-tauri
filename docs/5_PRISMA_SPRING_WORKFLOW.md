# Prisma + Spring Boot Workflow

## 🎯 Simple Approach

Use **Prisma for all database changes**, keep Spring Boot for REST API only.

---

## 🚀 Quick Workflow

### 1. Edit Prisma Schema

```prisma
model ShellScript {
  // ... existing fields ...
  description String?  // NEW FIELD
}
```

### 2. Generate Migration

```bash
cd src-tauri
npx prisma migrate dev --name add_description
```

### 3. Update JPA Entity

Update the corresponding entity in `backend-spring/src/main/kotlin/com/scriptmanager/entity/`

**💡 Tip:** Use LLM (ChatGPT/Claude) to convert Prisma model to JPA entity!

### 4. Restart Spring Boot

```bash
cd backend-spring
./gradlew bootRun
```

Done! ✅

---

## 🔑 Key Principle

- ✅ **Prisma** manages database schema (all migrations)
- ✅ **Spring Boot** only reads the schema (REST API)
- ✅ **JPA entities** kept in sync manually or with LLM

---

## 📚 Full Documentation

See: [backend-spring/PRISMA_SPRING_WORKFLOW.md](../backend-spring/PRISMA_SPRING_WORKFLOW.md)

---

## ✅ Benefits

- Simple - Use familiar Prisma workflow
- No Liquibase/Flyway complexity
- LLM converts schemas for you
- Clean separation of concerns

Happy coding! 🚀

