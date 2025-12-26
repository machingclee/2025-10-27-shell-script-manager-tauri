# Python FastAPI Integration Guide

This guide shows how to execute Python scripts and run FastAPI servers using the bundled Python runtime in your Tauri app.

## Overview

The bundled Python runtime is located at:

- **Development**: `src-tauri/resources/python-runtime/{arch}/bin/python3.12`
- **Production (macOS .app)**: `{app-bundle}/Contents/Resources/python-runtime/{arch}/bin/python3.12`

Where `{arch}` is either `aarch64` (Apple Silicon) or `x86_64` (Intel).

## Available Tauri Commands

### 1. Get Python Path

```typescript
import { invoke } from "@tauri-apps/api/core";

// Get the path to the bundled Python interpreter
const pythonPath = await invoke<string>("get_python_path");
console.log("Python path:", pythonPath);
// Example output: /Applications/YourApp.app/Contents/Resources/python-runtime/aarch64/bin/python3.12
```

### 2. Execute Python Script (One-time execution)

```typescript
// Execute a Python script and get the output
const output = await invoke<string>("execute_python_script", {
    scriptPath: "/path/to/your/script.py",
    args: ["--port", "8000", "--host", "0.0.0.0"],
});

console.log("Script output:", output);
```

### 3. Start FastAPI Server (Background process)

```typescript
// Start a FastAPI server as a background process
try {
    const result = await invoke<string>("start_python_server", {
        scriptPath: "/path/to/your/fastapi_app.py",
        port: 8000,
    });
    console.log(result); // "Python server started with PID: 12345"
} catch (error) {
    console.error("Failed to start server:", error);
}
```

### 4. Stop FastAPI Server

```typescript
// Stop the running FastAPI server
try {
    const result = await invoke<string>("stop_python_server");
    console.log(result); // "Python server stopped"
} catch (error) {
    console.error("Failed to stop server:", error);
}
```

## Example: FastAPI Server Integration

### 1. Create Your FastAPI App

Create `python-server/main.py`:

```python
from fastapi import FastAPI
import uvicorn
import os

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/data")
def get_data():
    return {"data": [1, 2, 3, 4, 5]}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### 2. Install Dependencies

Make sure FastAPI and uvicorn are in your `python-runtime/requirements.txt`:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
```

Then run the installation script:

```bash
cd src-tauri/resources
sh install_requirments.sh
```

### 3. Create React Hook for Server Management

```typescript
// src/hooks/useFastAPIServer.ts
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useFastAPIServer(scriptPath: string, port: number = 8000) {
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startServer = async () => {
        try {
            const result = await invoke<string>("start_python_server", {
                scriptPath,
                port,
            });
            console.log(result);
            setIsRunning(true);
            setError(null);
        } catch (err) {
            setError(err as string);
            console.error("Failed to start server:", err);
        }
    };

    const stopServer = async () => {
        try {
            const result = await invoke<string>("stop_python_server");
            console.log(result);
            setIsRunning(false);
            setError(null);
        } catch (err) {
            setError(err as string);
            console.error("Failed to stop server:", err);
        }
    };

    // Auto-cleanup on unmount
    useEffect(() => {
        return () => {
            if (isRunning) {
                stopServer();
            }
        };
    }, [isRunning]);

    return { isRunning, error, startServer, stopServer };
}
```

### 4. Use in Your Component

```typescript
// src/components/FastAPIManager.tsx
import { useFastAPIServer } from "@/hooks/useFastAPIServer";
import { Button } from "@/components/ui/button";

export function FastAPIManager() {
  const { isRunning, error, startServer, stopServer } = useFastAPIServer(
    "/path/to/your/python-server/main.py",
    8000
  );

  return (
    <div className="p-4">
      <h2>FastAPI Server</h2>
      <div className="flex gap-2">
        <Button onClick={startServer} disabled={isRunning}>
          Start Server
        </Button>
        <Button onClick={stopServer} disabled={!isRunning}>
          Stop Server
        </Button>
      </div>
      <p>Status: {isRunning ? "Running" : "Stopped"}</p>
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
}
```

### 5. Call the FastAPI from Frontend

```typescript
// After starting the server, you can call it from React
const fetchData = async () => {
    try {
        const response = await fetch("http://localhost:8000/api/data");
        const data = await response.json();
        console.log("Data from FastAPI:", data);
    } catch (error) {
        console.error("Failed to fetch data:", error);
    }
};
```

## Complete Example: Python Script Execution

```typescript
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

export function PythonScriptRunner() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const runScript = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>("execute_python_script", {
        scriptPath: "/path/to/script.py",
        args: ["--verbose"]
      });
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={runScript} disabled={loading}>
        {loading ? "Running..." : "Run Python Script"}
      </button>
      <pre>{output}</pre>
    </div>
  );
}
```

## Getting Script Paths Dynamically

If you need to reference scripts relative to your app:

```typescript
import { resolveResource } from "@tauri-apps/api/path";

// Resolve a script in your resources folder
const scriptPath = await resolveResource("python-backend/my_script.py");

// Use it with execute_python_script
const output = await invoke<string>("execute_python_script", {
    scriptPath,
    args: [],
});
```

## Best Practices

1. **Server Lifecycle**: Always stop the Python server when your app closes or component unmounts
2. **Error Handling**: Wrap all Python invocations in try-catch blocks
3. **Port Management**: Use environment variables or config files for port numbers
4. **Health Checks**: Implement health check endpoints in your FastAPI app
5. **Logging**: Capture stdout/stderr from Python processes for debugging

## Troubleshooting

### "Python binary not found"

- Ensure you've run the bundling script with python-runtime included
- Check that `python-runtime/**/*` is in `tauri.conf.json` resources

### "Failed to start Python server"

- Verify the script path is correct
- Check that required Python packages are installed in the bundled runtime
- Ensure the port is not already in use

### "Permission denied"

- The Python binary might not have execute permissions
- Re-run the `install_requirments.sh` script which sets proper permissions

## Architecture Example

```
Your Tauri App
├── Frontend (React/TypeScript)
│   ├── UI Components
│   └── API calls to FastAPI via fetch/axios
│
├── Rust (Tauri Backend)
│   ├── Tauri Commands (invoke handlers)
│   └── Python Process Management
│
└── Python FastAPI Server
    ├── API Endpoints
    ├── Business Logic
    └── Data Processing
```

This architecture allows you to leverage Python's rich ecosystem (data science, ML, etc.) while maintaining a fast native UI with Tauri.
