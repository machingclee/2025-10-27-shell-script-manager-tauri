import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AppTab,
    openMarkdownTab,
    closeTab,
    setActiveTab,
    HOME_TAB_ID,
} from "./store/slices/appSlice";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { Home, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownEditor from "./app-component/ScriptsColumn/MarkdownEditor";
import MarkdownEditorToolbar from "./app-component/ScriptsColumn/MarkdownEditorToolbar";
import { generateScriptHtml } from "@/lib/generateScriptHtml";
import { getSubwindowPaths } from "@/lib/subwindowPaths";
import { getCurrentWindow } from "@tauri-apps/api/window";
import FolderColumn from "./app-component/FolderColumn/FolderColumn";
import ScriptsColumn from "./app-component/ScriptsColumn/ScriptsColumn";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";
import { appStateApi } from "./store/api/appStateApi";
import { scriptApi } from "./store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import rootFolderSlice from "./store/slices/rootFolderSlice";
import configSlice from "./store/slices/configSlice";
import { folderApi } from "./store/api/folderApi";
import HistoryButton from "./app-component/History/HistoryButton";
import HistoryPanel from "./app-component/History/HistoryPanel";
import QuickNavDropdown from "./app-component/ScriptsColumn/QuickNavDropdown";
import { Toaster } from "./components/ui/toaster";
import AppClosingOverlay from "./components/AppClosingOverlay";
// import AIProfileButton from "./app-component/AIProfile/AIProfileButton";

function TabPill({
    tab,
    isActive,
    onActivate,
    onClose,
    onDetach,
}: {
    tab: AppTab;
    isActive: boolean;
    onActivate: () => void;
    onClose?: () => void;
    onDetach?: () => void;
}) {
    // Track the Y coordinate where the drag began so we can measure how far
    // down the user dragged when the drag ends.
    const dragStartYRef = useRef<number | null>(null);

    // const script = scriptApi.endpoints.getScriptById.useQueryState(tab.scriptId, {
    //     skip: tab.type === "home",
    // }).data;

    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(tab.scriptId, {
        skip: tab.type === "home",
    });

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        dragStartYRef.current = e.clientY;

        // Build an off-screen styled element that the OS uses as the drag image.
        // Because this goes through the browser's native DnD API, the image is
        // rendered by the OS compositor and is visible outside the app window —
        // unlike a DOM ghost div which is clipped to the webview bounds.
        const ghost = document.createElement("div");
        ghost.style.cssText = [
            "position:fixed",
            "top:-9999px",
            "left:-9999px",
            "display:flex",
            "align-items:center",
            "padding:0 12px",
            "height:32px",
            "font-size:12px",
            "border-radius:6px",
            "border:1px solid #525252",
            "background:#262626",
            "color:#fff",
            "white-space:nowrap",
            "box-shadow:0 4px 16px rgba(0,0,0,0.6)",
            "opacity:0.9",
        ].join(";");
        ghost.textContent = tab.type === "home" ? "Home" : (script?.name ?? tab.scriptName);
        document.body.appendChild(ghost);

        // Anchor the drag image at the exact point the user grabbed.
        const rect = e.currentTarget.getBoundingClientRect();
        e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top);
        e.dataTransfer.effectAllowed = "move";

        // The browser captures the image synchronously before the next frame,
        // so it's safe to remove the element immediately after.
        requestAnimationFrame(() => ghost.remove());
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        if (dragStartYRef.current === null) return;
        const deltaY = e.clientY - dragStartYRef.current;
        dragStartYRef.current = null;

        if (deltaY > 80 && onDetach) {
            onDetach();
        } else {
            // Drag ended without crossing the detach threshold — treat as activation.
            onActivate();
        }
    };

    return (
        <div
            draggable={!!onDetach}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={onActivate}
            className={cn(
                "flex items-center gap-1.5 px-3 h-8 text-xs select-none cursor-pointer rounded-t border-t border-l border-r transition-colors",
                isActive
                    ? "bg-neutral-800 text-white border-neutral-600"
                    : "bg-transparent text-neutral-500 border-transparent hover:text-neutral-200 hover:bg-neutral-800/40"
            )}
        >
            {tab.type === "home" ? (
                <Home className="w-3 h-3 flex-shrink-0" />
            ) : (
                <FileText className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="max-w-[140px] truncate">
                {tab.type === "home" ? "Home" : (script?.name ?? tab.scriptName)}
            </span>
            {onClose && (
                <button
                    className="ml-0.5 p-0.5 rounded hover:bg-neutral-600 text-neutral-500 hover:text-white"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    <X className="w-2.5 h-2.5" />
                </button>
            )}
        </div>
    );
}

function App() {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const isHistoryOpen = useAppSelector((s) => s.history.isOpen);

    // -----------------------------------------------------------------------
    // Tab system (state lives in Redux)
    // -----------------------------------------------------------------------
    const tabs = useAppSelector((s) => s.app.tab.tabs);
    const activeTabId = useAppSelector((s) => s.app.tab.activeTabId);

    const openMarkdownTabDispatch = useCallback(
        (scriptId: number, scriptName: string) => {
            dispatch(openMarkdownTab({ scriptId, scriptName }));
        },
        [dispatch]
    );

    const openMarkdownTabRef = useRef(openMarkdownTabDispatch);
    useEffect(() => {
        openMarkdownTabRef.current = openMarkdownTabDispatch;
    }, [openMarkdownTabDispatch]);

    const closeTabDispatch = useCallback(
        (tabId: number) => {
            dispatch(closeTab(tabId));
        },
        [dispatch]
    );

    const detachTab = useCallback(
        (tab: AppTab & { type: "markdown" }) => {
            const windowLabel = `markdown-${tab.scriptId}`;
            const url = getSubwindowPaths.markdown(tab.scriptId, false);
            const webview = new WebviewWindow(windowLabel, {
                url,
                width: 1000,
                height: 700,
                minWidth: 800,
                minHeight: 600,
                skipTaskbar: false,
                alwaysOnTop: false,
                focus: true,
                devtools: true,
                decorations: false,
                hiddenTitle: true,
                transparent: true,
            });
            webview.once("tauri://error", (err) =>
                console.error("Failed to detach markdown tab:", err)
            );
            dispatch(closeTab(tab.scriptId));
        },
        [dispatch]
    );

    const [notifyScriptExecuted] = scriptApi.endpoints.notifyScriptExecuted.useMutation();
    const notifyScriptExecutedRef = useRef(notifyScriptExecuted);
    useEffect(() => {
        notifyScriptExecutedRef.current = notifyScriptExecuted;
    }, [notifyScriptExecuted]);

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
            dispatch(rootFolderSlice.actions.setSelectedRootFolderId(appState.lastOpenedFolderId));
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

    // Bring all subwindows to the front when the main window gains focus
    useEffect(() => {
        const mainWindow = getCurrentWindow();
        const unlisten = mainWindow.onFocusChanged(async ({ payload: focused }) => {
            if (focused) {
                // Use Rust-side orderFront (macOS) so subwindows are raised visually
                // without stealing keyboard focus away from the main window.
                await invoke("raise_subwindows");
            }
        });
        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    // Listen for open-markdown-reference events — open as in-app tab
    useEffect(() => {
        const unlisten = listen<{ scriptId: number; scriptName: string }>(
            "open-markdown-reference",
            ({ payload }) => {
                openMarkdownTabRef.current(payload.scriptId, payload.scriptName);
            }
        );
        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    // Handle QuickNavDropdown actions — open as in-app tab
    useEffect(() => {
        const unlisten = listen<{ scriptId: number; editMode: boolean; scriptName: string }>(
            "quick-nav-open-markdown",
            ({ payload }) => {
                openMarkdownTabRef.current(payload.scriptId, payload.scriptName);
            }
        );
        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    useEffect(() => {
        const unlisten = listen<{ scriptId: number; command: string; showShell: boolean }>(
            "quick-nav-execute-script",
            async ({ payload }) => {
                dispatch(
                    rootFolderSlice.actions.setExecutingScript({
                        script_id: payload.scriptId,
                        loading: true,
                    })
                );
                try {
                    if (payload.showShell) {
                        await invoke("execute_command_in_shell", { command: payload.command });
                    } else {
                        await invoke("execute_command", { command: payload.command });
                    }
                    await notifyScriptExecutedRef.current({ scriptId: payload.scriptId });
                } catch (err) {
                    console.error("Failed to execute script via QuickNav:", err);
                } finally {
                    dispatch(
                        rootFolderSlice.actions.setExecutingScript({
                            script_id: payload.scriptId,
                            loading: false,
                        })
                    );
                }
            }
        );
        return () => {
            unlisten.then((fn) => fn());
        };
    }, [dispatch]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.metaKey && e.altKey && e.key === "i") {
                import("@tauri-apps/api/webviewWindow").then(({ getCurrentWebviewWindow }) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (getCurrentWebviewWindow() as any).openDevtools();
                });
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Handle deep links: tauri-shellscript-manager://open?scriptId=ID
    // Fired when the user clicks a markdown chip in an exported HTML file.
    // Opens the linked script as a new HTML page in the browser.
    useEffect(() => {
        const openMarkdownAsHtml = async (scriptId: number) => {
            console.log("[deep-link] openMarkdownAsHtml called with scriptId:", scriptId);
            try {
                const imagesDir = await invoke<string>("get_images_dir");
                console.log("[deep-link] imagesDir:", imagesDir);
                const html = await generateScriptHtml(scriptId, dispatch, imagesDir);
                console.log("[deep-link] html generated, length:", html.length);
                await invoke("write_and_open_html", { html });
                console.log("[deep-link] write_and_open_html invoked successfully");
            } catch (e) {
                console.error("[deep-link] Failed to open markdown as HTML via deep link:", e);
            }
        };

        const executeScriptById = async (scriptId: number) => {
            console.log("[deep-link] executeScriptById called with scriptId:", scriptId);
            try {
                const result = await dispatch(scriptApi.endpoints.getScriptById.initiate(scriptId));
                const script = result.data;
                if (!script) {
                    console.warn("[deep-link] script not found for id:", scriptId);
                    return;
                }
                dispatch(
                    rootFolderSlice.actions.setExecutingScript({
                        script_id: scriptId,
                        loading: true,
                    })
                );
                try {
                    if (script.showShell) {
                        await invoke("execute_command_in_shell", { command: script.command });
                    } else {
                        await invoke("execute_command", { command: script.command });
                    }
                    await notifyScriptExecutedRef.current({ scriptId });
                } finally {
                    dispatch(
                        rootFolderSlice.actions.setExecutingScript({
                            script_id: scriptId,
                            loading: false,
                        })
                    );
                }
            } catch (e) {
                console.error("[deep-link] Failed to execute script via deep link:", e);
            }
        };

        let cleanup: (() => void) | undefined;

        const handleUrls = (urls: string[]) => {
            console.log("[deep-link] handleUrls called with:", urls);
            for (const url of urls) {
                try {
                    const withoutScheme = url.replace(
                        /^[a-z][a-z0-9+.-]*:\/\//i,
                        "http://placeholder/"
                    );
                    const parsed = new URL(withoutScheme);
                    console.log(
                        "[deep-link] parsed pathname:",
                        parsed.pathname,
                        "scriptId param:",
                        parsed.searchParams.get("scriptId")
                    );
                    if (parsed.pathname === "/open") {
                        const scriptId = parseInt(parsed.searchParams.get("scriptId") ?? "", 10);
                        if (!isNaN(scriptId)) {
                            openMarkdownAsHtml(scriptId);
                        } else {
                            console.warn("[deep-link] scriptId is NaN for url:", url);
                        }
                    } else if (parsed.pathname === "/script") {
                        const scriptId = parseInt(parsed.searchParams.get("scriptId") ?? "", 10);
                        if (!isNaN(scriptId)) {
                            executeScriptById(scriptId);
                        } else {
                            console.warn("[deep-link] scriptId is NaN for url:", url);
                        }
                    } else {
                        console.warn("[deep-link] unexpected pathname:", parsed.pathname);
                    }
                } catch (e) {
                    console.error("[deep-link] Failed to parse deep link URL:", url, e);
                }
            }
        };

        // Handle cold-start deep link (app was not running when the link was clicked)
        getCurrent()
            .then((urls) => {
                console.log("[deep-link] getCurrent() returned:", urls);
                if (urls && urls.length > 0) {
                    handleUrls(urls);
                }
            })
            .catch((e) => console.error("[deep-link] getCurrent() failed:", e));

        onOpenUrl((urls) => {
            console.log("[deep-link] onOpenUrl fired with:", urls);
            handleUrls(urls);
        })
            .then((unlisten) => {
                console.log("[deep-link] onOpenUrl listener registered");
                cleanup = unlisten;
            })
            .catch((e) => console.error("[deep-link] onOpenUrl registration failed:", e));

        return () => {
            cleanup?.();
        };
    }, [dispatch]);

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
                <div className="ml-4 flex gap-2 z-10 items-center">
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
                    <QuickNavDropdown />
                </div>

                {/* Right-side controls */}
                {activeTabId === HOME_TAB_ID && (
                    <div className="flex-1 right-4 z-10 flex items-center gap-2 px-4 justify-end">
                        {/* <AIProfileButton /> */}
                        <HistoryButton />
                    </div>
                )}

                {/* Window title / Markdown toolbar */}
                {activeTabId !== HOME_TAB_ID && (
                    <div className="flex-1 flex items-center h-full ">
                        {activeTabId === HOME_TAB_ID ? (
                            <span className="flex-1 text-center">{selectedFolder?.name}</span>
                        ) : (
                            (() => {
                                const activeTab = tabs.find((t) => t.scriptId === activeTabId);
                                if (!activeTab || activeTab.type !== "markdown") return null;
                                return (
                                    <MarkdownEditorToolbar
                                        scriptId={activeTab.scriptId}
                                        port={backendPort ?? null}
                                    />
                                );
                            })()
                        )}
                    </div>
                )}
            </div>
            {/* Tab bar */}
            <div
                className="flex-shrink-0 flex items-end gap-0.5 px-2 bg-neutral-900 border-b border-neutral-700 overflow-x-auto"
                style={{ height: 36 }}
            >
                {tabs.map((tab) => (
                    <TabPill
                        key={tab.scriptId}
                        tab={tab}
                        isActive={tab.scriptId === activeTabId}
                        onActivate={() => dispatch(setActiveTab(tab.scriptId))}
                        onClose={
                            tab.type !== "home" ? () => closeTabDispatch(tab.scriptId) : undefined
                        }
                        onDetach={
                            tab.type === "markdown"
                                ? () => detachTab(tab as AppTab & { type: "markdown" })
                                : undefined
                        }
                    />
                ))}
            </div>
            {/* Main content */}
            <div className="flex-1 overflow-hidden flex flex-row">
                {activeTabId === HOME_TAB_ID ? (
                    <>
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
                    </>
                ) : (
                    (() => {
                        const activeTab = tabs.find((t) => t.scriptId === activeTabId);
                        if (!activeTab || activeTab.type !== "markdown") return null;
                        return (
                            <MarkdownEditor
                                key={activeTab.scriptId}
                                scriptId={activeTab.scriptId}
                                port={backendPort}
                                embedded={true}
                                onClose={() => closeTabDispatch(activeTab.scriptId)}
                            />
                        );
                    })()
                )}
            </div>
            <Toaster />
            <AppClosingOverlay />
        </div>
    );
}

export default App;
