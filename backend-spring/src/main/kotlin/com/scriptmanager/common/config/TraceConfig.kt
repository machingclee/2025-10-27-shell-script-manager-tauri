package com.scriptmanager.common.config

import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.sdk.common.CompletableResultCode
import io.opentelemetry.sdk.trace.data.SpanData
import io.opentelemetry.sdk.trace.export.SpanExporter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import javax.sql.DataSource
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration


@Configuration
@ConditionalOnProperty(
    name = ["app.tracing.enabled"],
    havingValue = "true",
    matchIfMissing = false
)
class TracingConfig(
    private val dataSource: DataSource
) {

    /**
     * Custom console logger for development showing SQL analysis.
     * The same analysis is visible in Jaeger through standard JDBC attributes.
     */
    @Bean
    fun betterTreeSpanExporter(): SpanExporter {
        return BetterTreeSpanExporter(dataSource)
    }
}


class BetterTreeSpanExporter(
    private val dataSource: DataSource
) : SpanExporter {
    private val logger = LoggerFactory.getLogger(BetterTreeSpanExporter::class.java)
    private val traceBuffer = ConcurrentHashMap<String, MutableList<SpanData>>()
    private val queryPlanCache = ConcurrentHashMap<String, QueryPlanInfo>()

    data class QueryPlanInfo(
        val plan: String,
        val warnings: List<String>
    )

    override fun export(spans: Collection<SpanData>): CompletableResultCode {
        spans.forEach { span ->
            traceBuffer.getOrPut(span.traceId) { mutableListOf() }.add(span)

            if (span.parentSpanId == "0000000000000000" && span.kind.name == "SERVER") {
                printCompleteTrace(span.traceId)
                traceBuffer.remove(span.traceId)
            }
        }

        return CompletableResultCode.ofSuccess()
    }

    private fun printCompleteTrace(traceId: String) {
        val allSpans = traceBuffer[traceId] ?: return

        logger.info("\n\n" + "═".repeat(100))
        logger.info("📊 TRACE: $traceId")
        logger.info("═".repeat(100))

        val spanMap = allSpans.associateBy { it.spanId }
        val rootSpan = allSpans.find {
            it.parentSpanId == "0000000000000000" && it.kind.name == "SERVER"
        }

        if (rootSpan != null) {
            printSpanTree(rootSpan, spanMap, 0)

            // Show all queries WITH execution plans grouped together
            logger.info("─".repeat(100))
            logger.info("📝 QUERIES & EXECUTION PLANS:")
            logger.info("")

            allSpans.filter { it.name == "query" }.forEachIndexed { index, span ->
                val duration = TimeUnit.NANOSECONDS.toMillis(span.endEpochNanos - span.startEpochNanos)
                val query = span.attributes.get(AttributeKey.stringKey("jdbc.query[0]")) ?: "unknown"
                val rowsAffected = span.attributes.get(AttributeKey.longKey("jdbc.row-affected"))

                // Format SQL nicely
                val formattedQuery = query
                    .replace(Regex("\\s+"), " ")
                    .replace(" from ", "\n  FROM ")
                    .replace(" left join ", "\n  LEFT JOIN ")
                    .replace(" inner join ", "\n  INNER JOIN ")
                    .replace(" where ", "\n  WHERE ")
                    .replace(" order by ", "\n  ORDER BY ")
                    .replace(" limit ", "\n  LIMIT ")
                    .replace(" group by ", "\n  GROUP BY ")

                // Get execution plan
                val planInfo = getQueryPlanInfo(query)

                // Print everything together in a box
                logger.info("┌─ Query #${index + 1} (${duration}ms) " + "─".repeat(80 - "Query #${index + 1} (${duration}ms) ".length))
                logger.info("│")
                logger.info("│ 📝 SQL:")
                formattedQuery.lines().forEach { line ->
                    logger.info("│    $line")
                }

                if (rowsAffected != null) {
                    logger.info("│    → Affected: $rowsAffected rows")
                }

                logger.info("│")
                logger.info("│ 📋 Execution Plan:")
                if (planInfo.plan.isNotBlank()) {
                    planInfo.plan.lines().forEach { line ->
                        logger.info("│    $line")
                    }

                    // Show warnings immediately after the plan
                    if (planInfo.warnings.isNotEmpty()) {
                        logger.info("│")
                        planInfo.warnings.forEach { warning ->
                            logger.warn("│    ⚠️  $warning")
                        }
                    }
                } else {
                    logger.info("│    (No plan available)")
                }

                logger.info("└" + "─".repeat(99))
                logger.info("")
            }

            // Detect N+1
            detectNPlusOne(allSpans)

            val totalTime = TimeUnit.NANOSECONDS.toMillis(
                rootSpan.endEpochNanos - rootSpan.startEpochNanos
            )
            logger.info("─".repeat(100))
            logger.info("📈 Summary: Total ${allSpans.size} spans, ${totalTime}ms total time")

            val slowQueries = allSpans
                .filter { it.name == "query" }
                .map {
                    val duration = TimeUnit.NANOSECONDS.toMillis(it.endEpochNanos - it.startEpochNanos)
                    Pair(it, duration)
                }
                .filter { it.second > 1 }
                .sortedByDescending { it.second }

            if (slowQueries.isNotEmpty()) {
                logger.info("🐌 Slow queries (>1ms): ${slowQueries.size} queries")
                slowQueries.take(3).forEach { (span, duration) ->
                    val query = span.attributes.get(AttributeKey.stringKey("jdbc.query[0]"))
                        ?.take(80) ?: "unknown"
                    logger.info("   → ${duration}ms: $query...")
                }
            }

            // Show query plan cache stats
            logger.info("💾 Query plan cache: ${queryPlanCache.size} unique queries cached")
        }

        logger.info("═".repeat(100) + "\n")
    }

    private fun getQueryPlanInfo(sql: String): QueryPlanInfo {
        if (sql == "unknown" || sql.startsWith("EXPLAIN", ignoreCase = true)) {
            return QueryPlanInfo("", emptyList())
        }

        val normalizedSql = normalizeSql(sql)

        return queryPlanCache.computeIfAbsent(normalizedSql) {
            try {
                val plan = executeExplainQuery(sql)
                val warnings = analyzeQueryPlan(plan)
                QueryPlanInfo(plan, warnings)
            } catch (e: Exception) {
                logger.debug("Could not get query plan for query: ${e.message}")
                QueryPlanInfo("   Unable to get query plan: ${e.message}", emptyList())
            }
        }
    }

    private fun executeExplainQuery(sql: String): String {
        return dataSource.connection.use { conn ->
            conn.createStatement().use { stmt ->
                // H2 uses "EXPLAIN SELECT ..." and returns a single "PLAN" column
                val explainSql = "EXPLAIN $sql"
                val rs = stmt.executeQuery(explainSql)

                buildString {
                    while (rs.next()) {
                        // H2 EXPLAIN returns one column ("PLAN"); read by index for robustness
                        appendLine("   ${rs.getString(1)}")
                    }
                }
            }
        }
    }

    private fun normalizeSql(sql: String): String {
        // Remove parameter values and extra whitespace to create cache key
        return sql
            .replace(Regex("=\\s*'[^']*'"), "= ?")  // Remove string literals
            .replace(Regex("=\\s*\\d+"), "= ?")      // Remove numbers
            .replace(Regex("=\\s*\\?"), "= ?")       // Normalize placeholders
            .replace(Regex("\\s+"), " ")             // Normalize whitespace
            .trim()
    }

    private fun analyzeQueryPlan(plan: String): List<String> {
        val warnings = mutableListOf<String>()

        // H2 EXPLAIN plans mark table scans with "/* scanCount: N */"
        if (plan.contains("scanCount", ignoreCase = true)) {
            warnings.add("🐌 Table scan detected! Consider adding an index.")
        }

        // H2 marks sort operations in the plan
        if (plan.contains("SORT", ignoreCase = true)) {
            warnings.add("📊 Sorting without index. Consider adding index on ORDER BY column.")
        }

        // Check for grouping without index
        if (plan.contains("GROUP", ignoreCase = true) && plan.contains("SORT", ignoreCase = true)) {
            warnings.add("📊 Grouping without index. Consider adding index on GROUP BY column.")
        }

        // Check for multiple table scans
        val scanCount = Regex("scanCount", RegexOption.IGNORE_CASE)
            .findAll(plan)
            .count()
        if (scanCount > 2) {
            warnings.add("⚠️  Multiple table scans ($scanCount) detected. Performance may be poor.")
        }

        return warnings
    }

    private fun detectNPlusOne(spans: List<SpanData>) {
        val queries = spans.filter { it.name == "query" }

        val queryGroups = queries.groupBy { span ->
            span.attributes.get(AttributeKey.stringKey("jdbc.query[0]"))
                ?.replace(Regex("\\s+"), " ")
        }

        val repeatedQueries = queryGroups.filter { it.value.size > 1 }

        if (repeatedQueries.isNotEmpty()) {
            logger.info("─".repeat(100))
            logger.info("⚠️  N+1 QUERY PROBLEM DETECTED!")
            repeatedQueries.forEach { (query, spanList) ->
                logger.info("")
                logger.info("   🔴 Query executed ${spanList.size} times:")

                val formatted = query?.replace(Regex("\\s+"), " ")
                    ?.replace(" from ", "\n      FROM ")
                    ?.replace(" where ", "\n      WHERE ") ?: "unknown"

                logger.info("      $formatted")

                // Show execution plan for repeated query
                val planInfo = getQueryPlanInfo(query ?: "")
                if (planInfo.plan.isNotBlank()) {
                    logger.info("")
                    logger.info("      📋 Execution Plan for this repeated query:")
                    planInfo.plan.lines().forEach { line ->
                        logger.info("      $line")
                    }
                }

                logger.info("")
                logger.info("      💡 Tip: Use JOIN FETCH or @EntityGraph to load related data in one query")
            }
        }
    }

    private fun printSpanTree(
        span: SpanData,
        spanMap: Map<String, SpanData>,
        level: Int
    ) {
        val durationMs = TimeUnit.NANOSECONDS.toMillis(
            span.endEpochNanos - span.startEpochNanos
        )

        val indent = "  ".repeat(level)
        val emoji = when {
            span.kind.name == "SERVER" -> "🌐"
            span.name == "connection" -> "🔌"
            span.name == "query" -> "📝"
            span.name == "result-set" -> "📊"
            else -> "  "
        }

        val rowCount = span.attributes.get(AttributeKey.longKey("jdbc.row-count"))

        val colorCode = when {
            durationMs > 50 -> "🔴"
            durationMs > 10 -> "🟡"
            else -> "🟢"
        }

        val info = buildString {
            append("$colorCode $indent$emoji ${span.name}")
            append(" (${durationMs}ms)")

            if (rowCount != null) {
                append(" → $rowCount rows")
            }
        }

        logger.info(info)

        val children = spanMap.values
            .filter { it.parentSpanId == span.spanId }
            .sortedBy { it.startEpochNanos }

        children.forEach { child ->
            printSpanTree(child, spanMap, level + 1)
        }
    }

    override fun flush(): CompletableResultCode = CompletableResultCode.ofSuccess()
    override fun shutdown(): CompletableResultCode = CompletableResultCode.ofSuccess()
}


