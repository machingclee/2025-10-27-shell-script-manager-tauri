# Script Manager - Spring Boot Backend

A Kotlin-based Spring Boot backend for the Shell Script Manager Tauri application. This backend provides REST APIs for managing folders, scripts, and application state with SQLite database persistence via JPA and Flyway migrations.

## Quick Links

📖 **All documentation is in the [../docs/](../docs/) folder**

- **[../docs/1_START_HERE.md](../docs/1_START_HERE.md)** - Start here! ⭐
- **[../docs/2_OVERVIEW.md](../docs/2_OVERVIEW.md)** - Overview
- **[../docs/3_COMPLETE_SETUP_GUIDE.md](../docs/3_COMPLETE_SETUP_GUIDE.md)** - Complete guide
- **[../docs/4_QUICK_START.md](../docs/4_QUICK_START.md)** - Quick reference
- **[../docs/5_FLYWAY_WORKFLOW.md](../docs/5_FLYWAY_WORKFLOW.md)** - Migrations
- **[../docs/6_RUST_INTEGRATION.md](../docs/6_RUST_INTEGRATION.md)** - Rust integration

## Technology Stack

- **Language**: Kotlin 1.9.20
- **Framework**: Spring Boot 3.2.0
- **Database**: SQLite with Hibernate Community Dialect
- **ORM**: Spring Data JPA
- **Migrations**: Flyway 10.4.1
- **Build Tool**: Gradle 8.5
- **Java Version**: 17

## Features

- ✅ RESTful API for folders, scripts, and application state
- ✅ JPA entities with SQLite support
- ✅ Flyway database migrations
- ✅ Hot reload with Spring DevTools
- ✅ Comprehensive error handling
- ✅ Ready for embedded JRE deployment

## Project Structure

```
backend-spring/
├── src/
│   ├── main/
│   │   ├── kotlin/com/scriptmanager/
│   │   │   ├── entity/              # JPA entities
│   │   │   │   ├── ApplicationState.kt
│   │   │   │   ├── ScriptsFolder.kt
│   │   │   │   ├── ShellScript.kt
│   │   │   │   └── RelScriptsFolderShellScript.kt
│   │   │   ├── repository/          # Spring Data repositories
│   │   │   │   ├── ApplicationStateRepository.kt
│   │   │   │   ├── ScriptsFolderRepository.kt
│   │   │   │   ├── ShellScriptRepository.kt
│   │   │   │   └── RelScriptsFolderShellScriptRepository.kt
│   │   │   ├── controller/          # REST controllers
│   │   │   │   ├── FolderController.kt
│   │   │   │   ├── ScriptController.kt
│   │   │   │   └── ApplicationStateController.kt
│   │   │   └── Application.kt       # Main application class
│   │   └── resources/
│   │       ├── application.yml      # Configuration
│   │       └── db/migration/        # Flyway migrations
│   │           └── V1__Initial_schema.sql
│   └── test/                        # Unit and integration tests
├── build.gradle.kts                 # Gradle build file
├── settings.gradle.kts              # Gradle settings
├── gradlew                          # Gradle wrapper (Unix)
├── gradlew.bat                      # Gradle wrapper (Windows)
├── README.md                        # This file
├── QUICK_START.md                   # Quick start guide
├── FLYWAY_WORKFLOW.md               # Migration guide
└── RUST_INTEGRATION_EXAMPLE.md      # Rust integration
```

## Getting Started

### Prerequisites

- Java 17 or higher
- (Optional) Gradle (wrapper included)

### Quick Start

```bash
# Build the project
./gradlew build

# Run the application
./gradlew bootRun

# Application will start at http://localhost:8080
```

### Test the API

```bash
# Get all folders
curl http://localhost:8080/api/folders

# Get application state
curl http://localhost:8080/api/app-state

# Create a folder
curl -X POST http://localhost:8080/api/folders \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","ordering":0,"createdAt":1698765432000.0,"createdAtHk":"2024-10-30 15:30:32"}'
```

## API Endpoints

### Folders
- `GET /api/folders` - Get all folders
- `GET /api/folders/{id}` - Get folder by ID
- `POST /api/folders` - Create a new folder
- `PUT /api/folders/{id}` - Update a folder
- `DELETE /api/folders/{id}` - Delete a folder

### Scripts
- `GET /api/scripts` - Get all scripts
- `GET /api/scripts/{id}` - Get script by ID
- `POST /api/scripts` - Create a new script
- `PUT /api/scripts/{id}` - Update a script
- `DELETE /api/scripts/{id}` - Delete a script

### Application State
- `GET /api/app-state` - Get application state
- `PUT /api/app-state` - Update application state

## Database Schema

The application uses a shared SQLite database located at `../src-tauri/database.db`.

**Tables**:
- `application_state` - Application configuration and state
- `scripts_folder` - Folder definitions
- `shell_script` - Script definitions
- `rel_scriptsfolder_shellscript` - Many-to-many relationship between folders and scripts

## Making Schema Changes

**IMPORTANT**: JPA entities do NOT automatically update the database schema. All changes must go through Flyway migrations.

### Workflow

1. **Modify the JPA entity** (e.g., add a field)
2. **Create a Flyway migration SQL file** (`V2__Your_change.sql`)
3. **Restart the application** (migration auto-applies)
4. **Test and commit** both the entity and migration file

See [../docs/5_FLYWAY_WORKFLOW.md](../docs/5_FLYWAY_WORKFLOW.md) for detailed instructions and examples.

## Integration with Tauri/Rust

The Spring Boot backend is designed to be launched by the Tauri Rust application:

- **Development**: Auto-launched via `gradlew bootRun`
- **Production**: Runs as embedded JAR with bundled JRE

See [../docs/6_RUST_INTEGRATION.md](../docs/6_RUST_INTEGRATION.md) for complete integration instructions.

## Building for Production

### Create Fat JAR

```bash
./gradlew bootJar
```

Output: `build/libs/script-manager-backend-0.0.1-SNAPSHOT.jar`

### Test the JAR

```bash
java -jar build/libs/script-manager-backend-0.0.1-SNAPSHOT.jar
```

### Embed in Tauri App

1. Copy JAR to `../src-tauri/resources/backend.jar`
2. Bundle JRE in `../src-tauri/resources/jre/`
3. Configure Tauri to launch on startup

See [../docs/3_COMPLETE_SETUP_GUIDE.md](../docs/3_COMPLETE_SETUP_GUIDE.md) for complete deployment instructions.

## Configuration

### Database Configuration

**File**: `src/main/resources/application.yml`

```yaml
spring:
  datasource:
    url: jdbc:sqlite:../src-tauri/database.db
    driver-class-name: org.sqlite.JDBC
```

### Hibernate Configuration

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Never auto-creates/updates schema
```

### Flyway Configuration

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
```

## Development

### Hot Reload

Spring Boot DevTools is included. Changes to Kotlin files will trigger automatic restart.

### Running Tests

```bash
# Run all tests
./gradlew test

# Run with verbose output
./gradlew test --info

# Run specific test
./gradlew test --tests "FolderControllerTest"
```

### Gradle Tasks

```bash
# List all tasks
./gradlew tasks

# Build without tests
./gradlew build -x test

# Clean and rebuild
./gradlew clean build

# Check dependencies
./gradlew dependencies

# Check for updates
./gradlew dependencyUpdates
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

### Database Locked

- Close SQLite browser connections
- Stop any running Spring Boot instances
- Check for stale lock files

### Migration Failed

- Don't modify existing migration files
- Ensure sequential version numbers
- Check SQL syntax for SQLite compatibility

### Schema Validation Failed

- Entity doesn't match database schema
- Missing or incorrect migration
- Check column names and data types

## Performance Tuning

### Connection Pool

Add to `application.yml`:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 5
      minimum-idle: 2
      connection-timeout: 30000
```

### Logging

```yaml
logging:
  level:
    com.scriptmanager: DEBUG
    org.hibernate.SQL: DEBUG
    org.springframework.web: INFO
```

## Contributing

When making changes:

1. Follow Kotlin coding conventions
2. Write tests for new features
3. Update documentation
4. Always create Flyway migrations for schema changes
5. Test locally before committing

## License

See main project LICENSE file.

## Support

For detailed documentation:
- Start: [../docs/1_START_HERE.md](../docs/1_START_HERE.md)
- Setup: [../docs/3_COMPLETE_SETUP_GUIDE.md](../docs/3_COMPLETE_SETUP_GUIDE.md)
- Migrations: [../docs/5_FLYWAY_WORKFLOW.md](../docs/5_FLYWAY_WORKFLOW.md)
- Integration: [../docs/6_RUST_INTEGRATION.md](../docs/6_RUST_INTEGRATION.md)

## Version History

- **0.0.1-SNAPSHOT** (2025-10-30)
  - Initial setup
  - JPA entities for existing schema
  - REST API endpoints
  - Flyway migration support
  - Ready for Tauri integration

---

**Last Updated**: October 30, 2025

