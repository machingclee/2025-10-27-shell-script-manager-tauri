import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import dayjs from "dayjs";
import {
    openMarkdownTab,
    closeTab,
    reopenLastClosedTab,
    HOME_TAB_ID,
    setActiveTab,
    setSearchText,
    setSearchMode,
    setSearchTagIds,
    setOpenPopover,
    setRightPanelMode,
    patchTabState,
} from "./store/slices/appSlice";
import { openHistory } from "./store/slices/historySlice";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import MarkdownEditor from "./app-component/ScriptsColumn/MarkdownEditor";
import MarkdownEditorToolbar from "./app-component/ScriptsColumn/MarkdownEditorToolbar";
import { generateScriptHtml } from "@/lib/generateScriptHtml";
import { getCurrentWindow } from "@tauri-apps/api/window";
import FolderColumn from "./app-component/FolderColumn/FolderColumn";
import ScriptsColumn from "./app-component/ScriptsColumn/ScriptsColumn";
import { Search, GripVertical } from "lucide-react";
import { appStateApi } from "./store/api/appStateApi";
import { scriptApi } from "./store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import rootFolderSlice from "./store/slices/rootFolderSlice";
import configSlice from "./store/slices/configSlice";
import HistoryButton from "./app-component/History/HistoryButton";
import HistoryPanel from "./app-component/History/HistoryPanel";
import LogButton from "./app-component/Log/LogButton";
import LogPanel from "./app-component/Log/LogPanel";
import TagButton from "./app-component/Tag/TagButton";
import { TagSelectionProvider } from "./app-component/Tag/tagSelection";
import SearchPanel from "./app-component/History/SearchPanel";
import SearchByTagsDropdown from "./app-component/History/SearchByTagsDropdown";
import SearchTagSuggestions, {
    isTagsCommandPrefix,
    type SearchTagSuggestionsHandle,
} from "./app-component/History/SearchTagSuggestions";
import { Toaster } from "./components/ui/toaster";
import PasteTagReplaceDialog from "./app-component/ScriptsColumn/PasteTagReplaceDialog";
import AppClosingOverlay from "./components/AppClosingOverlay";
import UnsavedChangesDialog from "./components/UnsavedChangesDialog";
import TabBar from "./components/TabBar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { folderApi } from "./store/api/folderApi";

/** Pixel width of the home-screen folder column. Values ≤ 50 are legacy percents. */
const DEFAULT_FOLDER_COLUMN_WIDTH_PX = 280;
const FOLDER_COLUMN_MIN_PX = 0;
const FOLDER_COLUMN_MAX_PX = 800;
const FOLDER_COLUMN_MAX_PERCENT = 50;

/** Shared pixel width of the history, log, and search column. */
const DEFAULT_RIGHT_COLUMN_WIDTH_PX = 350;
const RIGHT_COLUMN_MIN_PX = 200;
const RIGHT_COLUMN_MAX_PX = 800;
const RIGHT_COLUMN_MAX_PERCENT = 70;

function clampFolderColumnPx(px: number, groupWidth: number): number {
    const maxPx = Math.min(FOLDER_COLUMN_MAX_PX, (groupWidth * FOLDER_COLUMN_MAX_PERCENT) / 100);
    return Math.min(maxPx, Math.max(FOLDER_COLUMN_MIN_PX, px));
}

function clampRightColumnPx(px: number, groupWidth: number): number {
    const maxPx = Math.min(RIGHT_COLUMN_MAX_PX, (groupWidth * RIGHT_COLUMN_MAX_PERCENT) / 100);
    const minPx = Math.min(RIGHT_COLUMN_MIN_PX, Math.max(0, maxPx));
    return Math.min(maxPx, Math.max(minPx, px));
}

function resolveFolderColumnPx(saved: number | undefined, groupWidth: number): number {
    if (saved == null || Number.isNaN(saved)) {
        return clampFolderColumnPx(DEFAULT_FOLDER_COLUMN_WIDTH_PX, groupWidth);
    }
    // Pre-pixel persistence stored a 0–50 group percent.
    if (saved > 0 && saved <= FOLDER_COLUMN_MAX_PERCENT) {
        return clampFolderColumnPx((saved / 100) * groupWidth, groupWidth);
    }
    return clampFolderColumnPx(saved, groupWidth);
}

function resolveRightColumnPx(saved: number | undefined, groupWidth: number): number {
    if (saved == null || Number.isNaN(saved)) {
        return clampRightColumnPx(DEFAULT_RIGHT_COLUMN_WIDTH_PX, groupWidth);
    }
    return clampRightColumnPx(saved, groupWidth);
}

function App() {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const isHistoryOpen = useAppSelector((s) => s.history.isOpen);

    // -----------------------------------------------------------------------
    // Search panel state
    // -----------------------------------------------------------------------
    const searchMode = useAppSelector((s) => s.app.rightPanel.search.mode);
    const searchTagIds = useAppSelector((s) => s.app.rightPanel.search.tagIds);
    const rightPanelMode = useAppSelector((s) => s.app.rightPanel.mode);
    const tagPickerOpen = useAppSelector((s) => s.app.openPopover === "search-by-tags");
    const searchFieldRef = useRef<HTMLDivElement>(null);
    const tagSuggestionsRef = useRef<SearchTagSuggestionsHandle>(null);
    const [searchDraft, setSearchDraft] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const tagSuggestionsOpen =
        searchFocused && searchDraft.trim().length > 0 && !tagPickerOpen;

    const clearSearch = () => {
        setSearchDraft("");
        if (searchMode === "tags") return;
        dispatch(setSearchText(""));
        dispatch(setRightPanelMode("HISTORY"));
        dispatch(setActiveTab(HOME_TAB_ID));
    };

    const openTagPicker = () => {
        setSearchDraft("");
        dispatch(setOpenPopover("search-by-tags"));
    };

    const pickSearchTag = (tagId: number) => {
        const next = searchTagIds.includes(tagId) ? searchTagIds : [...searchTagIds, tagId];
        dispatch(setSearchTagIds(next));
        dispatch(setRightPanelMode("SEARCH"));
        dispatch(openHistory());
        returnHome();
        setSearchDraft("");
    };

    const submitContentSearch = () => {
        const value = searchDraft.trim();
        if (!value) return;
        if (isTagsCommandPrefix(value)) {
            openTagPicker();
            return;
        }
        dispatch(setSearchMode("content"));
        dispatch(setSearchText(value));
        dispatch(setRightPanelMode("SEARCH"));
        dispatch(openHistory());
        returnHome();
    };

    const returnHome = useCallback(() => {
        dispatch(setActiveTab(HOME_TAB_ID));
    }, [dispatch]);

    const closeTagSuggestions = useCallback(() => setSearchFocused(false), []);

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

    const tabStates = useAppSelector((s) => s.app.tab.tabStates);
    const [pendingCloseTabId, setPendingCloseTabId] = useState<number | null>(null);

    const requestCloseTab = useCallback(
        (tabId: number) => {
            if (tabStates[tabId]?.hasChanges) {
                setPendingCloseTabId(tabId);
            } else {
                closeTabDispatch(tabId);
            }
        },
        [tabStates, closeTabDispatch]
    );

    const [notifyScriptExecuted] = scriptApi.endpoints.notifyScriptExecuted.useMutation();
    const notifyScriptExecutedRef = useRef(notifyScriptExecuted);
    useEffect(() => {
        notifyScriptExecutedRef.current = notifyScriptExecuted;
    }, [notifyScriptExecuted]);

    const [createMarkdownScript] = scriptApi.endpoints.createMarkdownScript.useMutation();

    const { data: draftFolder } = folderApi.endpoints.getDraftFolder.useQuery(undefined, {
        skip: !backendPort,
    });
    console.log("Draft folder query result:", draftFolder);

    // Cmd+N — create a new dangling draft markdown and open it in a tab
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.metaKey && !e.shiftKey && !e.altKey && e.code === "KeyN") {
                e.preventDefault();

                if (!draftFolder?.id) {
                    console.log("Draft folder query result:", draftFolder);
                    throw new Error("no draft folder Id");
                }
                try {
                    const name = `Markdown ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`;
                    const result = await createMarkdownScript({
                        folderId: draftFolder.id,
                        name,
                        content: "",
                    }).unwrap();
                    if (result?.id) {
                        dispatch(openMarkdownTab({ scriptId: result.id, scriptName: name }));
                        dispatch(
                            patchTabState({
                                tabId: result.id,
                                isDraftNew: true,
                                isEditMode: true,
                                editViewMode: "mixed",
                                editName: name,
                            })
                        );
                    }
                } catch (err) {
                    console.error("[Cmd+N] Failed to create draft markdown:", err);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [dispatch, createMarkdownScript, draftFolder]);

    const closedMarkdownQueue = useAppSelector((s) => s.app.tab.closedMarkdownQueue);
    const closedMarkdownQueueRef = useRef(closedMarkdownQueue);
    useEffect(() => {
        closedMarkdownQueueRef.current = closedMarkdownQueue;
    }, [closedMarkdownQueue]);

    // Cmd+Shift+T — reopen the most recently closed markdown tab
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.shiftKey && e.code === "KeyT") {
                e.preventDefault();
                const queue = closedMarkdownQueueRef.current;
                const last = queue[queue.length - 1];
                if (last) {
                    dispatch(reopenLastClosedTab());
                    notifyScriptExecutedRef.current({ scriptId: last.scriptId });
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [dispatch]);

    // Only fetch when backend port is available
    const { data: appState } = appStateApi.endpoints.getAppState.useQuery(undefined, {
        skip: !backendPort,
    });
    console.log("[App] appState:", appState);
    const { data: appStateData } = appStateApi.endpoints.getAppState.useQueryState();
    const [updateAppState] = appStateApi.endpoints.updateAppState.useMutation();

    const darkMode = appState?.darkMode ?? false;

    const folderSplitRef = useRef<HTMLDivElement>(null);
    const rightSplitRef = useRef<HTMLDivElement>(null);
    const isDraggingFolderRef = useRef(false);
    const isDraggingRightRef = useRef(false);
    const [isDraggingFolder, setIsDraggingFolder] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);
    const [folderColumnPx, setFolderColumnPx] = useState(DEFAULT_FOLDER_COLUMN_WIDTH_PX);
    const [rightColumnPx, setRightColumnPx] = useState(DEFAULT_RIGHT_COLUMN_WIDTH_PX);
    const rightColumnPreferredRef = useRef(DEFAULT_RIGHT_COLUMN_WIDTH_PX);

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

    // Listen for toggle dark mode event from menu
    // Use refs to avoid re-registering the listener on every state change
    const darkModeRef = useRef(darkMode);
    const appStateDataRef = useRef(appStateData);
    const updateAppStateRef = useRef(updateAppState);
    const listenerRegisteredRef = useRef(false);

    const persistFolderColumnWidth = useRef(
        debounce((widthPx: number) => {
            const current = appStateDataRef.current;
            if (!current) return;
            const previous = current.folderColumnWidth;
            if (previous != null && previous > FOLDER_COLUMN_MAX_PERCENT && Math.abs(previous - widthPx) < 1) {
                return;
            }
            updateAppStateRef.current({ ...current, folderColumnWidth: widthPx });
        }, 250)
    ).current;

    useEffect(() => () => persistFolderColumnWidth.cancel(), [persistFolderColumnWidth]);

    const persistRightColumnWidth = useRef(
        debounce((widthPx: number) => {
            const current = appStateDataRef.current;
            if (!current) return;
            const previous = current.rightColumnWidth;
            if (previous != null && Math.abs(previous - widthPx) < 1) return;
            updateAppStateRef.current({ ...current, rightColumnWidth: widthPx });
        }, 250)
    ).current;

    useEffect(() => () => persistRightColumnWidth.cancel(), [persistRightColumnWidth]);

    useEffect(() => {
        if (!appState || isDraggingFolderRef.current) return;
        const groupWidth =
            folderSplitRef.current?.getBoundingClientRect().width || window.innerWidth;
        const resolved = resolveFolderColumnPx(appState.folderColumnWidth, groupWidth);
        setFolderColumnPx((prev) => (Math.abs(prev - resolved) < 1 ? prev : resolved));
        const saved = appState.folderColumnWidth;
        if (saved != null && saved > 0 && saved <= FOLDER_COLUMN_MAX_PERCENT) {
            persistFolderColumnWidth(resolved);
        }
    }, [appState, persistFolderColumnWidth]);

    useEffect(() => {
        if (!appState || isDraggingRightRef.current) return;
        const saved = appState.rightColumnWidth;
        if (saved != null && !Number.isNaN(saved)) {
            rightColumnPreferredRef.current = saved;
        }
        const groupWidth =
            rightSplitRef.current?.getBoundingClientRect().width || window.innerWidth;
        const resolved = resolveRightColumnPx(rightColumnPreferredRef.current, groupWidth);
        setRightColumnPx((prev) => (Math.abs(prev - resolved) < 1 ? prev : resolved));
    }, [appState]);

    useEffect(() => {
        const group = rightSplitRef.current;
        if (!group) return;
        const apply = () => {
            if (isDraggingRightRef.current) return;
            const groupWidth = group.getBoundingClientRect().width;
            if (groupWidth <= 0) return;
            const resolved = resolveRightColumnPx(rightColumnPreferredRef.current, groupWidth);
            setRightColumnPx((prev) => (Math.abs(prev - resolved) < 1 ? prev : resolved));
        };
        const observer = new ResizeObserver(apply);
        observer.observe(group);
        return () => observer.disconnect();
    }, [appState]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingFolderRef.current) return;
            const rect = folderSplitRef.current?.getBoundingClientRect();
            if (!rect || rect.width <= 0) return;
            const next = clampFolderColumnPx(e.clientX - rect.left, rect.width);
            setFolderColumnPx(next);
            persistFolderColumnWidth(next);
        };
        const onUp = () => {
            if (!isDraggingFolderRef.current) return;
            isDraggingFolderRef.current = false;
            setIsDraggingFolder(false);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [persistFolderColumnWidth]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingRightRef.current) return;
            const rect = rightSplitRef.current?.getBoundingClientRect();
            if (!rect || rect.width <= 0) return;
            const next = clampRightColumnPx(rect.right - e.clientX, rect.width);
            rightColumnPreferredRef.current = next;
            setRightColumnPx(next);
            persistRightColumnWidth(next);
        };
        const onUp = () => {
            if (!isDraggingRightRef.current) return;
            isDraggingRightRef.current = false;
            setIsDraggingRight(false);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [persistRightColumnWidth]);

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
                dispatch(
                    scriptApi.endpoints.notifyScriptExecuted.initiate({
                        scriptId: payload.scriptId,
                    })
                );
            }
        );
        return () => {
            unlisten.then((fn) => fn());
        };
    }, [dispatch]);

    // Handle QuickNavDropdown actions — open as in-app tab
    useEffect(() => {
        const unlisten = listen<{ scriptId: number; editMode: boolean; scriptName: string }>(
            "quick-nav-open-markdown",
            ({ payload }) => {
                openMarkdownTabRef.current(payload.scriptId, payload.scriptName);
                dispatch(
                    scriptApi.endpoints.notifyScriptExecuted.initiate({
                        scriptId: payload.scriptId,
                    })
                );
            }
        );
        return () => {
            unlisten.then((fn) => fn());
        };
    }, [dispatch]);

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
    const [isFullscreen, setIsFullscreen] = useState(false);

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
        const win = getCurrentWindow();
        const next = !isFullscreen;
        await win.setFullscreen(next);
        setIsFullscreen(next);
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
        <TagSelectionProvider>
        <div className="h-screen w-screen bg-neutral-100 dark:bg-neutral-800 flex flex-col">
            {/* Custom title bar with window controls */}
            <div
                className="h-14 flex-shrink-0  dark:bg-neutral-800 select-none flex items-center dark:text-white w-full relative z-[200] pointer-events-auto dark:hover:bg-neutral-700/30 transition-colors"
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
                        aria-label="Full Screen"
                    >
                        <span className="hidden group-hover:block text-green-900 text-xs leading-none">
                            {isFullscreen ? "−" : "+"}
                        </span>
                    </button>
                    <div
                        className="flex items-center flex-1 "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <TabBar />
                    </div>
                </div>

                {/* Right-side controls — stay available on markdown tabs and return home */}
                <div className="flex-1 right-4 z-10 flex items-center gap-2 px-4 justify-end">
                    <div
                        ref={searchFieldRef}
                        className="flex h-8 w-48 items-center overflow-hidden rounded-md border border-gray-300 bg-white focus-within:w-72 focus-within:ring-1 focus-within:ring-gray-400 dark:border-neutral-600 dark:bg-neutral-700 dark:focus-within:ring-neutral-500"
                        style={{
                            opacity: searchFocused || rightPanelMode === "SEARCH" ? 1 : 0.5,
                            transition: "opacity 0.2s ease, width 0.3s ease",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Search className="ml-2 w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchDraft}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearchDraft(value);
                                returnHome();
                                if (value.trim() || searchMode === "tags") return;
                                dispatch(setSearchText(""));
                                dispatch(setRightPanelMode("HISTORY"));
                            }}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={(e) => {
                                if (tagSuggestionsRef.current?.contains(e.relatedTarget)) return;
                                setSearchFocused(false);
                            }}
                            onKeyDown={(e) => {
                                if (
                                    (e.key === "ArrowDown" || e.key === "ArrowUp") &&
                                    tagSuggestionsOpen &&
                                    tagSuggestionsRef.current?.hasOption()
                                ) {
                                    e.preventDefault();
                                    if (e.key === "ArrowDown") tagSuggestionsRef.current.selectNext();
                                    else tagSuggestionsRef.current.selectUp();
                                    return;
                                }
                                if (e.key === "Tab" && tagSuggestionsOpen && tagSuggestionsRef.current?.hasOption()) {
                                    const handled = e.shiftKey
                                        ? tagSuggestionsRef.current.selectPrevious()
                                        : tagSuggestionsRef.current.selectNext();
                                    if (handled) e.preventDefault();
                                    return;
                                }
                                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                                e.preventDefault();
                                // A row highlighted with Tab wins over searching the typed text.
                                if (tagSuggestionsOpen && tagSuggestionsRef.current?.chooseActive()) return;
                                submitContentSearch();
                            }}
                            placeholder="/tags for a more refined tag search"
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-white dark:placeholder-neutral-400"
                        />
                        {searchDraft && (
                            <button
                                tabIndex={-1}
                                onClick={clearSearch}
                                className="flex shrink-0 items-center justify-center bg-transparent px-1 text-[18px] text-gray-400 hover:text-gray-600 focus:outline-none dark:text-neutral-400 dark:hover:text-neutral-200"
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <SearchTagSuggestions
                        ref={tagSuggestionsRef}
                        anchorRef={searchFieldRef}
                        query={searchDraft}
                        open={tagSuggestionsOpen}
                        onPickTag={pickSearchTag}
                        onPickCommand={openTagPicker}
                        onClose={closeTagSuggestions}
                    />
                    <SearchByTagsDropdown
                        anchorRef={searchFieldRef}
                        initialTagIds={searchTagIds}
                        onConfirm={(tagIds) => {
                            dispatch(setSearchTagIds(tagIds));
                            dispatch(setRightPanelMode("SEARCH"));
                            dispatch(openHistory());
                            returnHome();
                        }}
                    />
                    <TagButton />
                    <div
                        style={{
                            opacity: rightPanelMode === "LOG" ? 1 : 0.3,
                            transition: "opacity 0.2s ease",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <LogButton />
                    </div>
                    <div
                        style={{
                            opacity: rightPanelMode === "HISTORY" ? 1 : 0.3,
                            transition: "opacity 0.2s ease",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <HistoryButton />
                    </div>
                </div>
            </div>
            {/* Tab bar */}

            {/* Window title / Markdown toolbar */}
            {tabs.some((tab) => tab.type === "markdown" && tab.scriptId === activeTabId) && (
                <div className="flex-shrink-0 flex items-center bg-white dark:bg-neutral-800 border-b border-neutral-800">
                    <MarkdownEditorToolbar
                        scriptId={activeTabId}
                        port={backendPort ?? null}
                    />
                </div>
            )}
            {/* Main content */}
            <div className="flex-1 overflow-hidden flex flex-row">
                {/* Home content - always mounted, hidden when a tab is active */}
                <div
                    className={`flex-1 overflow-hidden flex flex-row ${activeTabId !== HOME_TAB_ID ? "hidden" : ""}`}
                >
                    {appState ? (
                            <div
                                ref={folderSplitRef}
                                className="flex h-full flex-1 min-w-0"
                                style={{
                                    userSelect:
                                        isDraggingFolder || isDraggingRight ? "none" : undefined,
                                }}
                            >
                                <div
                                    className="h-full flex-shrink-0 overflow-hidden"
                                    style={{ width: folderColumnPx }}
                                >
                                    <FolderColumn />
                                </div>
                                <div
                                    className="relative flex w-2 flex-shrink-0 items-center justify-center bg-border hover:bg-blue-200 transition-colors cursor-col-resize"
                                    onMouseDown={(e) => {
                                        if (e.button !== 0) return;
                                        e.preventDefault();
                                        isDraggingFolderRef.current = true;
                                        setIsDraggingFolder(true);
                                        document.body.style.userSelect = "none";
                                        document.body.style.cursor = "col-resize";
                                    }}
                                >
                                    <div className="flex h-10 w-6 items-center justify-center rounded-md border border-gray-300 bg-gray-100 shadow-sm transition-colors hover:bg-gray-200 dark:border-neutral-500 dark:bg-neutral-600 dark:hover:bg-neutral-500">
                                        <GripVertical className="h-4 w-4 text-gray-600 dark:text-neutral-200" />
                                    </div>
                                </div>
                                <div
                                    ref={rightSplitRef}
                                    className="flex h-full min-w-0 flex-1"
                                >
                                    <div className="h-full min-w-0 flex-1 overflow-hidden">
                                        <ScriptsColumn />
                                    </div>
                                    {isHistoryOpen && (
                                        <>
                                            <div
                                                className="relative z-10 flex w-2 flex-shrink-0 items-center justify-center bg-border hover:bg-blue-200 transition-colors cursor-col-resize"
                                                onMouseDown={(e) => {
                                                    if (e.button !== 0) return;
                                                    e.preventDefault();
                                                    isDraggingRightRef.current = true;
                                                    setIsDraggingRight(true);
                                                    document.body.style.userSelect = "none";
                                                    document.body.style.cursor = "col-resize";
                                                }}
                                            >
                                                <div className="flex h-10 w-6 items-center justify-center rounded-md border border-gray-300 bg-gray-100 shadow-sm transition-colors hover:bg-gray-200 dark:border-neutral-500 dark:bg-neutral-600 dark:hover:bg-neutral-500">
                                                    <GripVertical className="h-4 w-4 text-gray-600 dark:text-neutral-200" />
                                                </div>
                                            </div>
                                            <div
                                                className="h-full flex-shrink-0 overflow-hidden animate-panel-in"
                                                style={{ width: rightColumnPx }}
                                            >
                                                <div
                                                    className={`h-full ${rightPanelMode === "SEARCH" ? "" : "hidden"}`}
                                                >
                                                    <SearchPanel />
                                                </div>
                                                <div
                                                    className={`h-full ${rightPanelMode === "HISTORY" ? "" : "hidden"}`}
                                                >
                                                    <HistoryPanel />
                                                </div>
                                                <div
                                                    className={`h-full ${rightPanelMode === "LOG" ? "" : "hidden"}`}
                                                >
                                                    <LogPanel />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                    ) : (
                        <div className="flex-1" />
                    )}
                </div>
                {/* Markdown editors - one per open tab, always mounted while tab exists */}
                {tabs.map((tab) => {
                    if (tab.type !== "markdown") return null;
                    return (
                        <div
                            key={tab.scriptId}
                            className={`flex-1 overflow-hidden ${activeTabId !== tab.scriptId ? "hidden" : ""}`}
                        >
                            <MarkdownEditor
                                scriptId={tab.scriptId}
                                port={backendPort}
                                embedded={true}
                                onClose={() => requestCloseTab(tab.scriptId)}
                            />
                        </div>
                    );
                })}
            </div>
            <Toaster />
            <AppClosingOverlay />
            <UnsavedChangesDialog />
            <PasteTagReplaceDialog />
            <Dialog open={pendingCloseTabId !== null} onOpenChange={() => {}}>
                <DialogContent
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="dark:text-white">Unsaved Changes</DialogTitle>
                        <DialogDescription className="dark:text-neutral-400">
                            This tab has unsaved changes. Close anyway?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingCloseTabId(null)}
                            className="dark:border-neutral-500 dark:text-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                        >
                            Stay
                        </Button>
                        <Button
                            className="bg-red-400/50 text-white hover:bg-red-400/70"
                            onClick={() => {
                                if (pendingCloseTabId !== null) closeTabDispatch(pendingCloseTabId);
                                setPendingCloseTabId(null);
                            }}
                        >
                            Close anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </TagSelectionProvider>
    );
}

export default App;
