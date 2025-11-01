# Quick Reference - Production Build

## 🚀 Quick Commands

### Development (Unchanged)
```bash
yarn dev
```

### Production Build (One Command)
```bash
./build-production.sh
```

### Manual Production Steps
```bash
# 1. Build JAR
cd backend-spring && ./gradlew bootJar

# 2. Download JRE (first time only)
./download-jre.sh

# 3. Build Tauri app
cd .. && yarn tauri build
```

## 📁 Important Files

| File | Purpose |
|------|---------|
| `build-production.sh` | One-command production build |
| `backend-spring/download-jre.sh` | Downloads JRE for macOS/Linux |
| `backend-spring/download-jre.ps1` | Downloads JRE for Windows |
| `PRODUCTION_BUILD_GUIDE.md` | Complete documentation |
| `SETUP_COMPLETE_SUMMARY.md` | Setup overview |

## 🔧 Configuration

### Database Paths
- **Dev**: `src-tauri/database.db`
- **Prod**: `~/Library/Application Support/com.chingcheonglee.shell-script-manager/database.db`

### Spring Boot Configuration
Location: `backend-spring/src/main/kotlin/com/scriptmanager/config/DatabaseConfig.kt`

Priority order:
1. Command-line: `--spring.datasource.url`
2. Environment: `DB_PATH`
3. Default: Development path

### Rust Launch Code
Location: `src-tauri/src/lib.rs` - `start_spring_boot_backend()` function

## 🎯 Build Output

Find your app here after running `./build-production.sh`:

- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `.appimage/`

## ⚙️ What's Bundled

✅ Tauri App (Rust)  
✅ React Frontend  
✅ Spring Boot JAR  
✅ Java Runtime (Amazon Corretto 17)  
✅ Database Schema  

**Total Size**: ~150-200 MB

**User Requirements**: NONE! No Java needed.

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Java not found" during build | Install Java 17+: `brew install openjdk@17` |
| "JAR not found" | Run `cd backend-spring && ./gradlew bootJar` |
| "JRE not found" | Run `cd backend-spring && ./download-jre.sh` |
| Backend won't start in production | Check console logs, verify port 7070 is free |
| Database errors | Check app data directory permissions |

## 📚 Documentation

- **Full Guide**: `PRODUCTION_BUILD_GUIDE.md`
- **Setup Summary**: `SETUP_COMPLETE_SUMMARY.md`
- **Development Docs**: `docs/` folder

## ⚡ Testing Production Build

```bash
# Build
./build-production.sh

# Install (macOS)
open src-tauri/target/release/bundle/dmg/*.dmg

# Test without system Java
# (Remove Java from PATH temporarily to verify bundled JRE works)
```

## 🎉 Key Features

- **Self-contained**: No Java installation needed
- **Cross-platform**: Works on macOS, Windows, Linux
- **One-command build**: `./build-production.sh`
- **Smart paths**: Dev vs Prod database locations
- **Auto-startup**: Spring Boot launches automatically
- **Proper cleanup**: Backend shuts down with app

---

**Next Step**: Install Java 17+, then run `./build-production.sh`

