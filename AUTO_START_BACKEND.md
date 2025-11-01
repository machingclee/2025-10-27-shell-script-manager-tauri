# Auto-Start Spring Boot Backend

## 🎯 Overview

Your Tauri app now **automatically starts Spring Boot** when it launches and shows a loading screen until the backend is ready!

---

## ✅ What Was Implemented

### 1. Spring Boot Health Endpoint

**Location**: `backend-spring/src/main/kotlin/com/scriptmanager/controller/HealthController.kt`

```kotlin
@RestController
@RequestMapping("/health")
class HealthController {
    @GetMapping
    fun health(): Map<String, Any> {
        return mapOf(
            "status" to "UP",
            "service" to "script-manager-backend",
            "timestamp" to System.currentTimeMillis()
        )
    }
}
```

**Endpoint**: `http://localhost:7070/health`

### 2. Rust Auto-Launch System

**Location**: `src-tauri/src/lib.rs` and `src-tauri/src/main.rs`

The Rust backend now:

- ✅ Launches Spring Boot with `./gradlew bootRun` on app startup
- ✅ Stores the process handle for cleanup
- ✅ Provides `check_backend_health()` Tauri command
- ✅ Shuts down Spring Boot when app closes

### 3. React Health Check Hook

**Location**: `src/hooks/useBackendHealth.ts`

Custom hook that:

- ✅ Polls backend health every second
- ✅ Tracks connection attempts (max 30 seconds)
- ✅ Returns ready status to components

### 4. Loading Splash Screen

**Location**: `src/components/BackendLoadingScreen.tsx`

Beautiful loading screen that:

- ✅ Shows animated spinner while backend starts
- ✅ Displays progress (attempts counter)
- ✅ Shows error state if backend fails
- ✅ Provides retry button

---

## 🚀 How It Works

### Startup Sequence

```
1. User launches Tauri app
   ↓
2. Rust initializes database
   ↓
3. Rust launches Spring Boot (./gradlew bootRun)
   ↓
4. Frontend shows loading screen
   ↓
5. Frontend polls /health every second
   ↓
6. Backend responds "UP"
   ↓
7. Loading screen disappears
   ↓
8. App is ready! ✅
```

### Shutdown Sequence

```
1. User closes app
   ↓
2. Rust receives shutdown signal
   ↓
3. Rust kills Spring Boot process
   ↓
4. App exits cleanly
```

---

## 📁 Files Modified/Created

### Created

- ✅ `backend-spring/src/main/kotlin/com/scriptmanager/controller/HealthController.kt`
- ✅ `src/hooks/useBackendHealth.ts`
- ✅ `src/components/BackendLoadingScreen.tsx`
- ✅ `AUTO_START_BACKEND.md` (this file)

### Modified

- ✅ `src-tauri/src/lib.rs` - Added Spring Boot launcher and health check
- ✅ `src-tauri/src/main.rs` - Call start_spring_boot() on init
- ✅ `src-tauri/Cargo.toml` - Added reqwest dependency
- ✅ `src/main.tsx` - Wrapped App with BackendLoadingScreen
- ✅ `backend-spring/src/main/resources/application.yml` - Port changed to 7070

---

## 🎨 User Experience

### Loading State (0-30 seconds)

```
┌─────────────────────────────┐
│                             │
│       ⟳ (spinning)          │
│                             │
│   Starting Backend Server   │
│      5 / 30 attempts        │
│                             │
│  This may take a few        │
│  moments on first launch    │
│                             │
└─────────────────────────────┘
```

### Error State (if failed)

```
┌─────────────────────────────┐
│                             │
│      ✖ (error icon)         │
│                             │
│  Backend Failed to Start    │
│                             │
│  Please ensure:             │
│  • Java 17+ is installed    │
│  • Port 7070 is available   │
│  • Check console for errors │
│                             │
│     [  Retry  ]             │
│                             │
└─────────────────────────────┘
```

### Ready State

```
Your normal app interface loads!
```

---

## 🧪 Testing

### Test 1: Normal Startup

```bash
# Terminal 1: Build and run
cd src-tauri
cargo tauri dev
```

**Expected:**

1. App window opens with loading screen
2. Console shows: "Starting Spring Boot from: ..."
3. Console shows: "Spring Boot started with PID: ..."
4. After 5-15 seconds: Loading screen disappears
5. App interface appears

### Test 2: Backend Health Check

```bash
# While app is running, in another terminal:
curl http://localhost:7070/health
```

**Expected Response:**

```json
{
  "status": "UP",
  "service": "script-manager-backend",
  "timestamp": 1730445123456
}
```

### Test 3: Manual Health Check (from Frontend)

Open browser console and run:

```javascript
await window.__TAURI__.core.invoke("check_backend_health");
// Should return: true
```

### Test 4: Backend Failure Simulation

```bash
# Start app normally, then quickly:
kill -9 $(lsof -ti:7070)
```

**Expected:**

- Loading screen shows error state
- "Retry" button appears
- Clicking retry reloads app

---

## 🔧 Configuration

### Change Backend Port

1. **Spring Boot** - Edit `backend-spring/src/main/resources/application.yml`:

```yaml
server:
  port: 7070 # Change this
```

2. **Rust** - Edit `src-tauri/src/lib.rs`:

```rust
match client.get("http://localhost:7070/health").send().await {
                        // Change this ↑
```

3. **Update everywhere** you make HTTP calls to Spring Boot

### Change Timeout/Retry Settings

Edit `src/hooks/useBackendHealth.ts`:

```typescript
const maxAttempts = 30; // 30 seconds
// Change this to increase/decrease timeout
```

Change polling interval:

```typescript
const interval = setInterval(checkHealth, 1000); // 1 second
// Change this to poll more/less frequently
```

---

## 🐛 Troubleshooting

### "Backend Failed to Start"

**Cause 1: Java not installed**

```bash
# Check Java version
java -version
# Should be 17 or higher
```

**Solution:** Install Java 17+

```bash
# macOS
brew install openjdk@17

# Verify
java -version
```

**Cause 2: Port 7070 in use**

```bash
# Check what's using port 7070
lsof -ti:7070
```

**Solution:** Kill the process or change the port

**Cause 3: Gradlew not executable**

```bash
# Make gradlew executable
cd backend-spring
chmod +x gradlew
```

### Loading Screen Stuck

**Check Console:**

```bash
# Look for errors in terminal where you ran cargo tauri dev
```

**Common Issues:**

- Spring Boot compilation errors
- Database connection issues
- Missing dependencies

**Quick Fix:**

```bash
# Manually test Spring Boot
cd backend-spring
./gradlew bootRun

# If this works, restart the Tauri app
```

### Backend Starts But Health Check Fails

**Check the health endpoint manually:**

```bash
curl http://localhost:7070/health
```

**If it works manually but not from app:**

- Check CORS settings (should be fine for localhost)
- Check firewall settings
- Verify reqwest is installed: `grep reqwest src-tauri/Cargo.toml`

---

## 📊 Performance Notes

### Startup Time

- **First Launch**: 10-20 seconds (Spring Boot needs to compile)
- **Subsequent Launches**: 5-10 seconds (compiled already)
- **Production Build**: 3-5 seconds (pre-built JAR)

### Resource Usage

- **Spring Boot**: ~200-300MB RAM
- **Tauri App**: ~50-100MB RAM
- **Total**: ~300-400MB RAM

---

## 🎯 Benefits

1. **Zero Manual Setup** - Users don't need to start backend manually
2. **Clean UX** - Loading state prevents errors during startup
3. **Automatic Cleanup** - Backend shuts down with app
4. **Error Handling** - Clear feedback if something goes wrong
5. **Single Command** - Just run `cargo tauri dev` and everything starts

---

## 🔄 Development Workflow

### Option 1: Normal Development (Auto-start)

```bash
# Everything starts automatically
cd src-tauri
cargo tauri dev
```

### Option 2: Manual Control (for backend development)

```bash
# Terminal 1: Backend only
cd backend-spring
./gradlew bootRun

# Terminal 2: Frontend only (comment out spring boot start in main.rs)
cd src-tauri
cargo tauri dev
```

---

## 📝 Future Enhancements

Potential improvements:

- [ ] Progress bar showing Spring Boot compilation
- [ ] Streaming logs from Spring Boot to frontend
- [ ] Restart backend button (without restarting whole app)
- [ ] Backend settings in UI (change port, etc.)
- [ ] Production mode with embedded JRE
- [ ] Auto-update backend JAR

---

## 🎊 Summary

Your app now:
✅ Auto-starts Spring Boot on launch  
✅ Shows beautiful loading screen  
✅ Polls health until ready  
✅ Handles errors gracefully  
✅ Cleans up on exit

**Just run `cargo tauri dev` and everything works!** 🚀

---

**Questions?** Check the troubleshooting section or the backend/frontend code comments.
