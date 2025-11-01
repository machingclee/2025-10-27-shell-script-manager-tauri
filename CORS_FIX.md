# ✅ CORS Issue Fixed

## Problem

```
Fetch API cannot load http://localhost:7070/api/folders
due to access control checks.
```

This is a **CORS (Cross-Origin Resource Sharing)** error that occurs when your frontend (Tauri app) tries to access the Spring Boot backend on a different origin.

---

## Solution

### Added CORS Configuration

**File**: `backend-spring/src/main/kotlin/com/scriptmanager/config/CorsConfig.kt`

```kotlin
@Configuration
class CorsConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/**")
            .allowedOriginPatterns("*")  // Allow all origins
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600)
    }
}
```

This configuration:

- ✅ Allows all origins (development mode)
- ✅ Allows all HTTP methods
- ✅ Allows all headers
- ✅ Enables credentials
- ✅ Caches preflight requests for 1 hour

---

## How to Apply

### Step 1: Restart Spring Boot

In IntelliJ:

1. **Stop** the current running instance
2. **Run** 'ApplicationKt' again

Or from terminal:

```bash
cd backend-spring
./gradlew bootRun
```

### Step 2: Verify CORS Headers

```bash
curl -H "Origin: http://localhost:1420" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v \
     http://localhost:7070/api/folders
```

Should see:

```
< Access-Control-Allow-Origin: http://localhost:1420
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< Access-Control-Allow-Headers: *
```

### Step 3: Test in Your App

```bash
cd src-tauri
cargo tauri dev
```

The CORS error should be gone! ✅

---

## Understanding CORS

### What is CORS?

CORS is a browser security feature that blocks requests from one origin to another unless the server explicitly allows it.

### Your Origins

- **Frontend**: `tauri://localhost` or `http://localhost:1420` (Tauri)
- **Backend**: `http://localhost:7070` (Spring Boot)

Since these are different origins, CORS kicks in!

### Why It Happens

1. Browser sends **preflight request** (OPTIONS)
2. Browser checks if server allows the frontend origin
3. If not allowed → CORS error
4. If allowed → Actual request proceeds

---

## Development vs Production

### Current Setup (Development)

```kotlin
.allowedOriginPatterns("*")  // Allows ALL origins
```

✅ Good for development
⚠️ **NOT secure for production**

### Production Setup (Future)

When deploying, change to specific origins:

```kotlin
@Configuration
class CorsConfig : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/**")
            .allowedOrigins(
                "tauri://localhost",
                "https://tauri.localhost"
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
            .allowedHeaders("*")
            .allowCredentials(true)
    }
}
```

---

## Troubleshooting

### Still getting CORS error after restart?

**Check 1: Spring Boot restarted?**

```bash
curl http://localhost:7070/health
# Should return {"status":"UP",...}
```

**Check 2: Browser cache**

- Clear browser cache
- Or use incognito mode
- Or hard refresh (Cmd+Shift+R)

**Check 3: Check Spring Boot logs**
Look for:

```
Mapped "{[/**],methods=[GET || POST || ...],origins=[*]}"
```

### CORS working but request still fails?

Check the actual error in browser console:

- Network tab → Click the failed request
- Look at Response tab for actual error

---

## Testing CORS

### Test with curl

```bash
# GET request
curl -H "Origin: http://localhost:1420" \
     http://localhost:7070/api/folders

# Should work and include Access-Control headers
```

### Test in Browser Console

```javascript
fetch("http://localhost:7070/api/folders", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
})
  .then((r) => r.json())
  .then((d) => console.log(d))
  .catch((e) => console.error(e));
```

Should work without errors!

---

## Common CORS Errors

### "No 'Access-Control-Allow-Origin' header"

**Cause**: CORS not configured on backend

**Solution**: Add CorsConfig.kt (already done!)

### "CORS policy: credentials mode is 'include'"

**Cause**: Using credentials without `allowCredentials: true`

**Solution**: Already included in config ✅

### "Not allowed by Access-Control-Allow-Headers"

**Cause**: Trying to send header not in allowed list

**Solution**: We allow `*` (all headers) ✅

---

## Summary

✅ **CORS is now configured**

- All origins allowed (development)
- All methods allowed
- All headers allowed
- Credentials enabled

✅ **What to do**

1. Restart Spring Boot
2. Test your app
3. CORS errors should be gone!

✅ **Remember for production**

- Change `allowedOriginPatterns("*")` to specific origins
- Test thoroughly before deploying

---

**Questions?** Check Spring Boot console for CORS-related logs!

Happy coding! 🚀
