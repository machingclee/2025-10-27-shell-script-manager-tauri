# Prisma + Spring Boot Hybrid Approach

## 🎯 Architecture Overview

This project uses a **hybrid approach** that combines the best of both worlds:

- ✅ **Prisma** - For database schema management and migrations
- ✅ **Spring Boot** - For REST API and business logic
- ✅ **Shared SQLite Database** - Same database, two access methods

---

## 🔑 Key Principle

**Prisma owns the database schema. Spring Boot only reads it.**

- 📝 **All schema changes** happen via Prisma migrations
- 🚫 **Spring Boot NEVER modifies** the database schema
- ✅ **JPA entities** are manually kept in sync with Prisma schema

---

## 🚀 Workflow

### 1. Make Schema Changes with Prisma

**Edit your Prisma schema:**

```prisma
// src-tauri/prisma/schema.prisma

model ShellScript {
  id          Int      @id @default(autoincrement())
  name        String
  command     String
  ordering    Int
  description String?  // NEW FIELD
  createdAt   Float    @map("created_at")
  createdAtHk String   @map("created_at_hk")
  
  @@map("shell_script")
}
```

**Generate migration:**

```bash
cd src-tauri
npx prisma migrate dev --name add_description
```

✅ Prisma automatically:
- Detects the change
- Generates SQL migration
- Applies it to the database
- Updates Prisma Client

### 2. Update JPA Entity (Manually or with LLM)

**Update the Spring Boot entity to match:**

```kotlin
// backend-spring/src/main/kotlin/com/scriptmanager/entity/ShellScript.kt

@Entity
@Table(name = "shell_script")
data class ShellScript(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    
    @Column(nullable = false)
    val name: String,
    
    @Column(nullable = false)
    val command: String,
    
    @Column(nullable = false)
    val ordering: Int,
    
    @Column(nullable = true)
    val description: String? = null,  // ADD THIS
    
    @Column(nullable = false, name = "created_at")
    val createdAt: Double,
    
    @Column(nullable = false, name = "created_at_hk")
    val createdAtHk: String
)
```

**💡 Tip:** Use an LLM to convert Prisma schema to JPA entity:

**Prompt:**
```
Convert this Prisma model to a Kotlin JPA entity:

[paste your Prisma model]
```

### 3. Restart Spring Boot

```bash
cd backend-spring
./gradlew bootRun
```

Spring Boot will read the updated schema (no migration needed on Spring side).

### 4. Test

```bash
curl http://localhost:8080/api/scripts
```

Done! ✅

---

## 🏗️ Directory Structure

```
project-root/
├── src-tauri/
│   ├── database.db              # Shared SQLite database
│   └── prisma/
│       ├── schema.prisma        # Source of truth for schema
│       └── migrations/          # Prisma migrations
│
└── backend-spring/
    └── src/main/kotlin/com/scriptmanager/entity/
        ├── ShellScript.kt       # Keep in sync manually or with LLM
        ├── ScriptsFolder.kt
        └── ApplicationState.kt
```

---

## 📝 Configuration

### Spring Boot (Read-Only Mode)

`backend-spring/src/main/resources/application.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none  # ← NEVER modifies schema
```

This ensures Spring Boot **only reads** the database, never modifies it.

---

## 🔄 Complete Example

### Scenario: Add Tags Field to ShellScript

#### Step 1: Update Prisma Schema

```prisma
model ShellScript {
  // ... existing fields ...
  tags String?  // NEW
  
  @@map("shell_script")
}
```

#### Step 2: Generate Migration

```bash
cd src-tauri
npx prisma migrate dev --name add_tags_field
```

Output:
```
✔ Prisma Migrate created and applied the following migration:
  migrations/
    └─ 20241101083042_add_tags_field/
       └─ migration.sql
```

#### Step 3: Update JPA Entity

```kotlin
@Entity
data class ShellScript(
    // ... existing fields ...
    
    @Column(nullable = true)
    val tags: String? = null  // NEW
)
```

#### Step 4: Restart & Test

```bash
cd backend-spring
./gradlew bootRun

# Test
curl http://localhost:8080/api/scripts
```

✅ The `tags` field now appears in the API response!

---

## 🤖 Using LLM for Entity Conversion

### Option 1: Claude/ChatGPT Prompt

```
Convert this Prisma schema to Kotlin JPA entities.

Use these conventions:
- @Entity and @Table annotations
- @Id and @GeneratedValue for primary keys
- @Column with nullable and name attributes
- Use @map for column names that differ from field names
- Use Double for Float types, Long for Int types

Here's my Prisma schema:

[paste your schema.prisma]
```

### Option 2: Automated Script

You could create a simple script to help with conversion:

```typescript
// convert-prisma-to-jpa.ts (example)
// This would parse schema.prisma and generate JPA entities
```

---

## ✅ Advantages of This Approach

1. **Simple** - Use Prisma's great migration workflow
2. **Familiar** - You already know Prisma
3. **Reliable** - No complex Liquibase/Flyway setup
4. **Flexible** - LLM converts schema for you
5. **Clean** - Each tool does what it's best at

---

## ⚠️ Important Rules

### DO:
- ✅ Make ALL schema changes via Prisma
- ✅ Keep JPA entities in sync with Prisma schema
- ✅ Use `prisma migrate dev` for development
- ✅ Use `prisma migrate deploy` for production
- ✅ Commit both Prisma migrations AND entity updates

### DON'T:
- ❌ Change `ddl-auto` from `none` (Spring Boot should never modify schema)
- ❌ Make schema changes directly in SQL
- ❌ Let JPA entities drift from Prisma schema

---

## 🐛 Troubleshooting

### Spring Boot complains about missing columns

**Problem:** JPA entity has fields that don't exist in database

**Solution:** Check your Prisma schema and run migrations:
```bash
cd src-tauri
npx prisma migrate dev
```

### Spring Boot complains about schema mismatch

**Problem:** Entity doesn't match database schema

**Solution:** Update JPA entity to match Prisma schema (use LLM to convert)

### Database is locked

**Problem:** Both Prisma and Spring Boot accessing database

**Solution:** 
- Stop Spring Boot: `Ctrl+C`
- Run Prisma migration
- Restart Spring Boot

---

## 📚 Quick Reference

| Task | Tool | Command |
|------|------|---------|
| **Add/modify field** | Prisma | `npx prisma migrate dev` |
| **Generate SQL migration** | Prisma | `npx prisma migrate dev` |
| **Apply migrations** | Prisma | `npx prisma migrate deploy` |
| **Convert to JPA entity** | LLM | Use ChatGPT/Claude prompt |
| **Run Spring Boot** | Gradle | `./gradlew bootRun` |
| **Test API** | curl | `curl http://localhost:8080/api/scripts` |

---

## 🎯 Summary

**The workflow is simple:**

1. 📝 Edit Prisma schema
2. ⚡ Run `npx prisma migrate dev`
3. 🤖 Convert to JPA entity (manually or with LLM)
4. ✅ Restart Spring Boot

**Benefits:**
- Use Prisma's excellent migration workflow
- Spring Boot provides REST API
- LLM helps with entity conversion
- Simple, clean separation of concerns

No Liquibase complexity, no manual SQL writing!

---

**Questions?** Just use Prisma like you normally would, and keep the JPA entities in sync!

Happy coding! 🚀

