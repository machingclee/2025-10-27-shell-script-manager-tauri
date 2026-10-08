import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export type BackendStartupStatus = {
    healthy: boolean;
    port: number | null;
    processStatus: string;
    lastError: string | null;
    logs: string[];
};

const EMPTY_STATUS: BackendStartupStatus = {
    healthy: false,
    port: import.meta.env.DEV ? 7070 : null,
    processStatus: "checking...",
    lastError: null,
    logs: [],
};

/**
 * Polls the Rust side's view of the backend. Unlike a one-shot startup check,
 * this never stops: the dot in the status bar stays live, and a crash restart
 * surfaces here as a new `port` the rest of the app has to adopt.
 */
export function useBackendHealth() {
    const [isBackendReady, setIsBackendReady] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [checkAttempts, setCheckAttempts] = useState(0);
    const [status, setStatus] = useState<BackendStartupStatus>(EMPTY_STATUS);
    const maxAttempts = 60; // Show extra troubleshooting after 60 seconds

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            try {
                const next = await invoke<BackendStartupStatus>("get_backend_startup_status");
                if (cancelled) return;

                setStatus(next);
                if (next.healthy) {
                    setIsBackendReady(true);
                    setIsChecking(false);
                } else {
                    setCheckAttempts((prev) => prev + 1);
                }
            } catch (error) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : String(error);
                console.error("[useBackendHealth] Error checking health:", error);
                setStatus((prev) => ({
                    ...prev,
                    healthy: false,
                    lastError: message,
                    logs: [...prev.logs, `invoke error: ${message}`].slice(-300),
                }));
                setCheckAttempts((prev) => prev + 1);
            }
        };

        poll();
        const interval = setInterval(poll, 3000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return {
        isBackendReady,
        isChecking,
        checkAttempts,
        maxAttempts,
        backendPort: status.port,
        backendHealthy: status.healthy,
        processStatus: status.processStatus,
        lastError: status.lastError,
        logs: status.logs,
    };
}
