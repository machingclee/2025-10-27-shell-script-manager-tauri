package com.scriptmanager.common.config

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.sql.Connection
import java.sql.DriverManager
import javax.sql.DataSource
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

/**
 * One-time data migration from the old Prisma/SQLite store to H2.
 *
 * On the first boot after the engine swap, if a legacy `database.db` (SQLite)
 * file sits next to the H2 file and the H2 database has no data yet, every row
 * is copied over - including primary keys, so IDs and join tables are preserved -
 * and the H2 identity sequences are advanced so future inserts cannot collide
 * with the migrated ids. The old file is then renamed to `<base>.db.migrated`.
 *
 * Runs as an [ApplicationRunner] (after Flyway has created the schema) and before
 * the seed runners ([DraftFolderInitialization], [WorkspaceStatusInitialization]).
 * If the import fails, the transaction is rolled back, the old file is left
 * untouched and the app still starts (empty H2); the migration is retried on the
 * next boot, or can be done manually with `scripts/migrate_sqlite_to_h2.py`.
 *
 * The `sqlite-jdbc` driver is a JVM-only runtime dependency used here.
 * Native images exclude it (the app runs on H2); leftover SQLite files can
 * still be imported with `scripts/migrate_sqlite_to_h2.py`.
 */
@Component
@ConditionalOnClass(name = ["org.sqlite.JDBC"])
@Order(Ordered.HIGHEST_PRECEDENCE)
class SqliteToH2DataMigrator(
    private val dataSource: DataSource
) : ApplicationRunner {

    private val logger = LoggerFactory.getLogger(javaClass)

    private val skippedTables = setOf(
        "sqlite_sequence", "sqlite_master", "sqlite_stat1", "sqlite_stat2",
        "sqlite_stat3", "sqlite_stat4", "_prisma_migrations",
        // AI feature removed; skip leftover SQLite tables so they are not copied into H2.
        "ai_profile", "script_ai_config", "model_config", "ai_scripted_tool",
        "azure_model_config", "openai_model_config",
        "rel_shellscript_aiconfig", "rel_aiprofile_modelconfig", "rel_aiprofile_aiscriptedtool"
    )

    private data class TableData(val name: String, val inserts: List<String>)

    override fun run(args: ApplicationArguments) {
        val h2Base = h2FileBase(dataSource) ?: return
        val sqliteFile = Path.of("$h2Base.db")
        if (!Files.isRegularFile(sqliteFile)) {
            return // no legacy database - nothing to migrate
        }

        if (h2AlreadyHasData()) {
            logger.info(
                "Legacy SQLite database found at {} but H2 already contains data - skipping migration",
                sqliteFile
            )
            return
        }

        logger.warn("Found legacy SQLite database at {} - migrating data to H2 ...", sqliteFile)
        try {
            val migratedRows = migrate(sqliteFile)
            val renamed = Path.of("$h2Base.db.migrated")
            Files.move(sqliteFile, renamed, StandardCopyOption.REPLACE_EXISTING)
            logger.warn(
                "SQLite -> H2 migration completed: {} rows copied. Old file preserved at {}",
                migratedRows, renamed
            )
        } catch (e: Exception) {
            logger.error(
                "SQLite -> H2 migration FAILED. Old database left untouched at {}. " +
                    "It will be retried on the next startup, or use scripts/migrate_sqlite_to_h2.py manually.",
                sqliteFile, e
            )
            // Do not crash the app: it will start with an empty H2 database and the
            // legacy file is still there for a manual or retried migration.
        }
    }

    private fun h2AlreadyHasData(): Boolean =
        dataSource.connection.use { conn ->
            conn.createStatement().use { stmt ->
                stmt.executeQuery("SELECT COUNT(*) FROM shell_script").use { rs ->
                    rs.next() && rs.getLong(1) > 0
                }
            }
        }

    /** Extracts the H2 file base from the datasource URL (after `jdbc:h2:file:`). */
    private fun h2FileBase(dataSource: DataSource): String? {
        val url = dataSource.connection.use { it.metaData.url } ?: return null
        val prefix = "jdbc:h2:file:"
        if (!url.startsWith(prefix)) {
            return null // in-memory or non-H2 datasource (e.g. tests on Postgres)
        }
        val rest = url.removePrefix(prefix)
        val semicolon = rest.indexOf(';')
        return if (semicolon >= 0) rest.substring(0, semicolon) else rest
    }

    private fun migrate(sqliteFile: Path): Int {
        // Read everything from SQLite first, holding that connection only briefly.
        Class.forName("org.sqlite.JDBC")
        val tablesData = DriverManager.getConnection("jdbc:sqlite:${sqliteFile.toAbsolutePath()}")
            .use { sqlite -> sqliteTables(sqlite).map { table -> TableData(table, buildInsertStatements(sqlite, table)) } }

        val migratedRows = tablesData.sumOf { it.inserts.size }

        dataSource.connection.use { conn ->
            conn.createStatement().use { stmt ->
                stmt.execute("SET REFERENTIAL_INTEGRITY FALSE")
            }
            try {
                conn.autoCommit = false
                conn.createStatement().use { stmt ->
                    for (table in tablesData) {
                        for (insert in table.inserts) {
                            stmt.execute(insert)
                        }
                    }
                    // Advance identity sequences so new inserts cannot collide with migrated ids.
                    for (table in tablesData) {
                        stmt.executeQuery("SELECT MAX(id) FROM \"${table.name}\"").use { rs ->
                            if (rs.next()) {
                                val maxId = rs.getLong(1)
                                if (maxId > 0) {
                                    stmt.execute("ALTER TABLE \"${table.name}\" ALTER COLUMN id RESTART WITH ${maxId + 1}")
                                }
                            }
                        }
                    }
                }
                conn.commit()
            } catch (e: Exception) {
                conn.rollback()
                throw e
            } finally {
                conn.autoCommit = true
                conn.createStatement().use { stmt ->
                    stmt.execute("SET REFERENTIAL_INTEGRITY TRUE")
                }
            }
        }
        return migratedRows
    }

    private fun sqliteTables(conn: Connection): List<String> =
        conn.createStatement().use { stmt ->
            stmt.executeQuery("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").use { rs ->
                buildList {
                    while (rs.next()) {
                        val name = rs.getString(1)
                        if (name !in skippedTables) {
                            add(name)
                        }
                    }
                }
            }
        }

    private fun buildInsertStatements(conn: Connection, table: String): List<String> {
        val columns = conn.createStatement().use { stmt ->
            stmt.executeQuery("PRAGMA table_info(\"$table\")").use { rs ->
                buildList {
                    while (rs.next()) {
                        add(rs.getString("name") to rs.getString("type"))
                    }
                }
            }
        }
        val columnList = columns.joinToString(", ") { "\"${it.first}\"" }
        val statements = mutableListOf<String>()

        conn.createStatement().use { stmt ->
            stmt.executeQuery("SELECT * FROM \"$table\"").use { rs ->
                while (rs.next()) {
                    val values = columns.joinToString(", ") { (name, type) ->
                        sqlLiteral(rs.getObject(rs.findColumn(name)), type ?: "")
                    }
                    statements += "INSERT INTO \"$table\" ($columnList) VALUES ($values);"
                }
            }
        }
        return statements
    }

    private fun sqlLiteral(value: Any?, sqliteType: String): String = when {
        value == null -> "NULL"
        sqliteType.uppercase().contains("BOOL") ->
            if ((value as? Number)?.toInt() != 0) "TRUE" else "FALSE"
        value is Number -> value.toString()
        value is ByteArray -> "X'${value.joinToString("") { "%02x".format(it) }}'"
        else -> "'${value.toString().replace("'", "''")}'"
    }
}
