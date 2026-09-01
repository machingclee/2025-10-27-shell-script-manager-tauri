#!/usr/bin/env python3
"""
One-time data migration: SQLite (Prisma-era) -> H2 (Spring/Flyway-era).

The old `database.db` is a SQLite file; H2 cannot open it. This script exports
every row (including primary keys, so IDs and join tables are preserved) as
H2-compatible INSERT statements, then optionally applies them to the H2 file
database that Flyway created on first boot.

Usage:
  1. Start the app once with the new build so Flyway creates the H2 schema
     (database.mv.db) next to the old database.db.
  2. Export the data:
        python3 scripts/migrate_sqlite_to_h2.py --sqlite src-tauri/database.db \
            --output /tmp/h2-data.sql
  3. Apply it to H2 (either of these):
        # a) via the H2 RunScript tool (USER=sa is required - H2 2.2.224
        #    otherwise generates a random sa password on a fresh database)
        java -cp h2.jar org.h2.tools.RunScript \
            -url "jdbc:h2:file:/path/to/database;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;USER=sa;PASSWORD=" \
            -user sa -script /tmp/h2-data.sql

        # b) or let this script invoke RunScript for you:
        python3 scripts/migrate_sqlite_to_h2.py --sqlite src-tauri/database.db \
            --h2-url "jdbc:h2:file:/path/to/database;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;USER=sa;PASSWORD=" \
            --h2-jar ~/.gradle/caches/modules-2/files-2.1/com.h2database/h2/2.2.224/*/h2-2.2.224.jar

Notes:
  - The schema must already exist in H2 (Flyway V1__init.sql). This script
    migrates DATA ONLY.
  - Referential integrity is suspended during import so rows can be inserted
    in any order.
"""

import argparse
import os
import sqlite3
import subprocess
import sys
import tempfile

# SQLite-internal tables that must never be exported.
SKIP_TABLES = {
    "sqlite_sequence",
    "sqlite_master",
    "sqlite_stat1",
    "sqlite_stat2",
    "sqlite_stat3",
    "sqlite_stat4",
    # Prisma's own migration bookkeeping - not part of the app schema.
    "_prisma_migrations",
}


def sql_literal(value, column_type):
    """Render one SQLite cell as an H2 SQL literal."""
    if value is None:
        return "NULL"
    if isinstance(value, bool) or "BOOL" in column_type.upper():
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, bytes):
        # H2 accepts hexadecimal literal X'...' for binary data.
        return "X'%s'" % value.hex()
    # String (and everything else) -> escaped single-quoted literal.
    return "'" + str(value).replace("'", "''") + "'"


def dump_sqlite_to_sql(sqlite_path, output_path):
    """Write data-only H2 SQL from the SQLite database."""
    if not os.path.exists(sqlite_path):
        print("ERROR: SQLite database not found: %s" % sqlite_path)
        sys.exit(1)

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row

    tables = [
        row["name"]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        if row["name"] not in SKIP_TABLES
    ]
    print("Found %d user tables in %s" % (len(tables), sqlite_path))

    total_rows = 0
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("-- Data migration from SQLite: %s\n" % sqlite_path)
        out.write("SET REFERENTIAL_INTEGRITY FALSE;\n\n")

        for table in tables:
            columns = [
                (row["name"], row["type"])
                for row in conn.execute("PRAGMA table_info(%s)" % _quote(table))
            ]
            col_names = [c[0] for c in columns]
            col_types = dict(columns)
            quoted_cols = ", ".join(_quote(c) for c in col_names)

            rows = conn.execute('SELECT * FROM "%s"' % table)
            count = 0
            for row in rows:
                values = ", ".join(
                    sql_literal(row[col], col_types.get(col, "")) for col in col_names
                )
                out.write(
                    'INSERT INTO "%s" (%s) VALUES (%s);\n' % (table, quoted_cols, values)
                )
                count += 1
            total_rows += count
            print("  - %-40s %6d rows" % (table, count))

        out.write("\n-- Reset identity sequences so future inserts do not collide with migrated ids\n")
        for table in tables:
            columns = [
                (row["name"], row["type"])
                for row in conn.execute("PRAGMA table_info(%s)" % _quote(table))
            ]
            col_names = [c[0] for c in columns]
            if "id" not in col_names:
                continue
            row = conn.execute(
                'SELECT MAX("id") AS max_id FROM "%s"' % table
            ).fetchone()
            try:
                max_id = int(row["max_id"]) if row is not None and row["max_id"] is not None else None
            except (TypeError, ValueError):
                max_id = None  # non-integer id column (e.g. UUID) - no sequence to reset
            if max_id is not None:
                out.write(
                    'ALTER TABLE "%s" ALTER COLUMN id RESTART WITH %d;\n'
                    % (table, max_id + 1)
                )

        out.write("\nSET REFERENTIAL_INTEGRITY TRUE;\n")

    conn.close()
    print("\nWrote %d rows to %s" % (total_rows, output_path))
    return total_rows


def _quote(identifier: str) -> str:
    """Quote an identifier for SQLite/H2 (double quotes, doubled inside)."""
    return '"%s"' % identifier.replace('"', '""')


def apply_to_h2(h2_url, h2_jar, sql_path):
    if not os.path.exists(h2_jar):
        print("ERROR: H2 jar not found: %s" % h2_jar)
        sys.exit(1)
    cmd = [
        "java",
        "-cp",
        h2_jar,
        "org.h2.tools.RunScript",
        "-url",
        h2_url,
        "-user",
        "sa",
        "-script",
        sql_path,
    ]
    print("Running: %s" % " ".join(cmd))
    subprocess.run(cmd, check=True)
    print("✓ Data imported into H2: %s" % h2_url)


def main():
    parser = argparse.ArgumentParser(description="Migrate SQLite data to H2")
    parser.add_argument("--sqlite", default="src-tauri/database.db", help="Path to the old SQLite database.db")
    parser.add_argument("--output", default=None, help="Output .sql file path (default: temp file)")
    parser.add_argument("--h2-url", default=None, help="H2 JDBC URL to import into (optional)")
    parser.add_argument("--h2-jar", default=None, help="Path to h2-*.jar for direct import (requires --h2-url)")
    args = parser.parse_args()

    output = args.output or tempfile.mktemp(suffix=".sql", prefix="h2-migration-")
    dump_sqlite_to_sql(args.sqlite, output)

    if args.h2_url:
        if not args.h2_jar:
            print("ERROR: --h2-jar is required when --h2-url is given")
            sys.exit(1)
        apply_to_h2(args.h2_url, args.h2_jar, output)
    else:
        print("\nData exported to %s" % output)
        print("Apply it with the H2 RunScript tool (see script header), e.g.:")
        print('  java -cp <h2.jar> org.h2.tools.RunScript \\')
        print('      -url "jdbc:h2:file:<db-base>;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE" \\')
        print('      -user sa -script %s' % output)


if __name__ == "__main__":
    main()
