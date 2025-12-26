import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../store/store";
import MarkdownEditor from "../app-component/ScriptsColumn/MarkdownEditor";
import { appStateApi } from "../store/api/appStateApi";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import configSlice from "../store/slices/configSlice";
import { invoke } from "@tauri-apps/api/core";
import "../index.css";
import { StyledEngineProvider } from "@mui/material/styles";

// No need to override MonacoEnvironment when using loader.config with paths
// The loader handles the worker paths automatically relative to the 'vs' path

function MarkdownWindowContent() {
    const dispatch = useAppDispatch();
    const [scriptId, setScriptId] = useState<number | undefined>(undefined);
    const backendPort = useAppSelector((s) => s.config.backendPort);

    // Fetch backend port on mount (only in production, dev uses default 7070)
    useEffect(() => {
        if (!import.meta.env.DEV) {
            const fetchBackendPort = async () => {
                try {
                    const port = await invoke<number>("get_backend_port");
                    dispatch(configSlice.actions.setBackendPort(port));
                } catch (error) {
                    console.error("[Markdown Window] Failed to get backend port:", error);
                }
            };
            fetchBackendPort();
        }
    }, [dispatch]);

    // Fetch app state to get dark mode setting
    const { data: appState } = appStateApi.endpoints.getAppState.useQuery(undefined, {
        skip: !backendPort,
    });

    const darkMode = appState?.darkMode ?? false;

    useEffect(() => {
        // Get scriptId from URL query parameter
        const params = new URLSearchParams(window.location.search);
        const id = params.get("scriptId");
        if (id) {
            setScriptId(parseInt(id, 10));
        }
    }, []);

    // Apply dark mode class to html element
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [darkMode]);

    return (
        <>
            {scriptId ? (
                <MarkdownEditor scriptId={scriptId} />
            ) : (
                <div style={{ padding: "20px" }}>Waiting for script ID...</div>
            )}
        </>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <Provider store={store}>
                <MarkdownWindowContent />
            </Provider>
        </StyledEngineProvider>
    </React.StrictMode>
);
