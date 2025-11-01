# 🎯 Manual Backend Launch Guide

## Current Setup

**Auto-start is DISABLED** - You need to launch Spring Boot manually.

---

## 🚀 Launch from IntelliJ

### Method 1: Run Configuration (Recommended)

1. **Open IntelliJ IDEA**
2. **Open the project**: `backend-spring` folder
3. **Find the main class**: `src/main/kotlin/com/scriptmanager/Application.kt`
4. **Right-click** on the file
5. **Select**: "Run 'ApplicationKt'"

✅ Spring Boot will start on port **7070**

### Method 2: Gradle Task

1. **Open IntelliJ IDEA**
2. **Open Gradle panel** (right side)
3. **Navigate to**: `backend-spring > Tasks > application > bootRun`
4. **Double-click** `bootRun`

✅ Spring Boot will start on port **7070**

---

## 🧪 Development Workflow

### Step 1: Start Spring Boot

In IntelliJ:
```
Run 'ApplicationKt' or ./gradlew bootRun
```

Wait for:
```
Started ApplicationKt in X.XXX seconds
```

### Step 2: Verify Backend is Up

```bash
curl http://localhost:7070/health
```

Expected:
```json
{
  "status": "UP",
  "service": "script-manager-backend",
  "timestamp": 1730445123456
}
```

### Step 3: Start Tauri App

```bash
cd src-tauri
cargo tauri dev
```

The loading screen will poll the backend and disappear once it's ready!

---

## 🔄 Hot Reload

### Backend (Spring Boot)
- ✅ Changes to Kotlin files auto-reload (Spring DevTools)
- ✅ No need to restart for most code changes
- ⚠️ Need restart for `application.yml` changes

### Frontend (Tauri)
- ✅ Changes to React files auto-reload (Vite)
- ✅ No restart needed

---

## ⚙️ Re-enable Auto-Start (Optional)

If you want auto-start back, edit `src-tauri/src/main.rs`:

```rust
fn main() {
    shell_script_manager_lib::init_db();
    
    // Uncomment these lines:
    shell_script_manager_lib::start_spring_boot();
    
    shell_script_manager_lib::run();
    
    // Uncomment this too:
    shell_script_manager_lib::shutdown_spring_boot();
}
```

---

## 🐛 Troubleshooting

### Port 7070 already in use

```bash
# Find what's using the port
lsof -ti:7070

# Kill it
kill -9 $(lsof -ti:7070)
```

### Backend won't start in IntelliJ

**Check 1: Java SDK configured?**
- File > Project Structure > Project Settings > Project
- SDK should be Java 17+

**Check 2: Gradle sync**
- Right-click `build.gradle.kts`
- Select "Reload Gradle Project"

**Check 3: Console errors**
- Check the Run panel for error messages

### Frontend stuck on loading screen

The loading screen polls `/health` every second for up to 30 seconds.

**If it's stuck:**
1. Make sure Spring Boot is running
2. Check `http://localhost:7070/health` in browser
3. Check browser console for errors

---

## 📝 IntelliJ Run Configuration (Optional)

For easier access, create a permanent run configuration:

1. **Run > Edit Configurations**
2. **Click +** > **Spring Boot**
3. **Name**: "Backend"
4. **Main class**: `com.scriptmanager.ApplicationKt`
5. **Active profiles**: (leave empty)
6. **Click OK**

Now you can start with **Run > Run 'Backend'** or use the toolbar!

---

## ✅ Benefits of Manual Launch

1. **Better Debugging** - Use IntelliJ's debugger
2. **Hot Reload** - Spring DevTools works better
3. **Console Output** - See logs directly in IntelliJ
4. **Faster Iteration** - No need to restart Tauri app
5. **Separate Control** - Backend and frontend independent

---

## 🎯 Quick Reference

### Start Everything

**Terminal 1 (IntelliJ):**
```
Run 'ApplicationKt'
```

**Terminal 2:**
```bash
cd src-tauri
cargo tauri dev
```

### Stop Everything

- IntelliJ: Click Stop button
- Terminal: `Ctrl+C`

---

**Happy coding!** 🚀

The frontend will automatically detect when the backend is ready!

