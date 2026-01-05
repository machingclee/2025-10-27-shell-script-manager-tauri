# 📊 Enriching Jaeger Traces with Query Analysis

## Overview

Your Spring Boot application now has **TWO ways** to view SQL query analysis:

1. **Console Logs** - Beautiful formatted output in terminal (via `BetterTreeSpanExporter`)
2. **Jaeger UI** - Query details visible as span tags (via `QueryPlanObservationHandler`)

---

## How It Works

### Architecture

```
HTTP Request
    ↓
Spring Boot Observation
    ↓
┌──────────────────────────────────────────────────────┐
│  QueryPlanObservationHandler (NEW!)                  │
│  - Intercepts database query observations           │
│  - Gets execution plan from database                 │
│  - Analyzes for performance issues                  │
│  - Adds tags to span BEFORE export                  │
└──────────────────────────────────────────────────────┘
    ↓
Span exported to multiple destinations:
    ├─→ BetterTreeSpanExporter → Console
    └─→ OTLP Exporter → Jaeger
```

### What Gets Added to Jaeger Spans

For each database query, the following **span tags** are added:

1. **`db.execution_plan`** - The SQLite EXPLAIN QUERY PLAN output (truncated to 500 chars)
2. **`db.performance_warnings`** - Combined list of all warnings
3. **`db.warning.0`, `db.warning.1`, `db.warning.2`** - Individual warnings (up to 3)
4. **`db.optimization_score`** - Overall score: `excellent`, `good`, `fair`, or `poor`

---

## Viewing in Jaeger

### Step 1: Open a Trace

1. Go to http://localhost:16686/search
2. Select service: `script-manager-backend`
3. Click "Find Traces"
4. Click on any trace

### Step 2: Find Database Query Spans

- Look for spans named `query` (database operations)
- Click on a query span to expand it

### Step 3: View Tags

Scroll down in the span details to see the **Tags** section. You'll see:

```
db.execution_plan: "SCAN TABLE workspace ..."
db.performance_warnings: "⚠️ Full table scan | 📦 Temp B-tree created"
db.warning.0: "⚠️ Full table scan"
db.warning.1: "📦 Temp B-tree created"
db.optimization_score: "fair"
```

---

## Performance Warnings Explained

### ⚠️ Full Table Scan

**Problem**: Database is scanning every row instead of using an index  
**Impact**: Slow queries, especially on large tables  
**Fix**: Add an index on the columns used in WHERE clause

### 📦 Temp B-tree Created

**Problem**: Database created a temporary B-tree structure  
**Impact**: Extra memory usage and processing time  
**Fix**: Add appropriate indexes

### 📊 Sort Without Index

**Problem**: ORDER BY clause requires sorting without an index  
**Impact**: Slower queries, especially with many rows  
**Fix**: Add index on ORDER BY columns

### 📊 Group Without Index

**Problem**: GROUP BY clause requires grouping without an index  
**Impact**: Slower aggregation queries  
**Fix**: Add index on GROUP BY columns

### ⚠️ Multiple Table Scans

**Problem**: Query scans multiple tables completely  
**Impact**: Very slow, exponentially worse with table size  
**Fix**: Review JOIN conditions and add indexes

---

## Optimization Scores

| Score     | Meaning                                         |
|-----------|-------------------------------------------------|
| excellent | ✅ Uses index, no warnings                       |
| good      | ✅ No warnings, may not use index                |
| fair      | ⚠️  1-2 warnings, needs some optimization       |
| poor      | 🔴 3+ warnings, significant optimization needed |

---

## Example: Before vs After

### Before (No Tags)

```
Span: query (15ms)
├─ jdbc.query[0]: "SELECT * FROM workspace WHERE id = ?"
└─ jdbc.row-count: 1
```

### After (With Query Analysis)

```
Span: query (15ms)
├─ jdbc.query[0]: "SELECT * FROM workspace WHERE id = ?"
├─ jdbc.row-count: 1
├─ db.execution_plan: "SEARCH workspace USING INDEX idx_workspace_id"
├─ db.optimization_score: "excellent"  ✅
└─ (No warnings - perfectly optimized!)
```

### Example with Warnings

```
Span: query (145ms)  🔴 SLOW!
├─ jdbc.query[0]: "SELECT * FROM folder WHERE parent_id IS NULL ORDER BY ordering"
├─ jdbc.row-count: 25
├─ db.execution_plan: "SCAN TABLE folder\nUSE TEMP B-TREE FOR ORDER BY"
├─ db.performance_warnings: "⚠️ Full table scan | 📊 Sort without index"
├─ db.warning.0: "⚠️ Full table scan"
├─ db.warning.1: "📊 Sort without index"
└─ db.optimization_score: "fair"  ⚠️
```

**Suggested Fix**: `CREATE INDEX idx_folder_parent_ordering ON folder(parent_id, ordering)`

---

## Configuration

### Enable/Disable Query Analysis

The `QueryPlanObservationHandler` is automatically enabled as a Spring `@Component`.

To **disable** it, add to `application.yml`:

```yaml
spring:
  autoconfigure:
    exclude:
      - com.scriptmanager.common.config.QueryPlanObservationHandler
```

Or remove the `@Component` annotation from the class.

### Adjust Truncation Limits

In `QueryPlanObservationHandler.kt`, you can adjust:

```kotlin
// Maximum length of execution plan in Jaeger
val truncatedPlan = planInfo.plan.take(500)  // Change 500 to desired length

// Maximum number of individual warnings
if (index < 3) {  // Change 3 to show more/fewer warnings
```

---

## Performance Considerations

### Caching

The `QueryPlanObservationHandler` **caches** query plans using normalized SQL:

- Parameters are replaced with `?` placeholders
- Whitespace is normalized
- Cache is in-memory (ConcurrentHashMap)

This means:

- ✅ First query execution: Gets plan from database
- ✅ Subsequent executions: Uses cached plan (very fast)
- ✅ Different parameter values: Uses same cached plan

### Impact

- **Console logging** (`BetterTreeSpanExporter`): Prints full details, ~5-10ms overhead
- **Jaeger enrichment** (`QueryPlanObservationHandler`): Adds tags, ~1-2ms overhead (cached)
- **Query plan retrieval**: ~10-30ms first time (then cached)

**Recommendation**: Keep both enabled in development, disable console logging in production.

---

## Debugging

### Not Seeing Tags in Jaeger?

**Check 1**: Is the ObservationHandler registered?

Check startup logs for:

```
...ApplicationContext - Refreshing...
...QueryPlanObservationHandler - ...
```

**Check 2**: Enable debug logging

```yaml
logging:
  level:
    com.scriptmanager.common.config.QueryPlanObservationHandler: DEBUG
```

You should see:

```
DEBUG QueryPlanObservationHandler - Enriching query context: SELECT ...
```

**Check 3**: Verify observations are being created

Database queries should create observations automatically via `datasource-micrometer-spring-boot`.

**Check 4**: Test with explicit query

Make a simple GET request that triggers database queries:

```bash
curl http://localhost:7070/workspace
```

Then check Jaeger UI for spans with `db.*` tags.

---

## Limitations

### Why Not All Queries Show Plans?

1. **Framework Queries**: Some internal Spring queries might not trigger observations
2. **Batch Queries**: Batched inserts/updates might have limited analysis
3. **Transactions**: Queries within explicit transactions may be grouped differently

### SQLite-Specific

The execution plan format is **SQLite-specific**. If you migrate to PostgreSQL:

1. Update `executeExplainQuery()` to use `EXPLAIN` (PostgreSQL format)
2. Update `analyzeQueryPlan()` to parse PostgreSQL EXPLAIN output
3. Update warning detection logic for PostgreSQL-specific patterns

---

## Future Enhancements

### Possible Additions

1. **Query Duration Thresholds**
    - Add `db.is_slow: true` tag for queries > 100ms
    - Highlight problematic queries in Jaeger search

2. **Cost Estimation**
    - Parse PostgreSQL EXPLAIN cost values
    - Add `db.estimated_cost` tag

3. **Historical Analysis**
    - Track query performance over time
    - Detect regressions automatically

4. **Smart Recommendations**
    - Generate specific index suggestions
    - Auto-detect missing indexes

5. **Custom Metrics**
    - Export query performance as Prometheus metrics
    - Create Grafana dashboards

---

## Summary

✅ **You now have:**

- Console output with beautiful query analysis
- Jaeger UI showing query details as span tags
- Performance warnings visible in distributed traces
- Query optimization scores for quick assessment
- Cached query plans for minimal performance impact

✅ **You can now:**

- Debug slow queries visually in Jaeger
- Identify missing indexes from trace view
- Compare query performance across requests
- Share traces with team members for analysis
- Monitor production query performance

🎉 **Your observability is now complete!**

