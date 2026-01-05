# ✅ OpenTelemetry Tracing Setup - COMPLETE

## 🎉 Status: WORKING

Your application is now successfully sending traces to Jaeger!

---

## 📊 What's Configured

### 1. **Jaeger Backend**

- **UI**: http://localhost:16686
- **OTLP HTTP Endpoint**: http://localhost:4318/v1/traces
- **Status**: ✅ Running in Docker

### 2. **Spring Boot Application**

- **Service Name**: `script-manager-backend`
- **Port**: 7070
- **Status**: ✅ Sending traces to Jaeger

### 3. **Dual Trace Export**

Your application exports traces to **TWO destinations**:

1. **Console Logger** (`BetterTreeSpanExporter`)
    - Beautiful tree-formatted traces in your terminal
    - Shows SQL queries with execution plans
    - Detects N+1 query problems
    - Performance warnings

2. **Jaeger** (OTLP HTTP Exporter)
    - Visual trace timeline
    - Distributed tracing UI
    - Service dependency graphs
    - Historical trace search

---

## 🔧 Configuration Files

### `application.yml`

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # 100% sampling (adjust for production)
  otlp:
    tracing:
      endpoint: "http://localhost:4318/v1/traces"
```

### `build.gradle.kts` (Key Dependencies)

```kotlin
// Spring Boot Actuator (required for OTLP auto-configuration)
implementation("org.springframework.boot:spring-boot-starter-actuator")

// Micrometer Tracing with OpenTelemetry
implementation("io.micrometer:micrometer-tracing-bridge-otel")
implementation("io.opentelemetry:opentelemetry-exporter-otlp")

// For database query tracing
implementation("net.ttddyy.observation:datasource-micrometer-spring-boot:1.0.3")
```

### `TraceConfig.kt`

- Custom `BetterTreeSpanExporter` for console output
- Works alongside OTLP exporter automatically
- No conflicts with Spring Boot auto-configuration

---

## 🎯 How to View Traces

### Method 1: Jaeger UI (Recommended)

1. **Open Jaeger Search Page**: http://localhost:16686/search

   ⚠️ **Important**: The main URL http://localhost:16686 might show a blank page or redirect.
   Always use the `/search` path directly.

2. **Search for Traces**:
    - Service: Select `script-manager-backend` from dropdown
    - Operation: (Optional) Select specific operation like `GET /workspace`
    - Lookback: Set to "Last Hour" or "Last 15 minutes"
    - Click **Find Traces** button

3. **View Details**:
    - Click on any trace in the results to see the timeline
    - Expand spans to see:
        - HTTP request details
        - Database queries
        - Query execution time
        - Service dependencies

**Quick Test URL**:

```
http://localhost:16686/search?service=script-manager-backend&limit=20&lookback=1h
```

### Method 2: Console Logs

Just watch your terminal when the application processes requests. You'll see:

```
══════════════════════════════════════════════════════════════
📊 TRACE: 1234567890abcdef
══════════════════════════════════════════════════════════════
🟢 🌐 GET /workspace (45ms)
  🟢   🔌 connection (2ms)
  🟢     📝 query (8ms)
        FROM workspace...
        → 3 rows
  🟢     📝 query (12ms)
        FROM folder...
        → 15 rows
──────────────────────────────────────────────────────────────
📝 QUERIES & EXECUTION PLANS:
...
```

---

## 🧪 Testing the Setup

### 1. Make a Test Request

```bash
curl http://localhost:7070/workspace
```

### 2. Check Console

You should see formatted trace output immediately

### 3. Check Jaeger

- Go to http://localhost:16686/search
- Select service: `script-manager-backend`
- Set lookback: "Last Hour"
- Click "Find Traces"
- You should see your request

### 4. Verify Service is Registered

```bash
curl -s "http://localhost:16686/api/services" | jq .
```

Expected output:

```json
{
  "data": [
    "jaeger-all-in-one",
    "script-manager-backend"
  ],
  "total": 2
}
```

---

## 🔍 What Gets Traced

Spring Boot automatically traces:

✅ **HTTP Requests**

- Request method, path, headers
- Response status, duration
- Client IP, user agent

✅ **Database Operations**

- SQL queries (via `datasource-micrometer`)
- Connection pool usage
- Query execution time
- Rows affected/returned

✅ **Service Dependencies**

- External API calls
- Microservice interactions

✅ **Custom Spans**

- You can add custom spans using `@NewSpan` or `Tracer` API

---

## 🎨 Jaeger UI Features

### Trace Timeline View

- Visual representation of request flow
- See which operations are slow
- Identify bottlenecks

### Service Graph

- Visualize service dependencies
- See call patterns
- Identify failure points

### Trace Comparison

- Compare similar requests
- Find performance regressions
- A/B test analysis

---

## 🚀 Production Recommendations

### 1. **Adjust Sampling Rate**

```yaml
management:
  tracing:
    sampling:
      probability: 0.1  # Only trace 10% of requests
```

### 2. **Disable Console Exporter**

Comment out the `betterTreeSpanExporter` bean in production:

```kotlin
// @Bean
// fun betterTreeSpanExporter(): SpanExporter {
//     return BetterTreeSpanExporter(dataSource)
// }
```

### 3. **Use Remote Jaeger**

Point to production Jaeger collector:

```yaml
management:
  otlp:
    tracing:
      endpoint: "https://jaeger-collector.production.com/v1/traces"
```

### 4. **Add Resource Attributes**

Identify your application instance:

```yaml
management:
  tracing:
    baggage:
      correlation:
        enabled: true
      remote-fields: [ "x-request-id" ]
```

---

## 🐛 Troubleshooting

### Issue: Jaeger UI shows blank page

**Problem**: Going to http://localhost:16686 or http://localhost:16686/monitor shows nothing.

**Solution**: Jaeger's main page doesn't exist by default. Always use the search page:

```
http://localhost:16686/search
```

Or use the quick search URL with your service:

```
http://localhost:16686/search?service=script-manager-backend&limit=20&lookback=1h
```

### Issue: No traces in Jaeger

**Check 1**: Is Jaeger running?

```bash
docker ps | grep jaeger
```

**Check 2**: Can you reach OTLP endpoint?

```bash
curl -v http://localhost:4318/v1/traces
```

**Check 3**: Enable debug logging

```yaml
logging:
  level:
    io.opentelemetry: DEBUG
    io.micrometer.tracing: DEBUG
```

**Check 4**: Verify service registration

```bash
curl "http://localhost:16686/api/services"
```

### Issue: Console traces work but Jaeger doesn't

This was your original issue! It was caused by:

- Custom `OpenTelemetryConfig` creating a duplicate `otlpHttpSpanExporter` bean
- Conflicting with Spring Boot's auto-configuration

**Solution**: Removed the custom config and let Spring Boot handle it.

---

## 📚 Key Learnings

1. **Spring Boot 3.2+ has built-in OTLP support**
    - No need to manually create OTLP exporter beans
    - Just set `management.otlp.tracing.endpoint`

2. **Multiple exporters work together**
    - Custom exporters (console logger) and OTLP coexist
    - Spring Boot creates a composite exporter automatically

3. **Actuator is required**
    - `spring-boot-starter-actuator` enables tracing auto-configuration

4. **Micrometer bridges OpenTelemetry**
    - `micrometer-tracing-bridge-otel` connects Spring to OTEL
    - Provides consistent API across different tracing backends

---

## 🎓 Next Steps

### Learn More About Tracing

1. **Add Custom Spans**
   ```kotlin
   @NewSpan("myCustomOperation")
   fun doSomething() {
       // Your code
   }
   ```

2. **Add Span Attributes**
   ```kotlin
   @SpanTag("userId")
   fun processUser(userId: String) {
       // Your code
   }
   ```

3. **Manual Tracing**
   ```kotlin
   @Autowired
   private lateinit var tracer: Tracer
   
   fun complexOperation() {
       val span = tracer.nextSpan().name("my-operation").start()
       try {
           // Your code
           span.tag("key", "value")
       } finally {
           span.end()
       }
   }
   ```

### Integrate with Other Tools

- **Prometheus**: Already configured via actuator
- **Grafana**: Visualize Jaeger traces alongside metrics
- **Loki**: Correlate logs with traces
- **Zipkin**: Alternative to Jaeger (just change dependency)

---

## ✅ Verification Checklist

- [x] Jaeger running on port 16686
- [x] Application sending traces to Jaeger
- [x] Service `script-manager-backend` visible in Jaeger UI
- [x] Traces searchable and viewable
- [x] Console logs show formatted traces
- [x] Database queries are traced
- [x] No bean conflicts or errors

---

## 🎉 Success!

Your distributed tracing setup is complete and working perfectly!

**What you have now:**

- Full observability of your Spring Boot application
- Visual trace timelines in Jaeger
- Beautiful console output for development
- Database query performance monitoring
- Foundation for production monitoring

**You can now:**

- Debug performance issues visually
- Identify slow database queries
- Detect N+1 query problems
- Monitor service health
- Troubleshoot production issues with distributed context

**Congratulations! 🚀**

