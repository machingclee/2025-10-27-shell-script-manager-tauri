# Spring Boot Startup Execution Order

## Full Sequence

```
1. Bean instantiation & constructor injection
2. @PostConstruct methods
3. Full ApplicationContext refresh completes
4. ApplicationRunner / CommandLineRunner beans execute   ← safe for DB work
5. Embedded server starts accepting HTTP requests        ← AFTER runners finish
```

The embedded server (Tomcat/Netty) only opens its port **after** all `ApplicationRunner`s have returned.
This is enforced inside `SpringApplication.run()`:

```
refreshContext()   → wires all beans
afterRefresh()     → ApplicationRunners execute
startedContext()   → server opens port, accepts requests
```

---

## Using ApplicationRunner for DB Initialization

```kotlin
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class TableInitializer(
    private val myRepository: MyRepository
) : ApplicationRunner {

    override fun run(args: ApplicationArguments) {
        myRepository.reinitStatus()
    }
}
```

Use `@Order(Ordered.HIGHEST_PRECEDENCE)` when you have multiple runners and need this one to go first.

---

## Why Repositories Are Safe Inside ApplicationRunner

By the time `run()` is called, the full `ApplicationContext` is refreshed:

| Infrastructure | Status |
|---|---|
| `EntityManagerFactory` | ✅ Initialized |
| `DataSource` connection pool | ✅ Open |
| `@Repository` proxies | ✅ Fully wired |
| Transaction manager | ✅ Ready |

---

## @PostConstruct vs ApplicationRunner

| | `@PostConstruct` | `ApplicationRunner` |
|---|---|---|
| Timing | During bean creation | After full context startup |
| Repositories safe to use | ⚠️ Risky (JPA infra may not be ready) | ✅ Always safe |
| Order control | `@DependsOn` | `@Order(n)` |
| Server accepting requests | ❌ Not yet | ❌ Not yet (both run before) |
| Recommended for DB init | ❌ | ✅ |

**Rule of thumb**: use `@PostConstruct` for pure in-memory initialization; use `ApplicationRunner` for anything touching the database or other fully-wired Spring infrastructure.
