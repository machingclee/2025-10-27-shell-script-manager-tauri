import "./App.css";
import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import FolderColumn from "./app-component/FolderColumn/FolderColumn";
import ScriptsColumn from "./app-component/ScriptsColumn/ScriptsColumn";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import { appStateApi } from "./store/api/appStateApi";
import { scriptApi } from "./store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import folderSlice from "./store/slices/folderSlice";
import configSlice from "./store/slices/configSlice";
import { folderApi } from "./store/api/folderApi";
import HistoryButton from "./app-component/History/HistoryButton";
import HistoryPanel from "./app-component/History/HistoryPanel";
import { Toaster } from "./components/ui/toaster";
import AppClosingOverlay from "./components/AppClosingOverlay";

function App() {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const isHistoryOpen = useAppSelector((s) => s.history.isOpen);

    // Only fetch when backend port is available
    const { data: appState } = appStateApi.endpoints.getAppState.useQuery(undefined, {
        skip: !backendPort,
    });
    console.log("[App] appState:", appState);
    const { data: appStateData } = appStateApi.endpoints.getAppState.useQueryState();
    const [updateAppState] = appStateApi.endpoints.updateAppState.useMutation();

    const darkMode = appState?.darkMode ?? false;

    // Fetch backend port on mount (only in production, dev uses default 7070)
    useEffect(() => {
        if (!import.meta.env.DEV) {
            const fetchBackendPort = async () => {
                try {
                    const port = await invoke<number>("get_backend_port");
                    dispatch(configSlice.actions.setBackendPort(port)); // Save to Redux
                    console.log("Backend running on port:", port);
                } catch (error) {
                    console.error("Failed to get backend port:", error);
                }
            };
            fetchBackendPort();
        }
    }, [dispatch]);

    // Load the last opened folder on app start
    useEffect(() => {
        if (appState?.lastOpenedFolderId) {
            dispatch(folderSlice.actions.setSelectedFolderId(appState.lastOpenedFolderId));
        }
    }, [appState, dispatch]);

    const selectedFolderId = useAppSelector((s) => s.folder.selectedRootFolderId);
    const { data: selectedFolder } = folderApi.endpoints.getAllFolders.useQueryState(undefined, {
        selectFromResult: (result) => ({
            data: result.data?.find((f) => f.id === selectedFolderId),
        }),
        skip: !selectedFolderId,
    });

    // Listen for toggle dark mode event from menu
    // Use refs to avoid re-registering the listener on every state change
    const darkModeRef = useRef(darkMode);
    const appStateDataRef = useRef(appStateData);
    const updateAppStateRef = useRef(updateAppState);
    const listenerRegisteredRef = useRef(false);

    // Keep refs up to date
    useEffect(() => {
        darkModeRef.current = darkMode;
        appStateDataRef.current = appStateData;
        updateAppStateRef.current = updateAppState;
    }, [darkMode, appStateData, updateAppState]);

    // Register listener only ONCE on mount (with ref guard against StrictMode double-mount)
    useEffect(() => {
        // Guard against double registration in React StrictMode
        if (listenerRegisteredRef.current) {
            return;
        }

        listenerRegisteredRef.current = true;
        console.log("[App] Registering toggle-dark-mode listener");

        const unlisten = listen("toggle-dark-mode", () => {
            console.log("[App] toggle-dark-mode event received");
            const newDarkMode = !darkModeRef.current;
            if (appStateDataRef.current) {
                // Dark mode is applied automatically by the mutation's onQueryStarted
                updateAppStateRef.current({ ...appStateDataRef.current, darkMode: newDarkMode });
            }
        });

        return () => {
            console.log("[App] Unregistering toggle-dark-mode listener");
            unlisten.then((fn) => fn());
            listenerRegisteredRef.current = false;
        };
    }, []); // Empty deps - only register once!

    // Listen for markdown updates from subwindows and invalidate cache
    useEffect(() => {
        const unlisten = listen<{ scriptId: number }>("markdown-updated", ({ payload }) => {
            console.log("[App] Markdown updated, invalidating cache for script:", payload.scriptId);
            dispatch(
                scriptApi.util.invalidateTags([
                    { type: "Script", id: payload.scriptId },
                    { type: "FolderContent" },
                ])
            );
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [dispatch]);

    const [isMaximized, setIsMaximized] = useState(false);

    const handleDragStart = (e: React.MouseEvent) => {
        // Only trigger on left click
        if (e.button !== 0) return;

        const window = getCurrentWindow();
        window.startDragging().catch((err) => {
            console.error("Failed to start dragging:", err);
        });
    };

    const handleMinimize = async () => {
        const window = getCurrentWindow();
        await window.minimize();
    };

    const handleMaximize = async () => {
        const window = getCurrentWindow();
        await window.toggleMaximize();
        setIsMaximized(!isMaximized);
    };

    const handleClose = async () => {
        const window = getCurrentWindow();
        await window.close();
    };

    const handleDoubleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const window = getCurrentWindow();
        await window.toggleMaximize();
        setIsMaximized(!isMaximized);
    };

    return (
        <div className="h-screen w-screen bg-neutral-100 dark:bg-neutral-800 flex flex-col">
            {/* Custom title bar with window controls */}
            <div
                className="h-12 flex-shrink-0 bg-transparent select-none dark:bg-[rgba(255,255,255,0.05)] flex items-center dark:text-white w-full relative z-[200] pointer-events-auto"
                onMouseDown={handleDragStart}
                onDoubleClick={handleDoubleClick}
            >
                {/* Window control buttons (macOS style) */}
                <div className="absolute left-4 flex gap-2 z-10 items-center">
                    <button
                        onClick={handleClose}
                        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group"
                        aria-label="Close"
                    >
                        <span className="hidden group-hover:block text-red-900 text-xs leading-none">
                            ×
                        </span>
                    </button>
                    <button
                        onClick={handleMinimize}
                        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group"
                        aria-label="Minimize"
                    >
                        <span className="hidden group-hover:block text-yellow-900 text-xs leading-none">
                            −
                        </span>
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group"
                        aria-label="Maximize"
                    >
                        <span className="hidden group-hover:block text-green-900 text-xs leading-none">
                            {isMaximized ? "−" : "+"}
                        </span>
                    </button>
                </div>

                {/* History button (right side) */}
                <div className="absolute right-4 z-10">
                    <HistoryButton />
                </div>

                {/* Window title (centered) */}
                <div className="flex-1 flex items-center justify-center">
                    {selectedFolder?.name}
                </div>
            </div>
            {/* Main content */}
            <div className="flex-1 overflow-hidden flex flex-row">
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={25} minSize={25} maxSize={50}>
                        <FolderColumn />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={75}>
                        <ScriptsColumn />
                    </ResizablePanel>
                </ResizablePanelGroup>
                {isHistoryOpen && (
                    <div className="w-[350px] flex-shrink-0 border-l border-gray-200 dark:border-neutral-700">
                        <HistoryPanel />
                    </div>
                )}
            </div>
            <Toaster />
            <AppClosingOverlay />
        </div>
    );
}

export default App;
