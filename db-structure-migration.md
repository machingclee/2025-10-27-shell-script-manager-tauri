# Prisma + SQLite → Hibernate + H2

Assessment of replacing the Prisma/SQLite stack with H2 under the existing Hibernate layer.

**Date:** 2026-09-01
**Verdict:** Yes — Hibernate already owns all reads and writes. Prisma is only schema bootstrap. H2 is a feasible engine swap if Prisma is dropped as DDL owner. PostgreSQL is the better long-term engine if the goal is “SQLite is not enough.”

---

## Current architecture

This is not a Prisma app that happens to also have Spring. Runtime data access is already Spring Data JPA / Hibernate.

```
React (RTK Query)
    → HTTP localhost:${port}   (7070 in dev, random in prod)
        → Spring Boot 3.2 / Hibernate / Hikari
            → jdbc:sqlite:${DB_PATH}/database.db

Tauri (startup only)
    → prisma-client-rust
        → create/sync database.db via _db_push()
        → spawn Spring with the same file path
```

| Layer | Talks to SQLite? | How |
|---|---|---|
| Spring (`backend-spring`) | Yes — **all CRUD** | `sqlite-jdbc` + `SQLiteDialect` + Spring Data JPA |
| Tauri / Rust | Schema init only | `prisma-client-rust` `_db_push()` at startup |
| Frontend | No | HTTP to Spring (`src/store/api/*`) |
| Node `@prisma/client` 4.8.0 | No | Declared in `package.json`, unused at runtime |
| Python backend | No | — |

### Prisma’s real job

Tauri `init_db` (`src-tauri/src/lib.rs`):

1. Resolve `database.db` (dev: `src-tauri/`; prod: Application Support).
2. `prisma::new_client_with_url`.
3. `PRAGMA foreign_keys = ON`.
4. `client._db_push().accept_data_loss()`.
5. Start Spring against the same file.

The Rust repositories under `src-tauri/src/db/repository/` (`script_repository.rs`, `folder_repository.rs`, `app_state_repository.rs`) are **dead**. `lib.rs` never `mod db`s them. Command/query handlers in Tauri are empty stubs. Dark-mode updates already go through Spring HTTP specifically to avoid SQLite lock conflicts.

### Hibernate already maps the schema

Entities in `backend-spring/src/main/kotlin/com/scriptmanager/common/entity/` cover the Prisma models 1:1 (`shell_script`, `scripts_folder`, join tables, AI config, events, …). Repositories are Spring Data JPA. `ddl-auto: none` because Prisma still owns DDL.

Tests already do **not** use SQLite — they use PostgreSQL via Testcontainers (`application-test.yml` + `src/test/resources/schema.sql`).

---

## Schema (what would move)

Active schema: `src-tauri/prisma/schema.prisma`

PostgreSQL twin (tests / exploration, not prod): `src-tauri/prisma/schema_postgresql.prisma`

### Models

**Core:** `application_state`, `scripts_folder`, `shell_script`, `workspace`, `workspace_status`, `historical_shell_script`, `event`, `ai_profile`, `script_ai_config`, `model_config`, `azure_model_config`, `openai_model_config`, `ai_scripted_tool`

**Join tables (explicit Prisma models; mostly `@JoinTable` in JPA):**
`rel_scriptsfolder_shellscript`, `rel_folder_folder`, `rel_workspace_folder`, `rel_workspace_workspacestatus`, `rel_shellscript_aiconfig`, `rel_aiprofile_modelconfig`, `rel_aiprofile_aiscriptedtool`

No Prisma `enum` types. String columns with comments, mapped in Kotlin as `@Enumerated(EnumType.STRING)` (`SystemLevel`, `ModelSourceType`, `WorkspaceStatusName`).

No FTS. No JSON columns. Search is JPQL `LOWER(...) LIKE %...%` (`ShellScriptRepository.searchByNameOrCommand`).

### SQLite-only defaults (must be rewritten)

Every table uses:

```sql
created_at     REAL DEFAULT CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)
created_at_hk  TEXT DEFAULT strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))
```

Entities rely on these via `@Generated` + `@DynamicInsert`. They are not portable to H2 or Postgres as-is. The PG variants already exist in `schema_postgresql.prisma` and test `schema.sql`.

---

## SQLite pain already in the codebase

Live `src-tauri/database.db` is ~9 MB. Volume is not the problem (`event` is the largest table at ~12.6k audit rows). The problem is the engine:

| File | Why it exists |
|---|---|
| `DatabaseConfig.kt` | Hikari pool=5, `PRAGMA busy_timeout / WAL / synchronous=NORMAL` |
| `SqliteDomainEventLogger.kt` | domain-util’s `REQUIRES_NEW` audit tx deadlocks on SQLite’s single writer (`SQLITE_BUSY`) |
| `application.yml` | `jdbc:sqlite:` + `SQLiteDialect` |
| Graal `reflect-config.json` | `org.sqlite.JDBC` / `SQLiteDialect` |
| Dual process | Tauri Prisma + Spring Hikari on the same file |

Frontend does not open SQLite. If Prisma is removed from the write/init path, Spring is the sole opener.

---

## Can H2 replace this?

**Engine: yes. Prisma: no.** Prisma has no H2 provider. Once the store is H2, `_db_push()` is gone. Schema init must move into Spring (Flyway preferred for a shipped desktop app).

Suggested file URL:

```text
jdbc:h2:file:${DB_PATH};AUTO_SERVER=TRUE;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE
```

(`AUTO_SERVER` only if something besides Spring must attach. Prefer Spring as the only client and leave it off.)

| H2 gives you | H2 does not give you |
|---|---|
| First-class `H2Dialect` (no community SQLite dialect) | Opening the existing `database.db` (that file is SQLite; needs a one-shot copy) |
| MVCC — `SqliteDomainEventLogger` can go | Prisma compatibility (Prisma is deleted, not retargeted) |
| Still a local file under Application Support | PostgreSQL (tests already run on Postgres) |
| Only the JVM can open it — fine, only Spring opens the DB now | A fix for “I need a server-grade engine” |

H2 file is better than SQLite. It is not Postgres.

---

## Options ranked

| Goal | Do this |
|---|---|
| Kill Prisma, keep a local file, fix `SQLITE_BUSY` | **H2 file + Flyway + existing Hibernate.** Doable. |
| Stop fighting dialects; tests already on Postgres | **Postgres in prod too** (local / bundled). Best fit for `schema_postgresql.prisma` and test `schema.sql`. |
| Stay embedded and stay SQLite | Don’t change engines. Move DDL from Prisma `_db_push` to Flyway. Does **not** fix single-writer. |

If SQLite is failing because of the single-writer lock (the comments in `SqliteDomainEventLogger` say that’s already biting), H2 file is enough. If the need is real SQL, extensions, or prod matching tests, skip H2 and go to Postgres.

---

## If H2: work list

Frontend does not change. Hibernate repositories do not need a rewrite. One native query (`UPDATE shell_script SET is_editing = false`) is portable.

1. **Drop Prisma from Tauri** — `init_db` / `prisma-client-rust` / `schema.prisma` / generated `prisma.rs` / dead `src-tauri/src/db`.
2. **Spring owns the file** — `DatabaseConfig` + `application.yml` → H2. Pass `DB_PATH` from Tauri the same way as today (`get_database_path` → Application Support).
3. **Flyway** with H2 SQL, replacing `_db_push`. Port `created_at` / `created_at_hk` off `julianday`/`strftime`.
4. **Delete `SqliteDomainEventLogger`** and let domain-util use `REQUIRES_NEW` again. Retest audit under load.
5. **Graal native-image** — replace sqlite JDBC reflect config with H2; re-test `backend-native`.
6. **One-time data migrate** SQLite → H2 (export/import; not a file rename). Preserve IDs and join tables.
7. **Tests** — keep Postgres Testcontainers (honest prod/test split) or run tests on H2 so they match the shipped engine.
8. **Do not** let Tauri open the H2 file. Dual-writer is the bug being removed.

### Blockers vs non-blockers

| Item | Status |
|---|---|
| FTS5 / JSON1 | Not used — not a blocker |
| SQLite `julianday` / `strftime` defaults | **Blocker** — rewrite |
| Prisma → H2 | **Blocker** — no H2 provider; switch migrator |
| Concurrent Prisma + Spring on one file | Already painful; H2 migration should eliminate the second opener |
| Embedding H2 in Spring | Easy (classpath + file URL) |
| Shipping an H2 file with Tauri | Create on first boot under app support; don’t bundle a mutable DB in read-only resources |
| Existing user SQLite DBs | Migration script required |
| GraalVM native + H2 | Work required |
| domain-util audit | Likely improves vs SQLite; must retest |

---

## Key paths

### Schema / DB
- `src-tauri/prisma/schema.prisma`
- `src-tauri/prisma/schema_postgresql.prisma`
- `src-tauri/prisma/migrations/`
- `src-tauri/database.db`
- `src-tauri/src/prisma.rs`

### Tauri
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs` (`get_database_path`, Prisma init, Spring spawn)
- `src-tauri/src/db/` (dead repositories)

### Spring
- `backend-spring/build.gradle.kts`
- `backend-spring/src/main/resources/application.yml`
- `backend-spring/src/main/kotlin/com/scriptmanager/common/config/DatabaseConfig.kt`
- `backend-spring/src/main/kotlin/com/scriptmanager/common/config/SqliteDomainEventLogger.kt`
- `backend-spring/src/main/kotlin/com/scriptmanager/common/entity/`
- `backend-spring/src/main/kotlin/com/scriptmanager/repository/`
- `backend-spring/src/test/resources/application-test.yml`
- `backend-spring/src/test/resources/schema.sql`

### Frontend
- `src/store/api/{baseApi,scriptApi,folderApi,workspaceApi,appStateApi,aiApi}.ts`
- `src/store/api/baseQuery/httpBaseQuery.ts`

---

## Bottom line

Spring can move to H2 + Hibernate with moderate work: deps, `DatabaseConfig`, dialect, Flyway, timestamp defaults, Tauri JDBC URL, native-image, one-shot data copy.

“Migrate the entire Prisma + SQLite setup” is not a straight port. Prisma cannot target H2. Tauri’s Prisma layer is schema bootstrap + dead weight, not the primary runtime API.
