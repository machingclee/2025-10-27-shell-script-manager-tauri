# Offline Monaco Editor in Tauri Subwindows

This guide documents the configuration required to run Monaco Editor completely offline within a Tauri v2 application, specifically addressing issues with loading web workers in nested subwindows.

## The Challenge

When using Monaco Editor in a Tauri application, especially in secondary windows (subwindows), you may encounter the following issues:

1.  **"Loading..." Infinite Loop**: The editor never initializes because it cannot find the web worker files.
2.  **Path Resolution**: Tauri's custom protocol (`tauri://` or `http://tauri.localhost`) combined with nested file structures (e.g., `src/subwindows/`) breaks the default relative path resolution for workers.
3.  **Offline Requirement**: Loading Monaco from a CDN (the default behavior of `@monaco-editor/react`) is not suitable for offline desktop apps and can be blocked by CSP.

## The Solution

To solve these issues, we implemented a fully offline solution using `vite-plugin-monaco-editor` and manual worker path configuration.

### 1. Vite Configuration (`vite.config.ts`)

We use `vite-plugin-monaco-editor` to bundle the Monaco web workers during the build process. This ensures all necessary files are available locally.

```typescript
import monacoEditorPlugin from "vite-plugin-monaco-editor";

export default defineConfig({
    plugins: [
        // ... other plugins
        // Cast to any to avoid type issues with ESM/CJS interop
        (monacoEditorPlugin as any).default({
            languageWorkers: ["editorWorkerService"], // Add other workers if needed (e.g., 'json', 'css')
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    monaco: ["monaco-editor"],
                    // ...
                },
            },
        },
    },
});
```

### 2. Component Configuration (`MarkdownEditor.tsx`)

We configure the `@monaco-editor/react` loader to use the installed `monaco-editor` package instead of fetching it from a CDN.

```tsx
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Configure Monaco to use local instance
loader.config({ monaco });

export default function MarkdownEditor() {
    // ...
}
```

### 3. Subwindow Worker Path Override (`markdown-window-entry.tsx`)

This is the critical fix for subwindows. By default, Monaco tries to resolve workers relative to the current HTML file. For a subwindow located at `src/subwindows/window.html`, it looks in `src/subwindows/`. However, the Vite plugin outputs workers to the root `dist/monacoeditorwork/`.

We must override `MonacoEnvironment.getWorkerUrl` in the subwindow's entry point to point to the correct location relative to the subwindow HTML.

```tsx
// src/subwindows/markdown-window-entry.tsx

// Override the MonacoEnvironment to fix the worker path in the subwindow
if (!import.meta.env.DEV) {
    (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, _label: string) {
            // Navigate up two levels from /subwindows/ to root, then into monacoeditorwork
            return "../../monacoeditorwork/editor.worker.bundle.js";
        },
    };
}
```

## Tauri Configuration & Permissions

### Content Security Policy (CSP)

To allow Monaco Editor to load workers and styles, your `tauri.conf.json` must have a compatible CSP.

```json
"security": {
    "csp": "default-src 'self' tauri: http://tauri.localhost; ... worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; ..."
}
```

- `worker-src 'self' blob:`: Required because Monaco creates web workers, sometimes using blobs.
- `style-src 'self' 'unsafe-inline'`: Required because Monaco injects styles dynamically.

### Backend Synchronization

While not strictly required for Monaco to load, our implementation waits for the backend to be ready before mounting the editor to ensure data availability.

1.  **Backend Port**: We wait for the Spring Boot backend to start and report its port.
2.  **Health Check**: We use a `useBackendHealth` hook to verify the backend is responsive.
3.  **Data Fetching**: Once ready, we fetch the script content using `scriptApi`.

```tsx
// Example usage in window entry
const { isBackendReady } = useBackendHealth();

if (!isBackendReady) {
    return <BackendLoadingScreen />;
}

return <MarkdownEditor scriptId={scriptId} />;
```

## Summary of Files Changed

- `package.json`: Added `vite-plugin-monaco-editor`.
- `vite.config.ts`: Added plugin configuration.
- `src/app-component/ScriptsColumn/MarkdownEditor.tsx`: Configured local loader.
- `src/subwindows/markdown-window-entry.tsx`: Added `MonacoEnvironment` override.
