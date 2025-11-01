# Spring Boot Backend - Simple Setup

## 🎯 Architecture

**Simple Hybrid Approach:**
- ✅ **Prisma** - Manages database schema (all migrations)
- ✅ **Spring Boot** - Provides REST API (read-only database access)

---

## 🚀 Quick Start

### Run the Backend

```bash
cd backend-spring
./gradlew bootRun
```

Server starts at `http://localhost:8080`

### Test the API

```bash
curl http://localhost:8080/api/folders
curl http://localhost:8080/api/scripts
curl http://localhost:8080/api/app-state
```

---

## 📝 Making Schema Changes

### 1. Use Prisma (as you always do!)

```bash
# Edit src-tauri/prisma/schema.prisma
# Then:
cd src-tauri
npx prisma migrate dev --name add_description
```

### 2. Update JPA Entity

Ask ChatGPT/Claude:
```
Convert this Prisma model to Kotlin JPA entity:

[paste your Prisma model]
```

### 3. Restart Spring Boot

```bash
cd backend-spring
./gradlew bootRun
```

Done! ✅

---

## 📚 Documentation

- **[PRISMA_SPRING_WORKFLOW.md](PRISMA_SPRING_WORKFLOW.md)** - Complete workflow guide
- **[docs/5_PRISMA_SPRING_WORKFLOW.md](../docs/5_PRISMA_SPRING_WORKFLOW.md)** - Quick reference

---

## 🔧 Configuration

### Spring Boot is Read-Only

`src/main/resources/application.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none  # Never modifies database
```

**Important:** Spring Boot only reads the schema, never modifies it. All schema changes happen via Prisma.

---

## 📁 REST API Endpoints

### Folders
- `GET /api/folders` - List all folders
- `GET /api/folders/{id}` - Get folder by ID
- `POST /api/folders` - Create folder
- `PUT /api/folders/{id}` - Update folder
- `DELETE /api/folders/{id}` - Delete folder

### Scripts
- `GET /api/scripts` - List all scripts
- `GET /api/scripts/{id}` - Get script by ID
- `POST /api/scripts` - Create script
- `PUT /api/scripts/{id}` - Update script
- `DELETE /api/scripts/{id}` - Delete script

### Application State
- `GET /api/app-state` - Get application state
- `PUT /api/app-state` - Update application state

---

## 🏗️ Project Structure

```
backend-spring/
├── src/main/kotlin/com/scriptmanager/
│   ├── entity/              # JPA entities (keep in sync with Prisma)
│   │   ├── ApplicationState.kt
│   │   ├── ScriptsFolder.kt
│   │   ├── ShellScript.kt
│   │   └── RelScriptsFolderShellScript.kt
│   ├── repository/          # Spring Data repositories
│   ├── controller/          # REST API controllers
│   └── Application.kt       # Main application
│
├── src/main/resources/
│   └── application.yml      # Configuration
│
├── build.gradle.kts         # Dependencies
└── README.md               # This file
```

---

## ⚙️ Build Commands

```bash
# Run application
./gradlew bootRun

# Build project
./gradlew build

# Create production JAR
./gradlew bootJar
# Output: build/libs/script-manager-backend-0.0.1-SNAPSHOT.jar

# Clean build
./gradlew clean build
```

---

## ✅ Advantages

1. **Simple** - Use Prisma's excellent migration workflow
2. **Familiar** - You already know Prisma
3. **Clean** - Each tool does what it's best at:
   - Prisma → Database schema
   - Spring Boot → REST API
4. **LLM-Friendly** - AI helps convert Prisma to JPA

---

## 🐛 Troubleshooting

### Port 8080 already in use

```bash
lsof -ti:8080 | xargs kill -9
```

### Database is locked

- Stop Spring Boot
- Run Prisma migration
- Restart Spring Boot

### Entity doesn't match schema

Update JPA entity to match Prisma schema. Use LLM to convert:

**Prompt:**
```
Convert this Prisma model to Kotlin JPA entity:

[paste Prisma model]
```

---

## 📖 Summary

**Simple workflow:**
1. Edit Prisma schema
2. Run `npx prisma migrate dev`
3. Update JPA entity (use LLM!)
4. Restart Spring Boot

**No Liquibase, no Flyway, just Prisma!** 🎉

---

**Technology Stack:**
- Spring Boot 3.2.0
- Kotlin 1.9.20
- SQLite
- Prisma (for migrations)
- JPA/Hibernate (read-only)

**Status:** ✅ Ready for development

Happy coding! 🚀
