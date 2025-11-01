# Production Build Guide

This guide explains how to create a production build of the Shell Script Manager application that bundles everything users need, including the Java Runtime Environment (JRE).

## Overview

The production build process:

1. Builds the Spring Boot backend as an executable JAR
2. Downloads and bundles a JRE (Amazon Corretto 17)
3. Configures the database path for production
4. Builds the Tauri application with all resources embedded
5. Creates platform-specific installers (DMG for macOS, MSI for Windows)

## Prerequisites

- Node.js and Yarn
- Rust and Cargo
- Gradle (included as `gradlew`)
- Internet connection (to download JRE)
- macOS: Xcode Command Line Tools
- Windows: Visual Studio Build Tools

## Quick Start

Run the automated build script:

```bash
./build-production.sh
```

This will handle all steps automatically. Your application bundle will be in:

- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/`
- Linux: `src-tauri/target/release/bundle/deb/` or `src-tauri/target/release/bundle/appimage/`

## Manual Build Steps

If you prefer to build manually or need to troubleshoot, follow these steps:

### Step 1: Build Spring Boot JAR

```bash
cd backend-spring
./gradlew clean bootJar
```

The JAR will be created at: `backend-spring/build/libs/script-manager-backend-0.0.1-SNAPSHOT.jar`

**Note**: The `bootJar` task creates an executable JAR with all dependencies embedded.

### Step 2: Download JRE

#### macOS/Linux:

```bash
cd backend-spring
./download-jre.sh
```

#### Windows:

```powershell
cd backend-spring
.\download-jre.ps1
```

This downloads Amazon Corretto 17 JRE for your platform and extracts it to `backend-spring/jre/`.

**JRE Details:**

- **Provider**: Amazon Corretto (free, production-ready)
- **Version**: Java 17 (LTS)
- **Size**: ~50-80 MB (varies by platform)
- **License**: GPL v2 with Classpath Exception (free to redistribute)

### Step 3: Prepare Tauri Resources

Create the resources directory structure:

```bash
mkdir -p src-tauri/resources/backend-spring
```

Copy the JAR:

```bash
cp backend-spring/build/libs/*.jar src-tauri/resources/backend-spring/app.jar
```

Copy the JRE:

```bash
cp -R backend-spring/jre src-tauri/resources/backend-spring/jre
```

### Step 4: Build Frontend

```bash
yarn build
```

### Step 5: Build Tauri Application

```bash
yarn tauri build
```

This creates platform-specific installers with the JAR and JRE embedded.

## Configuration Details

### Database Path Configuration

The application uses different database paths based on the environment:

| Environment     | Path                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development** | `src-tauri/database.db` (project directory)                                                                                                                                                                                                              |
| **Production**  | `~/Library/Application Support/com.chingcheonglee.shell-script-manager/database.db` (macOS)<br>`%APPDATA%\com.chingcheonglee.shell-script-manager\database.db` (Windows)<br>`~/.local/share/com.chingcheonglee.shell-script-manager/database.db` (Linux) |

This is handled automatically by the `DatabaseConfig.kt` Spring Boot configuration class, which:

1. First checks for command-line argument `--spring.datasource.url`
2. Falls back to `DB_PATH` environment variable
3. Finally uses the default development path

### How the Backend is Launched

#### Development Mode:

```bash
./gradlew bootRun --args="--spring.datasource.url=jdbc:sqlite:/path/to/database.db"
```

#### Production Mode:

```bash
./jre/Contents/Home/bin/java -jar app.jar --spring.datasource.url=jdbc:sqlite:/path/to/database.db
```

The Rust code in `src-tauri/src/lib.rs` automatically detects the mode and launches accordingly.

## Platform-Specific Notes

### macOS

**JRE Path in Bundle:**

- Intel: Uses x64 JRE
- Apple Silicon: Uses ARM64 JRE
- Java executable: `backend-spring/jre/Contents/Home/bin/java`

**Signing and Notarization:**
For distribution outside the App Store, you'll need to sign and notarize your app:

1. Get an Apple Developer certificate
2. Configure in `src-tauri/tauri.conf.json`:
   ```json
   "bundle": {
     "macOS": {
       "signingIdentity": "Developer ID Application: Your Name",
       "providerShortName": "TEAM_ID"
     }
   }
   ```

### Windows

**JRE Path in Bundle:**

- Uses x64 JRE
- Java executable: `backend-spring\jre\bin\java.exe`

**Requirements:**

- Visual Studio Build Tools for linking
- WiX Toolset 3.11+ for MSI creation (auto-installed by Tauri)

### Linux

**JRE Path in Bundle:**

- Uses x64 or ARM64 JRE based on architecture
- Java executable: `backend-spring/jre/bin/java`

**Supported Formats:**

- DEB (Debian/Ubuntu)
- AppImage (universal)
- RPM (Fedora/RHEL) - requires `rpmbuild`

## Troubleshooting

### "Could not find JAR file"

**Solution:**

```bash
cd backend-spring
./gradlew clean bootJar
```

Ensure the JAR exists at `backend-spring/build/libs/*.jar`

### "Java executable not found"

**Solution:**
Run the JRE download script again:

```bash
cd backend-spring
./download-jre.sh  # or download-jre.ps1 on Windows
```

### "Failed to start Spring Boot backend"

**Symptoms:** App opens but shows connection errors

**Solution:**

1. Check console logs in development mode
2. Verify database path is writable
3. Ensure port 7070 is not in use
4. Check Spring Boot logs (if accessible)

### Database initialization fails

**Solution:**
The database is automatically created by Prisma on first run. If it fails:

1. Check the database directory exists and is writable
2. In development: Delete `src-tauri/database.db` and restart
3. In production: Delete the database in the app data directory

### Build fails on macOS

**Error:** `xcrun: error: unable to find utility "metal"`

**Solution:**

```bash
xcode-select --install
```

### Build fails on Windows

**Error:** `error: linker 'link.exe' not found`

**Solution:**
Install Visual Studio Build Tools with C++ support.

## File Size Expectations

Typical bundle sizes:

- **macOS DMG**: 150-200 MB
  - Frontend: ~5 MB
  - Spring Boot JAR: ~50 MB
  - JRE: ~80 MB
  - Tauri runtime: ~10 MB
- **Windows MSI**: 120-170 MB
  - Similar breakdown to macOS

- **Linux AppImage**: 140-190 MB

## Optimizing Bundle Size

### 1. Use jlink to create minimal JRE

Instead of downloading the full JRE, create a custom one:

```bash
jlink --add-modules java.base,java.sql,java.desktop,java.management,java.naming \
      --output backend-spring/jre \
      --strip-debug \
      --no-header-files \
      --no-man-pages \
      --compress=2
```

This can reduce JRE size from ~80MB to ~30MB.

### 2. Exclude unnecessary Spring Boot dependencies

Review `build.gradle.kts` and remove unused starters.

### 3. Enable Tauri's tree-shaking

In `tauri.conf.json`:

```json
{
  "build": {
    "withGlobalTauri": false
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Production

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install dependencies
        run: yarn install

      - name: Build production
        run: ./build-production.sh
        shell: bash

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: app-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/
```

## Testing the Production Build

### macOS:

```bash
./build-production.sh
open src-tauri/target/release/bundle/dmg/*.dmg
```

### Windows:

```powershell
.\build-production.sh
start src-tauri\target\release\bundle\msi\*.msi
```

### Verifying JRE is Used

After installing, check that the app doesn't require system Java:

1. Ensure Java is NOT in your system PATH
2. Launch the app
3. It should start successfully using the bundled JRE

## Next Steps

After building:

1. Test the installer on a clean system (no Java installed)
2. Verify database persistence across app restarts
3. Test all features in production mode
4. Set up code signing (for macOS/Windows)
5. Create release notes and distribute

## Additional Resources

- [Tauri Bundle Documentation](https://tauri.app/v1/guides/building/)
- [Spring Boot Executable JAR](https://docs.spring.io/spring-boot/docs/current/reference/html/executable-jar.html)
- [Amazon Corretto Downloads](https://aws.amazon.com/corretto/)
- [macOS Code Signing](https://developer.apple.com/documentation/xcode/notarizing_macos_software_before_distribution)
