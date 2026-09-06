---
name: db--h2-flyway-on-boot
description: >-
  Schema changes for this Tauri + Spring Boot desktop app: each user has a
  private H2 file, Flyway SQL lives on the Spring classpath and is baked into
  the GraalVM native binary, and migrate runs automatically on every backend
  boot (dev JVM and production native). Use when adding a column/table, writing
  Vn__*.sql, asking whether production users get the new schema, or explaining
  how per-user H2 upgrades work. Do NOT use the global db--flyway-migration
  skill (that scaffolds a standalone MySQL Flyway Maven project).
---

# Per-user H2 schema: Flyway on backend boot

This app is **not** a shared MySQL/Postgres server that an operator migrates
once. Each installation has its **own H2 file**. Schema upgrades happen
**automatically** when that user's Spring Boot process starts.

There is no `npm run migrate:prod`. Shipping a new `Vn__….sql` in the backend
binary **is** the production migration.

## Mandatory trigger

Load this skill **before** writing SQL or touching `ApplicationState` / other
entities when the user asks to:

- add a column / table / index to the H2 schema
- "will production users get this schema change?"
- explain Flyway vs Hibernate `ddl-auto` in this repo
- write the next `Vn__….sql` under `backend-spring/src/main/resources/db/migration/`

**Do not** invoke `db--flyway-migration`. That skill scaffolds a **standalone
MySQL** Flyway Maven project (`flyway-*-{local,dev,prod}.conf`, `npm run
migrate:prod:schema`). This repo does not work that way.

## Short answer

| Question | Answer |
|---|---|
| Is schema migration automatic? | **Yes.** Spring Boot Flyway auto-config runs `migrate` on startup, before JPA. |
| Does each user have their own DB? | **Yes.** One H2 file per machine / user data dir. |
| How does production get new SQL? | SQL is **classpath resources** compiled into `backend-native`. Tauri ships that binary. Next app launch starts Spring → Flyway applies pending versions to **that user's file**. |
| Do we run Flyway CLI against user machines? | **No.** Never. |
| Does Hibernate create/alter tables? | **No.** `spring.jpa.hibernate.ddl-auto: none`. Flyway owns DDL. |

## Architecture

```
developer writes Vn__….sql
        │
        ▼
backend-spring/src/main/resources/db/migration/
        │  (also on the JVM classpath in `tauri dev` / bootRun)
        ▼
GraalVM nativeCompile  →  backend-native
        │  Boot AOT includes db/migration/** as native-image resources
        ▼
Tauri bundle  →  resources/backend-spring/backend-native
        │
        ▼
user launches the app
        │
        ▼
Tauri starts backend-native with
  --spring.datasource.url=jdbc:h2:file:<user-db-base>;MODE=PostgreSQL;…
        │
        ▼
Flyway migrate on that file  →  then JPA  →  then HTTP
```

Spring is the **only** database client. Tauri does not open H2.

## Where the file lives

Resolved in `src-tauri/src/lib.rs` `get_database_path`, then stripped to an H2
**base** (no `.db`) because H2 appends `.mv.db` itself (`h2_database_base`).

| Mode | Logical path Tauri computes | Actual H2 file |
|---|---|---|
| Dev (`debug_assertions`) | `<cwd>/database.db` (cwd is `src-tauri`) | `src-tauri/database.mv.db` |
| Prod macOS | `~/Library/Application Support/shell-script-manager/database.db` | `…/database.mv.db` |
| Prod Windows | `~/AppData/Roaming/shell-script-manager/database.db` | `…/database.mv.db` |
| Prod Linux | `~/.config/shell-script-manager/database.db` | `…/database.mv.db` |

`application.yml` default is `jdbc:h2:file:${DB_PATH:src-tauri/database};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;USER=sa;PASSWORD=`. Production **overrides** that URL on the native-binary command line.

Empty `PASSWORD=` is intentional: H2 2.2 generates a random `sa` password if none is supplied, which locks the file on later boots.

## What Flyway does on boot

Config (`backend-spring/src/main/resources/application.yml`):

```yaml
spring:
  jpa.hibernate.ddl-auto: none   # Flyway owns DDL
  flyway.enabled: true           # default locations: classpath:db/migration
```

On **every** backend start (fresh install or upgrade):

1. Open the H2 file (create it if missing).
2. Ensure `flyway_schema_history` exists **in that file**.
3. Apply every `V<n>__*.sql` whose version is not yet in history, in order.
4. Already-applied versions are skipped. Checksums of applied versions are validated.
5. Only then does Hibernate start. Entities must already match the migrated schema.

A user on V1 who installs a build that contains V1+V2+V3 gets V2 and V3 applied
in-place. Their rows stay. A brand-new user gets V1 then V2 then V3 on first boot.

**Tests** (`application-test.yml`): `flyway.enabled: false`. Integration tests
use PostgreSQL Testcontainers + `schema.sql`, not these H2 scripts.

## How SQL gets into the production binary

`db/migration/*.sql` is a Spring Boot resource. `nativeCompile` + Boot AOT pack
classpath resources into `backend-native`. You do **not** copy the SQL folder
into the Tauri `resources:` list — only the native binary is bundled
(`src-tauri/tauri.conf.json` → `resources/backend-spring/backend-native`).

If Flyway on a native binary says it found **zero** migrations, the SQL was
stripped. Boot AOT normally adds a `db/migration/**` resource glob; if a future
Graal/AOT change drops it, add `{ "glob": "db/migration/**" }` under
`resources` in `META-INF/native-image/reachability-metadata.json` (see
`spring--graalvm-native`). Flyway 11 also needs `ConfigurationExtension`
reflection metadata — that is already in this repo.

Rebuild `backend-native` after adding SQL. An old binary cannot apply a
script it does not contain.

## Adding a schema change (the flow)

Do this in order. Do **not** edit an already-shipped `V1__` / `V2__` / … file
(Flyway checksums will fail on every existing user DB).

1. **Next version file only**

   `backend-spring/src/main/resources/db/migration/V<n>__<snake_description>.sql`

   Current versions: `V1__init.sql`, `V2__drop_ai.sql`,
   `V3__add_folder_column_width.sql` → next is `V4__…`.

   Integer versions, double underscore. H2 dialect in PostgreSQL mode
   (`MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE`). Prefer additive, idempotent DDL
   (`ADD COLUMN IF NOT EXISTS`, `DROP … IF EXISTS`) so a half-applied retry is
   safe. Do **not** put `USE schema;` in the script.

2. **JPA entity** to match the new column/table (`@Column(name = "…")`).

3. **KSP DTO** — `@GenerateDTO` entities regenerate `*DTO.kt` on
   `./gradlew kspKotlin` / `compileKotlin`. Update command/handler/controller
   constructors that **name** DTO fields (they do not always use `toDTO()`).

4. **Frontend DTO** in `src/types/dto.ts` and any RTK `update*` spreads that
   must keep the new field.

5. **Verify locally**

   Restart the Spring process (`tauri dev` or `./gradlew bootRun`). Watch the
   log for `Migrating schema … to version "n"`. Confirm
   `src-tauri/database.mv.db` (not a leftover `database.db` SQLite file).

6. **Ship**

   `nativeCompile` → copy `backend-native` into Tauri resources → bundle.
   Production users migrate on **next launch**. No extra step, no shared DB.

## Two different "migrations" — do not mix them

| Mechanism | What it does | When |
|---|---|---|
| **Flyway `Vn__*.sql`** | DDL on the H2 file this process opened | Every backend boot |
| **`SqliteToH2DataMigrator`** | One-shot **data** copy from leftover Prisma `database.db` (SQLite) sitting next to the H2 base | JVM only (`@ConditionalOnClass(org.sqlite.JDBC)`). Native image excludes sqlite-jdbc. Manual fallback: `scripts/migrate_sqlite_to_h2.py` |

Flyway creates empty tables; the SQLite importer fills them if a legacy file
exists and H2 is still empty. That is **not** how V3+ schema changes reach
users.

## Dev vs production backend process

| | Dev | Production |
|---|---|---|
| Who starts Spring | You (`bootRun` / IDE). Tauri does **not** spawn it | Tauri `start_spring_boot_backend` spawns `backend-native` |
| JDBC URL | `application.yml` / `DatabaseConfig` → `src-tauri/database` | `--spring.datasource.url=jdbc:h2:file:<abs-base>;…` |
| SQL source | files on disk via classpath | resources inside the native binary |

## Failure modes

- **Checksum mismatch** after editing an applied `Vn__*.sql`: Flyway refuses to
  start. Fix-forward with `V<n+1>`. Do not `flyway repair` on user machines
  unless you are sitting at that DB and know why.
- **Entity column without a Flyway script**: JVM may boot, then blow up on
  first query; native is the same. Always pair entity + `Vn__`.
- **SQL not in the native image**: Flyway history stays behind, production
  users never get the column. Rebuild native after adding scripts; confirm
  `db/migration/**` is a resource.
- **Opening the old SQLite `database.db` as H2**: H2 cannot read it. The
  engine swap already happened; live file is `database.mv.db`.
- **Tests applying H2 SQL to Postgres**: they must not. Keep
  `flyway.enabled: false` in `application-test.yml`.

## Checklist for a new version

- [ ] New file only: `V<n>__….sql` (never rewrite shipped versions)
- [ ] H2 / PostgreSQL-mode SQL; additive if possible
- [ ] Entity + generated DTO + named command/handler/controller fields
- [ ] Frontend type if the API returns the new field
- [ ] Local boot log shows migrate to `n`
- [ ] Native rebuild before a production bundle
- [ ] Did **not** run the MySQL `db--flyway-migration` scaffold
- [ ] Did **not** enable Hibernate `ddl-auto: update`

## Related skills

- `spring--graalvm-native` — packing Flyway into `backend-native` (resource
  globs, `ConfigurationExtension` reachability).
- `db--flyway-migration` — **do not use here** (MySQL multi-schema Maven
  project).
