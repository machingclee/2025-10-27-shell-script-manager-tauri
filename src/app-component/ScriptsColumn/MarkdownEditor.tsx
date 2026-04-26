import React from "react";
import { scriptApi } from "@/store/api/scriptApi";
import { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import QuickNavDropdown from "./QuickNavDropdown";
import MarkdownEditorToolbar from "./MarkdownEditorToolbar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    patchTabState,
    patchEditorState,
    patchPreviewerState,
    setFontSize,
} from "@/store/slices/appSlice";
import type { MarkdownTabState } from "@/store/slices/appSlice";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { useMarkdownShortcuts } from "@/hooks/useMarkdownShortcuts";
import MarkdownCodeEditor from "./MarkdownCodeEditor";
import MarkdownPreviewer from "./MarkdownPreviewer";

const BASE_FONT_SIZE = 18;

export default function MarkdownEditor({
    port,
    scriptId,
    embedded = false,
    onClose,
}: {
    port?: number;
    scriptId: number | undefined;
    /** When true, hides traffic-light buttons and disables window drag (for in-app tab use). */
    embedded?: boolean;
    /** Called on Cmd+W when embedded; ignored in subwindow mode. */
    onClose?: () => void;
}) {
    const dispatch = useAppDispatch();

    // Saved state from the last time this tab was active (keyed by tab id)
    const tabId = scriptId!;
    const savedState = useAppSelector((s) => s.app.tab.tabStates[tabId]);
    const savedEditorState = useAppSelector((s) => s.app.tab.editor[String(tabId)]);
    const savedPreviewerState = useAppSelector((s) => s.app.tab.previewer[String(tabId)]);

    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: !(scriptId != null) || port === 0,
    });

    // Read editMode from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const editModeFromUrl = urlParams.get("editMode") === "true";

    const [isFullscreen, setIsFullscreen] = useState(false);
    // ─── Redux-backed tab state (live-synced; survives tab switches) ─────────
    const ts = savedState; // shorthand; undefined on first open
    const editName: string = ts?.editName ?? "";
    const splitRatio: number = ts?.splitRatio ?? 50;
    const editViewMode: "plain" | "mixed" | "preview" =
        ts?.editViewMode ?? (editModeFromUrl ? "mixed" : "preview");
    // fontSize is an integer px value; zoom ratio is derived locally only where needed.
    const fontSize: number = useAppSelector((s) => s.app.tab.fontSize);
    /** Dispatch a partial update for this tab's persisted state. */
    const patch = useCallback(
        (partial: Partial<MarkdownTabState>) => dispatch(patchTabState({ tabId, ...partial })),
        [dispatch, tabId]
    );
    // ─────────────────────────────────────────────────────────────────────────
    // editContent stays local — hot path; persisted to Redux (editor slice) on unmount.
    const [editContent, setEditContent] = useState(
        ts?.hasChanges ? (savedEditorState?.editContent ?? "") : ""
    );
    // Start editorReady=true when we have unsaved edits to restore, so the seeding
    // useEffect doesn't overwrite editContent with the server's script.command.
    const [editorReady, setEditorReady] = useState(() => ts?.hasChanges ?? false);
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    // Fade-in when the tab is mounted (i.e. every time the user switches to this tab).
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 1);
        return () => clearTimeout(t);
    }, []);

    const latestContentRef = useRef(
        savedState?.hasChanges ? (savedEditorState?.editContent ?? "") : ""
    );
    const handleSaveEditRef = useRef<((closeEditMode?: boolean) => Promise<void>) | null>(null);
    // useState (not useRef) so that when get_images_dir resolves it triggers a
    // re-render and the img renderer picks up the real path — otherwise images
    // stay broken on remount (e.g. after switching tabs and returning).
    const [imagesDir, setImagesDir] = useState<string | null>(null);
    const isDraggingRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);

    // Preview search open/close controlled here; query + results live in MarkdownPreviewer
    const [previewSearchOpen, setPreviewSearchOpen] = useState(false);
    const previewSearchInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        invoke<string>("get_images_dir").then((dir) => {
            setImagesDir(dir);
        });
    }, []);

    // ─── Tab state persistence ───────────────────────────────────────────────
    // On unmount we flush editContent (hot-path local state) + scroll positions
    // (DOM values that can't be live-synced to Redux).
    const dispatchRef = useRef(dispatch);
    dispatchRef.current = dispatch;
    // ⚠️ Must be useLayoutEffect — useEffect cleanup runs AFTER React nulls out DOM refs,
    // so editorWrapperRef.current and previewBoxRef.current would already be null.
    useLayoutEffect(() => {
        return () => {
            const previewScroll = previewBoxRef.current?.scrollTop ?? 0;
            dispatchRef.current(
                patchEditorState({
                    tabId,
                    editContent: latestContentRef.current,
                    editorScrollTop: monacoEditorRef.current?.getScrollTop() ?? 0,
                })
            );
            dispatchRef.current(
                patchPreviewerState({
                    tabId,
                    previewScrollTop: previewScroll,
                })
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refs holding saved scroll positions — read by handleEditorMount (editor) and the
    // effect below (preview). Initialised once; handleEditorMount is stable so .current
    // is read at call-time, which is always after the value is set.
    const savedEditorScrollRef = useRef(savedEditorState?.editorScrollTop ?? 0);
    const savedPreviewScrollRef = useRef(savedPreviewerState?.previewScrollTop ?? 0);
    // Restore preview scroll once — triggered when editorReady becomes true (i.e. content
    // has been seeded and the preview DOM is likely populated).
    const hasRestoredPreviewScrollRef = useRef(false);
    useEffect(() => {
        if (hasRestoredPreviewScrollRef.current || !editorReady) return;
        const savedPreview = savedPreviewScrollRef.current;
        if (!savedPreview) {
            hasRestoredPreviewScrollRef.current = true;
            return;
        }
        hasRestoredPreviewScrollRef.current = true;
        let raf2 = -1;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                const previewEl = previewBoxRef.current;
                if (previewEl) previewEl.scrollTop = savedPreview;
            });
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorReady]);
    // ─────────────────────────────────────────────────────────────────────────

    // Split-pane drag handling
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const pct = (e.clientX / window.innerWidth) * 100;
            patch({ splitRatio: Math.min(80, Math.max(20, pct)) });
        };
        const onUp = () => {
            isDraggingRef.current = false;
            setIsDragging(false);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    // Undo/redo is handled natively by Monaco. pushHistory is kept as a no-op
    // so call sites compile without changes (Monaco tracks its own history).
    const pushHistory = useCallback((_content: string) => {
        // no-op: Monaco has built-in undo/redo
    }, []);

    // Initialize editName when script loads (first time or when switching scripts)
    useEffect(() => {
        if (script && !ts?.editName) {
            patch({ editName: script.name || "" });
        }
    }, [script, ts?.editName, patch]);

    // Debounce-sync editContent to editor Redux slice so the toolbar component can read it for saving.
    // Also debounce update previewContent in tabStates for the previewer.
    useEffect(() => {
        const t = setTimeout(() => {
            dispatch(patchEditorState({ tabId, editContent }));
            patch({ previewContent: editContent });
        }, 150);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editContent]);

    const handleSaveEdit = useCallback(async () => {
        if (!script) return;

        await updateMarkdown({
            ...script,
            name: editName,
            command: editContent,
        }).unwrap();

        patch({ hasChanges: false, edited: true });
        setTimeout(() => dispatch(patchTabState({ tabId, edited: false })), 2000);

        dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));
        await emit("markdown-updated", { scriptId: script.id });
    }, [script, editName, editContent, updateMarkdown, dispatch, patch, tabId]);

    // Keep ref updated with latest handleSaveEdit
    useEffect(() => {
        handleSaveEditRef.current = handleSaveEdit;
    }, [handleSaveEdit]);

    // Shared window-level keyboard shortcuts
    useMarkdownShortcuts({
        onSave: () => {
            handleSaveEdit();
        },
        onClose: () => {
            if (embedded) {
                onClose?.();
            } else {
                // Drive the close from Rust via invoke so WKWebView teardown happens
                // entirely outside the JS event-handler stack — prevents SIGSEGV on macOS.
                invoke("close_subwindow", { label: getCurrentWindow().label });
            }
        },
        onFind: () => {
            // Trigger Monaco's built-in find widget for the editor
            monacoEditorRef.current?.trigger("", "actions.find", null);
            // Also open preview search when the preview is visible
            if (editViewMode === "mixed" || editViewMode === "preview") {
                setPreviewSearchOpen(true);
            }
        },
        onEscape: () => {
            setPreviewSearchOpen(false);
        },
        onZoomIn: () => dispatch(setFontSize(Math.min(fontSize + 4, 40))),
        onZoomOut: () => dispatch(setFontSize(Math.max(fontSize - 4, 8))),
        onZoomReset: () => dispatch(setFontSize(BASE_FONT_SIZE)),
        onToggleView: () =>
            patch({ editViewMode: editViewMode === "preview" ? "mixed" : "preview" }),
    });

    const handleCheckboxToggle = useCallback(
        (checkboxIndex: number) => {
            const content = latestContentRef.current;
            const lines = content.split("\n");

            let currentCheckboxIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                const match = lines[i].match(/^(\s*-\s+)\[([ xX])\](.*)$/);
                if (match) {
                    if (currentCheckboxIndex === checkboxIndex) {
                        const isChecked = match[2].toLowerCase() === "x";
                        lines[i] = `${match[1]}[${isChecked ? " " : "x"}]${match[3]}`;
                        break;
                    }
                    currentCheckboxIndex++;
                }
            }

            const updatedContent = lines.join("\n");
            latestContentRef.current = updatedContent;

            // Keep the editor state in sync so the mixed-mode preview re-renders immediately
            setEditContent(updatedContent);
            // Immediately commit to previewContent so the previewer re-renders without debounce delay.
            dispatch(patchEditorState({ tabId, editContent: updatedContent }));
            patch({ previewContent: updatedContent, hasChanges: true, edited: false });
            pushHistory(updatedContent);
        },
        [dispatch, tabId, patch, pushHistory]
    );

    const handleImageWidthChange = useCallback(
        (cleanPath: string, newWidth: number) => {
            const escaped = cleanPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const updated = latestContentRef.current.replace(
                new RegExp(`(!\\[[^\\]]*\\]\\(${escaped})(?:\\?width=\\d+)?(\\))`, "g"),
                `$1?width=${newWidth}$2`
            );
            latestContentRef.current = updated;
            setEditContent(updated);
            pushHistory(updated);
            patch({ hasChanges: true });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        [patch, pushHistory]
    );

    useEffect(() => {
        if (!script) return;
        const content = script.command || "";
        // Only seed editor state on first load. After that, mutations update
        // latestContentRef / editContent directly (e.g. checkbox toggles) so
        // we must not overwrite in-progress edits or destroy the undo stack.
        if (!editorReady) {
            setEditContent(content);
            latestContentRef.current = content;
            setEditorReady(true);
        }
    }, [script, editorReady]);

    // Monaco editor instance ref — written by MarkdownCodeEditor, read here + MarkdownPreviewer
    const monacoEditorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
    const previewBoxRef = useRef<HTMLDivElement>(null);

    const scrollPreviewToLine = useCallback((lineNum: number, flash = false) => {
        const preview = previewBoxRef.current;
        if (!preview) return;
        // Find all annotated elements and pick the closest one at-or-before lineNum
        const candidates = Array.from(preview.querySelectorAll<HTMLElement>("[data-source-line]"));
        let best: HTMLElement | null = null;
        for (const el of candidates) {
            const n = parseInt(el.getAttribute("data-source-line") ?? "0", 10);
            if (n <= lineNum) best = el;
            else break;
        }
        if (best) {
            // Walk up to the nearest block-level element so inline nodes (e.g. <code>)
            // don't get flashed in isolation — we want to highlight the whole line.
            const BLOCK_TAGS = new Set([
                "P",
                "LI",
                "H1",
                "H2",
                "H3",
                "H4",
                "H5",
                "H6",
                "BLOCKQUOTE",
                "PRE",
                "TABLE",
                "TR",
                "TD",
                "TH",
            ]);
            let flashTarget: HTMLElement = best;
            while (flashTarget.parentElement && !BLOCK_TAGS.has(flashTarget.tagName)) {
                flashTarget = flashTarget.parentElement;
            }

            const offsetTop = best.offsetTop;
            preview.scrollTop = Math.max(0, offsetTop - preview.clientHeight / 2);
            if (flash) {
                // Flash the target element
                flashTarget.classList.remove("preview-flash");
                // Force reflow so removing then adding the class restarts the animation
                void flashTarget.offsetWidth;
                flashTarget.classList.add("preview-flash");
                flashTarget.addEventListener(
                    "animationend",
                    () => flashTarget.classList.remove("preview-flash"),
                    { once: true }
                );
            }
        }
    }, []);

    const handleWindowDragStart = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a, [role="button"]')) return;
        getCurrentWindow().startDragging().catch(console.error);
    };

    const handleWindowDoubleClick = async (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a, [role="button"]')) return;
        const next = !isFullscreen;
        await getCurrentWindow().setFullscreen(next);
        setIsFullscreen(next);
    };

    return (
        <div
            className="h-full w-full bg-white dark:bg-neutral-800 flex flex-col"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.1s ease" }}
        >
            {/* Title bar — only rendered in subwindow mode; embedded mode uses App.tsx menu bar */}
            {!embedded && (
                <div
                    className="flex-shrink-0 select-none bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-3 py-2 pl-4"
                    onMouseDown={handleWindowDragStart}
                    onDoubleClick={handleWindowDoubleClick}
                >
                    <div className="flex items-center gap-2">
                        <div
                            className="flex gap-1.5 items-center flex-shrink-0 mr-2"
                            onDoubleClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => getCurrentWindow().close()}
                                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group"
                                aria-label="Close"
                            >
                                <span className="hidden group-hover:block text-red-900 text-[9px] leading-none">
                                    ×
                                </span>
                            </button>
                            <button
                                onClick={() => getCurrentWindow().minimize()}
                                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group"
                                aria-label="Minimize"
                            >
                                <span className="hidden group-hover:block text-yellow-900 text-[9px] leading-none">
                                    −
                                </span>
                            </button>

                            <button
                                onClick={async () => {
                                    const next = !isFullscreen;
                                    await getCurrentWindow().setFullscreen(next);
                                    setIsFullscreen(next);
                                }}
                                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group"
                                aria-label="Full Screen"
                            >
                                <span className="hidden group-hover:block text-green-900 text-[9px] leading-none">
                                    {isFullscreen ? "↙" : "↗"}
                                </span>
                            </button>
                            <QuickNavDropdown />
                        </div>
                        <MarkdownEditorToolbar scriptId={scriptId!} port={port ?? null} />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {editViewMode === "plain" ? (
                    <div className="relative h-full">
                        <MarkdownCodeEditor
                            editContent={editContent}
                            fontSize={fontSize}
                            savedScrollTop={savedEditorScrollRef.current}
                            editorRef={monacoEditorRef}
                            onChange={(code) => {
                                setEditContent(code);
                                latestContentRef.current = code;
                                patch({ hasChanges: true, edited: false });
                                pushHistory(code);
                            }}
                            onScrollPreviewToLine={scrollPreviewToLine}
                        />
                    </div>
                ) : (
                    <div
                        className="flex h-full"
                        style={{ userSelect: isDragging ? "none" : undefined }}
                    >
                        {/* Left: editor */}
                        <div
                            className="relative h-full flex-shrink-0"
                            style={{
                                width: editViewMode === "preview" ? "0" : `${splitRatio}%`,
                                overflow: "hidden",
                                pointerEvents:
                                    editViewMode === "preview"
                                        ? "none"
                                        : isDragging
                                          ? "none"
                                          : undefined,
                                userSelect: isDragging ? "none" : undefined,
                                display: editViewMode === "preview" ? "none" : undefined,
                            }}
                        >
                            <MarkdownCodeEditor
                                editContent={editContent}
                                fontSize={fontSize}
                                savedScrollTop={savedEditorScrollRef.current}
                                editorRef={monacoEditorRef}
                                onChange={(code) => {
                                    setEditContent(code);
                                    latestContentRef.current = code;
                                    patch({ hasChanges: true, edited: false });
                                    pushHistory(code);
                                }}
                                onScrollPreviewToLine={scrollPreviewToLine}
                            />
                        </div>

                        {/* Divider */}
                        <div
                            className="w-1 cursor-col-resize bg-neutral-600 hover:bg-blue-500 flex-shrink-0 transition-colors"
                            style={{ display: editViewMode === "preview" ? "none" : undefined }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                isDraggingRef.current = true;
                                setIsDragging(true);
                                document.body.style.userSelect = "none";
                                document.body.style.cursor = "col-resize";
                                window.getSelection()?.removeAllRanges();
                            }}
                        />

                        {/* Right: live preview */}
                        <div
                            className="h-full"
                            style={{
                                width: editViewMode === "preview" ? "100%" : `${100 - splitRatio}%`,
                            }}
                        >
                            <MarkdownPreviewer
                                editContent={editContent}
                                fontSize={fontSize}
                                imagesDir={imagesDir}
                                previewBoxRef={previewBoxRef}
                                editorRef={monacoEditorRef}
                                latestContentRef={latestContentRef}
                                onImageWidthChange={handleImageWidthChange}
                                onCheckboxToggle={handleCheckboxToggle}
                                searchOpen={previewSearchOpen}
                                searchInputRef={previewSearchInputRef}
                                onSearchClose={() => setPreviewSearchOpen(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
