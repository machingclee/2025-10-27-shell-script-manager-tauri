import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "../store/store";
import MarkdownEditor from "../app-component/ScriptsColumn/MarkdownEditor";
import { appStateApi } from "../store/api/appStateApi";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import configSlice from "../store/slices/configSlice";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "../index.css";
import { StyledEngineProvider } from "@mui/material/styles";
import { openUrl } from "@tauri-apps/plugin-opener";
import clsx from "clsx";

// Intercept all link clicks and open them in the default browser
document.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    e.preventDefault();
    openUrl(href).catch(console.error);
});

// No need to override MonacoEnvironment when using loader.config with paths
// The loader handles the worker paths automatically relative to the 'vs' path

function MarkdownWindowContent() {
    const dispatch = useAppDispatch();
    const [scriptId, setScriptId] = useState<number | undefined>(undefined);
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const [animationStarted, setAnimationStarted] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            console.log("Starting window animation");
            setAnimationStarted(true);
        }, 50);
    }, []);

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
        // Get scriptId and editMode from URL query parameters
        const params = new URLSearchParams(window.location.search);
        const id = params.get("scriptId");
        if (id) {
            setScriptId(parseInt(id, 10));
        }
    }, []);

    // Apply macOS title bar flags for smooth fullscreen transitions.
    // Must run before the window is revealed (html.ready) so any AppKit
    // style-mask changes are invisible to the user.
    useEffect(() => {
        invoke("setup_subwindow_appearance", { label: getCurrentWindow().label }).catch(
            console.error
        );
    }, []);

    // Apply dark mode class to html element, and reveal window only after first paint
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        // Remove dark placeholder bg from #root and reveal the window
        const root = document.getElementById("root");
        if (root) root.style.removeProperty("background");
        document.documentElement.classList.add("ready");
    }, [darkMode]);

    return (
        <div
            className={clsx(
                "h-screen w-screen flex flex-col bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700",
                {
                    "window-fade-in": animationStarted,
                }
            )}
        >
            <div className="flex-1 overflow-hidden">
                {animationStarted && scriptId ? (
                    <MarkdownEditor scriptId={scriptId} port={backendPort} />
                ) : (
                    <div style={{ padding: "20px" }}>Waiting for script ID...</div>
                )}
            </div>
        </div>
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
