# Liquibase Migration Workflow (Prisma-like!)

This document explains how to manage database schema changes using JPA entities and **Liquibase with auto-generation**.

## ✨ Why Liquibase?

Unlike Flyway, Liquibase can **automatically detect changes** between your JPA entities and the database, generating migration files for you - similar to how Prisma works!

## Important Principle

**JPA entities do NOT automatically update the database schema.** We use Liquibase for all schema changes to maintain control and versioning.

## Workflow: The Prisma-like Experience

### Step 1: Modify Your JPA Entity

Example: Let's say you want to add a `description` field to `ShellScript`:

```kotlin
@Entity
@Table(name = "shell_script")
data class ShellScript(
    // ... existing fields ...
    
    @Column(nullable = true)
    val description: String? = null,  // NEW FIELD
)
```

### Step 2: Generate Migration Automatically ⚡

Run this **one command** to generate a diff changeset:

```bash
cd backend-spring
./gradlew diffChangeLog
```

**What this does:**
1. Compares your JPA entities (desired state) vs actual database (current state)
2. Generates a new changeset file with the differences
3. Adds it to your changelog

**This is like running `prisma migrate dev`!**

### Step 3: Review the Generated Migration

Check the generated changeset in `db/changelog/` to ensure it's correct.

### Step 4: Apply the Migration

Run the application - Liquibase will automatically apply the migration:

```bash
./gradlew bootRun
```

### Step 5: Verify & Commit

1. Test your application functionality
2. Commit both the entity changes AND the generated changeset to git

## Quick Reference

| Task | Command |
|------|---------|
| **Generate migration** (after editing entities) | `./gradlew diffChangeLog` |
| **Apply migrations** | `./gradlew update` or `./gradlew bootRun` |
| Show migration status | `./gradlew status` |
| Preview SQL without applying | `./gradlew updateSQL` |
| Rollback last migration | `./gradlew rollbackCount -PliquibaseCommandValue=1` |

## Example: Add a Field

**1. Edit entity:**
```kotlin
@Entity
data class ShellScript(
    // ... existing fields ...
    val tags: String? = null  // NEW
)
```

**2. Generate migration:**
```bash
./gradlew diffChangeLog
```

**3. Apply:**
```bash
./gradlew bootRun
```

✅ Done! The `tags` column is now in your database.

## Comparison: Liquibase vs Prisma vs Flyway

| Feature | Prisma | Liquibase | Flyway |
|---------|--------|-----------|--------|
| **Auto-generate migrations** | ✅ Yes | ✅ Yes | ❌ No |
| **Detect entity changes** | ✅ Yes | ✅ Yes | ❌ No |
| **Plain SQL support** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Rollback support** | Limited | ✅ Yes | Limited |

**Verdict**: Liquibase gives you Prisma-like convenience in the Spring Boot world!

## Best Practices

1. **Use `diffChangeLog` frequently** - Let Liquibase generate migrations for you
2. **Review generated changesets** - Always check what was generated before applying
3. **Never modify applied changesets** - Once applied, they're immutable
4. **Commit entity + changeset together** in the same git commit

## Troubleshooting

### Entity doesn't match schema

Solution: Run `./gradlew diffChangeLog` to generate the missing migration

### diffChangeLog doesn't detect changes

1. Make sure you've compiled your code: `./gradlew build`
2. Check that entity package is correct: `com.scriptmanager.entity`

## Summary

**Liquibase gives you Prisma-like convenience:**

1. 📝 Edit entity
2. ⚡ Run `./gradlew diffChangeLog`
3. ✅ Apply with `./gradlew bootRun`

**No more manual SQL writing for simple changes!**

For complete documentation, see: [backend-spring/LIQUIBASE_WORKFLOW.md](../backend-spring/LIQUIBASE_WORKFLOW.md)

Happy migrating! 🚀

