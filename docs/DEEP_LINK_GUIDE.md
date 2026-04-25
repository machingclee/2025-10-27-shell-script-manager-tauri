# Deep Link Guide

Custom URL scheme: `tauri-shellscript-manager://`

Example: `tauri-shellscript-manager://open?scriptId=87`

---

## How It Works (End-to-End)

```
open "tauri-shellscript-manager://open?scriptId=87"
        │
        ▼
macOS LaunchServices
  Looks up registered handler → dispatches Apple Event to the app
        │
        ▼
NSApplicationDelegate  (application:openURLs:)
  Implemented inside TauriAppDelegate (custom Rust delegate in lib.rs)
  Reads NSURL array → extracts URL strings
        │
        ▼
APP_HANDLE.emit("deep-link://new-url", url_strings)
        │
        ▼
JS frontend (App.tsx)
  onOpenUrl() listener receives the URLs
  Parses pathname + query params
  Calls invoke("write_and_open_html", ...) to open the script
```

---

## Setup Checklist

### tauri.conf.json

```json
"plugins": {
    "deep-link": {
        "desktop": {
            "schemes": ["tauri-shellscript-manager"]
        }
    }
}
```

Permission must be present in the `main-window` capability:

```json
"deep-link:default"
```

### Cargo.toml

```toml
tauri-plugin-deep-link = "2"
```

### lib.rs — Plugin must be registered

```rust
.plugin(tauri_plugin_deep_link::init())
```

### lib.rs — Custom delegate MUST implement `application:openURLs:`

This project uses a custom `TauriAppDelegate` (to intercept Cmd+Q via
`applicationShouldTerminate:`). **Replacing the default tao delegate also
removes `application:openURLs:`, which silently drops all deep link events.**

The fix is to add `application:openURLs:` directly to `TauriAppDelegate`:

```rust
extern "C" fn open_urls(_this: &Object, _cmd: Sel, _app: id, urls: id) {
    use cocoa::foundation::NSString;
    let mut url_strings: Vec<String> = Vec::new();
    unsafe {
        let count: usize = msg_send![urls, count];
        for i in 0..count {
            let url: id = msg_send![urls, objectAtIndex: i];
            let ns_string: id = msg_send![url, absoluteString];
            let c_str = NSString::UTF8String(ns_string);
            if let Ok(s) = std::ffi::CStr::from_ptr(c_str).to_str() {
                url_strings.push(s.to_string());
            }
        }
    }
    if let Some(app_handle) = APP_HANDLE.get() {
        let _ = app_handle.emit("deep-link://new-url", url_strings);
    }
}

decl.add_method(
    sel!(application:openURLs:),
    open_urls as extern "C" fn(&Object, Sel, id, id),
);
```

### App.tsx — JS listener

```tsx
onOpenUrl((urls) => {
    for (const url of urls) {
        const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "http://placeholder/");
        const parsed = new URL(withoutScheme);
        if (parsed.pathname === "/open") {
            const scriptId = parseInt(parsed.searchParams.get("scriptId") ?? "", 10);
            if (!isNaN(scriptId)) {
                openMarkdownAsHtml(scriptId);
            }
        }
    }
});
```

---

## Problems Encountered and Fixes

### Problem 1 — LaunchServices database pollution

**Symptom**: `open "tauri-shellscript-manager://..."` does nothing. App doesn't receive the URL.

**Cause**: Every time a `.dmg` is opened (without ejecting), macOS registers
`/Volumes/dmg.xxx/shell-script-manager.app` as an additional URL handler. After
many test builds, 50+ stale entries accumulated. macOS dispatched Apple Events
to those stale, non-existent paths instead of `/Applications/shell-script-manager.app`.

**Fix**:

```bash
# Rebuild the LS database
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -r -domain local -domain system -domain user

# Re-register only the correct app
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "/Applications/shell-script-manager.app"
```

**Prevention**: Always eject the DMG after dragging to Applications. Or install
by copying directly from the build output:

```bash
cp -R src-tauri/target/release/bundle/macos/shell-script-manager.app /Applications/
```

---

### Problem 2 — Custom NSApplicationDelegate swallows URL events (ROOT CAUSE)

**Symptom**: LS database is clean, app is running, `onOpenUrl` listener is
registered — but callback never fires.

**Cause**: `setup_app_delegate()` in `lib.rs` calls `[NSApp setDelegate: TauriAppDelegate]`.
This **completely replaces** tao's default delegate. tao's delegate is the one
that implements `application:openURLs:` to forward deep links into Tauri's
`RunEvent::Opened`. With only `applicationShouldTerminate:` on the custom
delegate, every deep link Apple Event was silently dropped.

**Fix**: Add `application:openURLs:` to `TauriAppDelegate` (see code above).
This emits `deep-link://new-url` directly via `APP_HANDLE`, which is the same
event the plugin would have emitted through tao.

> **Rule of thumb**: Any time you replace the `NSApplicationDelegate` in a
> Tauri app, you must re-implement every method tao relied on, or delegate
> to tao's original delegate via `[super ...]`.

---

### Problem 3 — ACL permission missing

**Symptom**: `getCurrent()` / `onOpenUrl` throws an error like
`"Command get_current_url not found"`.

**Fix**: Add `"deep-link:default"` to the window's permissions in
`tauri.conf.json` under `app.security.capabilities`.

---

## Testing

```bash
# Terminal — bypasses browser confirmation dialog
open "tauri-shellscript-manager://open?scriptId=87"

# Verify LS registration
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -dump 2>/dev/null | grep "tauri-shellscript-manager"

# Check for duplicate stale entries (should show only 1)
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -dump 2>/dev/null | grep "claimed schemes:" | grep "tauri-shellscript-manager" | wc -l
```

When clicking a deep link in a browser (Safari/Chrome), the browser shows a
confirmation dialog — click **Allow/Open**. The terminal `open` command skips
this dialog, making it better for isolated testing.
