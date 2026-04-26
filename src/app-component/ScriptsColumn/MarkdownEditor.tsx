import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeMathjax from "rehype-mathjax";
import { scriptApi } from "@/store/api/scriptApi";
import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import QuickNavDropdown from "./QuickNavDropdown";
import MarkdownEditorToolbar from "./MarkdownEditorToolbar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { patchTabState, setFontSize } from "@/store/slices/appSlice";
import type { MarkdownTabState } from "@/store/slices/appSlice";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { convertFileSrc } from "@tauri-apps/api/core";
import SimpleEditor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-tomorrow.css";
import { useMarkdownShortcuts } from "@/hooks/useMarkdownShortcuts";
import { useMarkdownWrap } from "@/hooks/useMarkdownWrap";
import { remarkItemReference } from "@/lib/remarkItemReference";
import ItemReference from "./ItemReference";

const LIGHT_WHITE_BG = "rgba(255, 255, 255, 0.2)";
const DEFAULT_FONT_SIZE = 18;

// Rehype plugin: annotate block elements with their source line number
function rehypeAddSourceLines() {
    return (tree: any) => {
        function walk(node: any) {
            if (node.type === "element" && node.position?.start?.line != null) {
                node.properties = node.properties ?? {};
                node.properties["data-source-line"] = String(node.position.start.line);
            }
            if (node.children) {
                for (const child of node.children) walk(child);
            }
        }
        walk(tree);
    };
}

// List spacing constants for alignment calibration
const LIST_GUTTER_WIDTH = "2em";
const LIST_ITEM_PADDING = "0.5em";
const CHECKBOX_SPACING = "-1.25em";
const LIST_ITEM_LINE_HEIGHT = "1.4";

// Rehype plugin: wrap text matching `query` in <mark class="search-mark">
function makeRehypeSearchHighlight(query: string) {
    const q = query.trim().toLowerCase();
    return function rehypeSearchHighlight() {
        return function transformer(tree: any) {
            if (!q) return;
            function visitNode(node: any): any[] | null {
                if (node.type === "text") {
                    const lower: string = node.value.toLowerCase();
                    if (!lower.includes(q)) return null;
                    const parts: any[] = [];
                    let pos = 0;
                    while (true) {
                        const found = lower.indexOf(q, pos);
                        if (found === -1) {
                            if (pos < node.value.length)
                                parts.push({ type: "text", value: node.value.slice(pos) });
                            break;
                        }
                        if (found > pos)
                            parts.push({ type: "text", value: node.value.slice(pos, found) });
                        parts.push({
                            type: "element",
                            tagName: "mark",
                            properties: { className: ["search-mark"] },
                            children: [
                                { type: "text", value: node.value.slice(found, found + q.length) },
                            ],
                        });
                        pos = found + q.length;
                    }
                    return parts;
                }
                if (node.children) {
                    const newChildren: any[] = [];
                    let changed = false;
                    for (const child of node.children) {
                        const result = visitNode(child);
                        if (result !== null) {
                            newChildren.push(...result);
                            changed = true;
                        } else {
                            newChildren.push(child);
                        }
                    }
                    if (changed) node.children = newChildren;
                }
                return null;
            }
            visitNode(tree);
        };
    };
}

function SearchBar({
    query,
    onQueryChange,
    matchCount,
    matchIdx,
    inputRef,
    onAdvance,
    onClose,
    bottomOffset = 16,
}: {
    query: string;
    onQueryChange: (v: string) => void;
    matchCount: number;
    matchIdx: number;
    inputRef: React.RefObject<HTMLInputElement>;
    onAdvance: () => void;
    onClose: () => void;
    bottomOffset?: number;
}) {
    return (
        <div
            className="absolute right-4 z-50 flex items-center gap-2 bg-neutral-800/95 border border-neutral-500 rounded px-3 py-1.5 shadow-lg"
            style={{ bottom: bottomOffset }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        onAdvance();
                    }
                    if (e.key === "Escape") {
                        e.preventDefault();
                        onClose();
                    }
                }}
                placeholder="Search…"
                className="bg-transparent text-white text-sm outline-none w-44 placeholder-neutral-500"
            />
            <span className="text-neutral-400 text-xs min-w-[3rem] text-right select-none">
                {query.trim() ? (matchCount > 0 ? `${matchIdx + 1}/${matchCount}` : "0/0") : ""}
            </span>
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    onClose();
                }}
                className="text-neutral-400 hover:text-white leading-none"
                aria-label="Close search"
            >
                ✕
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Resizable image – drag the bottom-right handle to change width
// ---------------------------------------------------------------------------
function ResizableImage({
    src,
    alt,
    initialWidth,
    onWidthChange,
}: {
    src: string;
    alt: string;
    initialWidth?: number;
    onWidthChange?: (width: number) => void;
}) {
    const [width, setWidth] = useState<number | undefined>(initialWidth);
    const [hovered, setHovered] = useState(false);
    const startRef = useRef<{ x: number; w: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const onHandleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const currentW = width ?? containerRef.current?.getBoundingClientRect().width ?? 300;
        startRef.current = { x: e.clientX, w: currentW };

        const calcDelta = (ev: MouseEvent) =>
            ev.clientX - startRef.current!.x - (ev.clientY - e.clientY);

        const onMove = (ev: MouseEvent) => {
            if (!startRef.current) return;
            const newW = Math.max(50, Math.round(startRef.current.w + calcDelta(ev)));
            setWidth(newW);
        };
        const onUp = (ev: MouseEvent) => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (!startRef.current) return;
            const finalW = Math.max(50, Math.round(startRef.current.w + calcDelta(ev)));
            startRef.current = null;
            onWidthChange?.(finalW);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                display: "inline-block",
                width: width ? `${width}px` : "100%",
                maxWidth: "100%",
                borderRadius: "4px",
                outline: hovered ? "3px solid #3e6df1" : "3px solid transparent",
                transition: "outline-color 0.15s",
                cursor: hovered ? "nwse-resize" : undefined,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={onHandleMouseDown}
            title={hovered ? "Drag to resize" : undefined}
        >
            <img
                src={src}
                alt={alt}
                style={{ display: "block", width: "100%", borderRadius: "4px" }}
                draggable={false}
            />
        </div>
    );
}

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

    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: !(scriptId != null) || port === 0,
    });

    // Read editMode from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const editModeFromUrl = urlParams.get("editMode") === "true";

    const [isFullscreen, setIsFullscreen] = useState(false);
    // ─── Redux-backed tab state (live-synced; survives tab switches) ─────────
    const ts = savedState; // shorthand; undefined on first open
    const isEditMode: boolean = ts?.isEditMode ?? editModeFromUrl;
    const editName: string = ts?.editName ?? "";
    const splitRatio: number = ts?.splitRatio ?? 50;
    const editViewMode: "plain" | "mixed" | "preview" = ts?.editViewMode ?? "mixed";
    // fontSize is global — shared by all tabs so zoom in/out affects every open tab.
    const fontSize: number = useAppSelector((s) => s.app.tab.fontSize);
    /** Dispatch a partial update for this tab's persisted state. */
    const patch = useCallback(
        (partial: Partial<MarkdownTabState>) => dispatch(patchTabState({ tabId, ...partial })),
        [dispatch, tabId]
    );
    // ─────────────────────────────────────────────────────────────────────────
    // editContent stays local — hot path; persisted to Redux on unmount via latestContentRef.
    const [editContent, setEditContent] = useState(ts?.hasChanges ? (ts.editContent ?? "") : "");
    // Start editorReady=true when we have unsaved edits to restore, so the seeding
    // useEffect doesn't overwrite editContent with the server's script.command.
    const [editorReady, setEditorReady] = useState(() => ts?.hasChanges ?? false);
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    // Fade-in when the tab is mounted (i.e. every time the user switches to this tab).
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const latestContentRef = useRef(savedState?.hasChanges ? (savedState.editContent ?? "") : "");
    const handleSaveEditRef = useRef<((closeEditMode?: boolean) => Promise<void>) | null>(null);
    // useState (not useRef) so that when get_images_dir resolves it triggers a
    // re-render and the img renderer picks up the real path — otherwise images
    // stay broken on remount (e.g. after switching tabs and returning).
    const [imagesDir, setImagesDir] = useState<string | null>(null);
    const isDraggingRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);

    // Editor search
    const [editorSearchOpen, setEditorSearchOpen] = useState(false);
    const [editorSearchQuery, setEditorSearchQuery] = useState("");
    const [editorSearchMatches, setEditorSearchMatches] = useState<number[]>([]);
    const [editorSearchIdx, setEditorSearchIdx] = useState(0);
    const editorSearchInputRef = useRef<HTMLInputElement>(null);

    // Preview search
    const [previewSearchOpen, setPreviewSearchOpen] = useState(false);
    const [previewSearchQuery, setPreviewSearchQuery] = useState("");
    const [previewSearchIdx, setPreviewSearchIdx] = useState(0);
    const [previewSearchCount, setPreviewSearchCount] = useState(0);
    const previewSearchInputRef = useRef<HTMLInputElement>(null);
    const viewBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        invoke<string>("get_images_dir").then((dir) => {
            setImagesDir(dir);
        });
    }, []);

    // ─── Tab state persistence ───────────────────────────────────────────────
    // isEditMode and other persisted fields are live in Redux (patched on every change).
    // On unmount we only flush editContent (hot-path local state) + scroll positions
    // (DOM values that can't be live-synced to Redux).
    // isEditModeRef keeps a fresh value for the cleanup without causing re-renders.
    const isEditModeRef = useRef(isEditMode);
    isEditModeRef.current = isEditMode;
    const dispatchRef = useRef(dispatch);
    dispatchRef.current = dispatch;
    // ⚠️ Must be useLayoutEffect — useEffect cleanup runs AFTER React nulls out DOM refs,
    // so editorWrapperRef.current and previewBoxRef.current would already be null.
    useLayoutEffect(() => {
        return () => {
            // Which preview container is in the DOM depends on isEditMode at unmount time.
            // previewBoxRef is used in edit mode (mixed/preview), viewBoxRef in view-only mode.
            const savedIsEditMode = isEditModeRef.current;
            const previewScroll = savedIsEditMode
                ? (previewBoxRef.current?.scrollTop ?? 0)
                : (viewBoxRef.current?.scrollTop ?? 0);
            dispatchRef.current(
                patchTabState({
                    tabId,
                    editContent: latestContentRef.current, // always freshest
                    editorScrollTop: editorWrapperRef.current?.scrollTop ?? 0,
                    previewScrollTop: previewScroll,
                })
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Restore scroll positions once — triggered when editorReady becomes true
    // (i.e. after the content has been seeded and the DOM has full scroll height).
    // Two nested RAFs ensure the browser has finished layout before we set scrollTop.
    const savedEditorScrollRef = useRef(savedState?.editorScrollTop ?? 0);
    const savedPreviewScrollRef = useRef(savedState?.previewScrollTop ?? 0);
    // Capture which preview ref to restore to based on the saved isEditMode.
    const savedIsEditModeRef = useRef(savedState?.isEditMode ?? editModeFromUrl);
    const hasRestoredScrollRef = useRef(false);
    useEffect(() => {
        if (hasRestoredScrollRef.current || !editorReady) return;
        hasRestoredScrollRef.current = true;
        const savedEditor = savedEditorScrollRef.current;
        const savedPreview = savedPreviewScrollRef.current;
        if (!savedEditor && !savedPreview) return;
        let raf2 = -1;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                if (savedEditor && editorWrapperRef.current) {
                    editorWrapperRef.current.scrollTop = savedEditor;
                }
                if (savedPreview) {
                    // previewBoxRef is in DOM in edit mode (mixed/preview);
                    // viewBoxRef is in DOM in view-only mode.
                    const previewEl = savedIsEditModeRef.current
                        ? previewBoxRef.current
                        : viewBoxRef.current;
                    if (previewEl) previewEl.scrollTop = savedPreview;
                }
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

    // Undo/redo history
    const undoStackRef = useRef<string[]>([]);
    const undoIndexRef = useRef(-1);
    const isUndoingRef = useRef(false);

    // Cursor position navigation history (Alt+Arrow)
    const cursorHistoryRef = useRef<number[]>([]);
    const cursorHistoryIdxRef = useRef(-1);
    const isNavigatingCursorHistoryRef = useRef(false);

    const pushHistory = useCallback((content: string) => {
        if (isUndoingRef.current) return; // ignore changes triggered by our own undo/redo
        const stack = undoStackRef.current.slice(0, undoIndexRef.current + 1);
        stack.push(content);
        if (stack.length > 500) stack.shift();
        undoStackRef.current = stack;
        undoIndexRef.current = stack.length - 1;
    }, []);

    // Initialize editName when script loads if starting in edit mode
    useEffect(() => {
        if (editModeFromUrl && script) {
            patch({ editName: script.name || "" });
        }
    }, [script, editModeFromUrl, patch]);

    // Debounce-sync editContent to Redux so the toolbar component can read it for saving.
    useEffect(() => {
        const t = setTimeout(() => patch({ editContent }), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editContent]);

    // When edit mode ends (cancel or save), reset local editContent to the saved script content.
    const prevIsEditModeRef = useRef(isEditMode);
    useEffect(() => {
        if (prevIsEditModeRef.current && !isEditMode) {
            setEditContent(script?.command || "");
        }
        prevIsEditModeRef.current = isEditMode;
    }, [isEditMode, script?.command]);

    const handleSaveEdit = useCallback(
        async (closeEditMode: boolean = true) => {
            if (!script) return;

            await updateMarkdown({
                ...script,
                name: editName,
                command: editContent,
            }).unwrap();

            patch({ hasChanges: false, edited: true });
            setTimeout(() => dispatch(patchTabState({ tabId, edited: false })), 2000);

            if (closeEditMode) {
                patch({ isEditMode: false });
            }

            dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));
            await emit("markdown-updated", { scriptId: script.id });
        },
        [script, editName, editContent, updateMarkdown, dispatch, patch, tabId]
    );

    // Keep ref updated with latest handleSaveEdit
    useEffect(() => {
        handleSaveEditRef.current = handleSaveEdit;
    }, [handleSaveEdit]);

    // Shared window-level keyboard shortcuts
    useMarkdownShortcuts({
        onSave: () => {
            if (isEditMode) handleSaveEdit(false);
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
            if (isEditMode) {
                setEditorSearchOpen(true);
                setTimeout(() => editorSearchInputRef.current?.focus(), 0);
                if (editViewMode === "mixed" || editViewMode === "preview") {
                    setPreviewSearchOpen(true);
                }
            } else {
                setPreviewSearchOpen(true);
                setTimeout(() => previewSearchInputRef.current?.focus(), 0);
            }
        },
        onEscape: () => {
            setEditorSearchOpen(false);
            setEditorSearchQuery("");
            setPreviewSearchOpen(false);
            setPreviewSearchQuery("");
        },
        onZoomIn: () => dispatch(setFontSize(Math.min(fontSize + 1, 36))),
        onZoomOut: () => dispatch(setFontSize(Math.max(fontSize - 1, 8))),
        onZoomReset: () => dispatch(setFontSize(DEFAULT_FONT_SIZE)),
    });

    const handleCheckboxToggle = async (checkboxIndex: number) => {
        const content = latestContentRef.current || script?.command || "";
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
        if (isEditMode) {
            setEditContent(updatedContent);
            pushHistory(updatedContent);
            patch({ hasChanges: true });
            patch({ edited: false });
        }

        if (script) {
            await updateMarkdown({
                ...script,
                command: updatedContent,
            });
        }
    };

    useEffect(() => {
        if (!script) return;
        const content = script.command || "";
        // Only seed editor state on first load. After that, mutations update
        // latestContentRef / editContent directly (e.g. checkbox toggles) so
        // we must not overwrite in-progress edits or destroy the undo stack.
        if (!editorReady) {
            setEditContent(content);
            latestContentRef.current = content;
            undoStackRef.current = [content];
            undoIndexRef.current = 0;
            setEditorReady(true);
        } else if (!isEditMode) {
            // In read-only view keep the ref fresh so checkbox toggles read
            // the latest saved content from the server.
            latestContentRef.current = content;
        }
    }, [script, editorReady]);

    // Undo/redo via capture-phase native listener so it beats WKWebView's NSUndoManager
    const editorWrapperRef = useRef<HTMLDivElement>(null);
    const previewBoxRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isEditMode) return;
        const container = editorWrapperRef.current;
        if (!container) return;
        const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
        if (!textarea) return;

        // Block native browser/WKWebView undo-redo so NSUndoManager can't touch the textarea.
        // `beforeinput` prevention may not stop AppKit-level NSUndoManager in WKWebView, so we
        // also intercept `input` (fires AFTER the native undo mutates the textarea) in capture
        // phase, restore the correct value directly on the DOM, and block React from seeing it.
        const beforeInputHandler = (e: Event) => {
            const ie = e as InputEvent;
            if (
                ie.inputType === "historyUndo" ||
                ie.inputType === "historyRedo" ||
                ie.inputType === "insertFromYank" // macOS Cmd+Y "yank" — let our keydown handler do redo instead
            ) {
                e.preventDefault();
            }
        };
        textarea.addEventListener("beforeinput", beforeInputHandler, true);

        const nativeUndoInputHandler = (e: Event) => {
            const ie = e as InputEvent;
            if (ie.inputType !== "historyUndo" && ie.inputType !== "historyRedo") return;
            // Prevent React's synthetic onChange from seeing the native-undone value
            e.stopImmediatePropagation();
            const idx = undoIndexRef.current;
            const correct = undoStackRef.current[Math.max(0, idx)] ?? "";
            // Restore directly on DOM so there is no visible flash
            textarea.value = correct;
            isUndoingRef.current = true;
            setEditContent(correct);
            latestContentRef.current = correct;
            setTimeout(() => {
                isUndoingRef.current = false;
            }, 0);
        };
        textarea.addEventListener("input", nativeUndoInputHandler, true);

        const scrollToPos = (pos: number) => {
            const content = latestContentRef.current;
            const lineNum = content.slice(0, pos).split("\n").length - 1;
            const wrapper = editorWrapperRef.current;
            if (wrapper) {
                const LINE_HEIGHT = 15 * 1.5;
                const lineTop = 16 + lineNum * LINE_HEIGHT;
                wrapper.scrollTop = Math.max(
                    0,
                    lineTop - wrapper.clientHeight / 2 + LINE_HEIGHT / 2
                );
            }
        };

        const handler = (e: KeyboardEvent) => {
            // Alt+ArrowLeft / Alt+ArrowRight — cursor position history navigation
            if (
                e.altKey &&
                !e.metaKey &&
                !e.ctrlKey &&
                (e.key === "ArrowLeft" || e.key === "ArrowRight")
            ) {
                e.preventDefault();
                e.stopImmediatePropagation();
                isNavigatingCursorHistoryRef.current = true;
                if (e.key === "ArrowLeft") {
                    // Snapshot the current position before going back so Alt+Right can return here
                    const currentPos = textarea.selectionStart;
                    const history = cursorHistoryRef.current;
                    const idx = cursorHistoryIdxRef.current;
                    const lastRecorded = idx >= 0 ? history[idx] : undefined;
                    if (currentPos !== lastRecorded) {
                        const newHistory = history.slice(0, idx + 1);
                        newHistory.push(currentPos);
                        if (newHistory.length > 200) newHistory.shift();
                        cursorHistoryRef.current = newHistory;
                        cursorHistoryIdxRef.current = newHistory.length - 1;
                    }
                    const newIdx = cursorHistoryIdxRef.current;
                    if (newIdx > 0) {
                        cursorHistoryIdxRef.current = newIdx - 1;
                        const pos = cursorHistoryRef.current[cursorHistoryIdxRef.current];
                        textarea.setSelectionRange(pos, pos);
                        scrollToPos(pos);
                    }
                } else if (e.key === "ArrowRight") {
                    const idx = cursorHistoryIdxRef.current;
                    if (idx < cursorHistoryRef.current.length - 1) {
                        cursorHistoryIdxRef.current = idx + 1;
                        const pos = cursorHistoryRef.current[cursorHistoryIdxRef.current];
                        textarea.setSelectionRange(pos, pos);
                        scrollToPos(pos);
                    }
                }
                setTimeout(() => {
                    isNavigatingCursorHistoryRef.current = false;
                }, 0);
                return;
            }

            if (!(e.metaKey || e.ctrlKey)) return;
            if (e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const idx = undoIndexRef.current;
                if (idx > 0) {
                    const prev = undoStackRef.current[idx - 1];
                    undoIndexRef.current = idx - 1;
                    isUndoingRef.current = true;
                    setEditContent(prev);
                    latestContentRef.current = prev;
                    setTimeout(() => {
                        isUndoingRef.current = false;
                    }, 0);
                }
            } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
                e.preventDefault();
                e.stopImmediatePropagation();
                const idx = undoIndexRef.current;
                if (idx < undoStackRef.current.length - 1) {
                    const next = undoStackRef.current[idx + 1];
                    undoIndexRef.current = idx + 1;
                    isUndoingRef.current = true;
                    setEditContent(next);
                    latestContentRef.current = next;
                    setTimeout(() => {
                        isUndoingRef.current = false;
                    }, 0);
                }
            }
        };

        textarea.addEventListener("keydown", handler, true); // capture phase
        return () => {
            textarea.removeEventListener("keydown", handler, true);
            textarea.removeEventListener("beforeinput", beforeInputHandler, true);
            textarea.removeEventListener("input", nativeUndoInputHandler, true);
        };
    }, [isEditMode, editorReady]);

    // Record cursor positions for Alt+Arrow history navigation
    useEffect(() => {
        if (!isEditMode || !editorReady) return;
        const container = editorWrapperRef.current;
        if (!container) return;
        const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
        if (!textarea) return;

        const recordPos = () => {
            if (isNavigatingCursorHistoryRef.current) return;
            const pos = textarea.selectionStart;
            const history = cursorHistoryRef.current;
            const idx = cursorHistoryIdxRef.current;
            const current = idx >= 0 ? history[idx] : undefined;
            if (current === pos) return;
            const newHistory = history.slice(0, idx + 1);
            newHistory.push(pos);
            if (newHistory.length > 200) newHistory.shift();
            cursorHistoryRef.current = newHistory;
            cursorHistoryIdxRef.current = newHistory.length - 1;
        };

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRecord = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(recordPos, 300);
        };

        const handleMouseUp = () => setTimeout(recordPos, 10);
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.altKey) return; // Alt+Arrow is handled by the keydown listener
            const navKeys = [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "PageUp",
                "PageDown",
            ];
            if (navKeys.includes(e.key)) scheduleRecord();
        };

        textarea.addEventListener("mouseup", handleMouseUp);
        textarea.addEventListener("keyup", handleKeyUp);
        return () => {
            textarea.removeEventListener("mouseup", handleMouseUp);
            textarea.removeEventListener("keyup", handleKeyUp);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [isEditMode, editorReady]);

    // Paste image from clipboard
    useEffect(() => {
        if (!isEditMode || !editorReady) return;
        const container = editorWrapperRef.current;
        if (!container) return;
        const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
        if (!textarea) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = Array.from(e.clipboardData?.items ?? []);
            const imageItem = items.find((item) => item.type.startsWith("image/"));
            if (!imageItem) return;

            e.preventDefault();
            const blob = imageItem.getAsFile();
            if (!blob) return;

            // Compress to JPEG via canvas to avoid OOM on large screenshots (e.g. TIFFs)
            const compressedBlob = await (async () => {
                try {
                    const bitmap = await createImageBitmap(blob);
                    const MAX_WIDTH = 1400;
                    const scale = bitmap.width > MAX_WIDTH ? MAX_WIDTH / bitmap.width : 1;
                    const w = Math.round(bitmap.width * scale);
                    const h = Math.round(bitmap.height * scale);
                    const canvas = document.createElement("canvas");
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(bitmap, 0, 0, w, h);
                    bitmap.close();
                    return await new Promise<Blob>((resolve, reject) => {
                        canvas.toBlob(
                            (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
                            "image/jpeg",
                            0.85
                        );
                    });
                } catch {
                    return blob; // fall back to original if compression fails
                }
            })();

            const arrayBuffer = await compressedBlob.arrayBuffer();
            const bytes = Array.from(new Uint8Array(arrayBuffer));

            try {
                const filename = await invoke<string>("save_pasted_image", { data: bytes });
                const insertion = `![pasted image](images/${filename})`;
                const { selectionStart, selectionEnd } = textarea;
                const before = editContent.slice(0, selectionStart);
                const after = editContent.slice(selectionEnd);
                const newContent = before + insertion + after;
                setEditContent(newContent);
                pushHistory(newContent);
                patch({ hasChanges: true });
                patch({ edited: false });
            } catch (err) {
                console.error("Failed to save pasted image:", err);
            }
        };

        textarea.addEventListener("paste", handlePaste);
        return () => textarea.removeEventListener("paste", handlePaste);
    }, [isEditMode, editorReady, editContent, pushHistory]);

    // ── Editor search ──────────────────────────────────────────────────────────
    // Recompute match list whenever the query or editor content changes
    useEffect(() => {
        if (!editorSearchQuery.trim()) {
            setEditorSearchMatches([]);
            setEditorSearchIdx(0);
            return;
        }
        const lower = editContent.toLowerCase();
        const q = editorSearchQuery.toLowerCase();
        const matches: number[] = [];
        let pos = 0;
        while (true) {
            const found = lower.indexOf(q, pos);
            if (found === -1) break;
            matches.push(found);
            pos = found + 1;
        }
        setEditorSearchMatches(matches);
        setEditorSearchIdx(0);
    }, [editorSearchQuery, editContent]);

    // Scroll editor to the current match and set textarea selection
    useEffect(() => {
        if (!editorSearchOpen || editorSearchMatches.length === 0) return;
        const match = editorSearchMatches[editorSearchIdx];
        if (match == null) return;
        const textarea = editorWrapperRef.current?.querySelector<HTMLTextAreaElement>("textarea");
        if (!textarea) return;
        // Only focus + select when the search input is NOT active (e.g. user pressed Enter).
        // While typing, skip focus/select entirely — setSelectionRange also steals focus in WKWebView.
        const searchInputFocused = document.activeElement === editorSearchInputRef.current;
        if (!searchInputFocused) {
            textarea.focus();
            textarea.setSelectionRange(match, match + editorSearchQuery.length);
        }
        const lineNum = editContent.slice(0, match).split("\n").length - 1;
        const wrapper = editorWrapperRef.current;
        if (wrapper) {
            const lineTop = 16 + lineNum * (fontSize * 1.5);
            wrapper.scrollTop = Math.max(0, lineTop - wrapper.clientHeight / 2 + fontSize * 0.75);
        }
    }, [
        editorSearchIdx,
        editorSearchMatches,
        editorSearchQuery,
        editorSearchOpen,
        editContent,
        fontSize,
    ]);

    // ── Preview search ─────────────────────────────────────────────────────────
    // After ReactMarkdown commits (with marks already injected by the rehype plugin),
    // highlight the active mark differently and scroll to it.
    useLayoutEffect(() => {
        if (!previewSearchOpen || !previewSearchQuery.trim()) {
            setPreviewSearchCount(0);
            return;
        }
        const container = (
            isEditMode ? previewBoxRef.current : viewBoxRef.current
        ) as HTMLElement | null;
        if (!container) return;
        const marks = Array.from(container.querySelectorAll<HTMLElement>("mark.search-mark"));
        setPreviewSearchCount(marks.length);
        if (marks.length === 0) return;
        const idx = previewSearchIdx % marks.length;
        marks.forEach((m, i) => {
            m.style.backgroundColor =
                i === idx ? "rgba(255, 160, 0, 0.7)" : "rgba(255, 210, 0, 0.35)";
            m.style.color = "inherit";
            m.style.borderRadius = "2px";
            m.style.padding = "1px 0";
        });
        marks[idx].scrollIntoView({ block: "center" });
    }, [
        previewSearchIdx,
        previewSearchOpen,
        previewSearchQuery,
        isEditMode,
        editContent,
        script?.command,
    ]);

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

    const handleEditorCursorChange = useCallback(
        (flash: boolean) => {
            const textarea =
                editorWrapperRef.current?.querySelector<HTMLTextAreaElement>("textarea");
            if (!textarea) return;
            const pos = textarea.selectionStart;
            const lineNum = editContent.slice(0, pos).split("\n").length;
            scrollPreviewToLine(lineNum, flash);
        },
        [editContent, scrollPreviewToLine, fontSize]
    );

    const handlePreviewDoubleClick = useCallback(
        // eslint-disable-next-line react-hooks/exhaustive-deps
        (e: React.MouseEvent) => {
            let el = e.target as HTMLElement | null;
            while (el) {
                const lineAttr = el.getAttribute("data-source-line");
                if (lineAttr) {
                    const lineNum = Math.max(0, parseInt(lineAttr, 10) - 1); // 0-based
                    const textarea =
                        editorWrapperRef.current?.querySelector<HTMLTextAreaElement>("textarea");
                    if (textarea) {
                        const lines = editContent.split("\n");
                        const charPos = lines
                            .slice(0, lineNum)
                            .reduce((acc, l) => acc + l.length + 1, 0);
                        textarea.focus();
                        textarea.setSelectionRange(charPos, charPos);

                        // Scroll the editor wrapper so the target line is centred in view
                        const wrapper = editorWrapperRef.current;
                        if (wrapper) {
                            const LINE_HEIGHT = fontSize * 1.5; // matches SimpleEditor style
                            const PADDING = 16;
                            const lineTop = PADDING + lineNum * LINE_HEIGHT;
                            const centredScrollTop =
                                lineTop - wrapper.clientHeight / 2 + LINE_HEIGHT / 2;
                            wrapper.scrollTop = Math.max(0, centredScrollTop);
                        }
                    }
                    break;
                }
                el = el.parentElement;
            }
        },
        [editContent]
    );

    const handleEditorKeyDown = useMarkdownWrap(editContent, (newContent) => {
        setEditContent(newContent);
        pushHistory(newContent);
        patch({ hasChanges: true });
        patch({ edited: false });
    });

    // Rehype plugin that highlights all preview occurrences of the search query
    const rehypeSearchHighlightPlugin = useMemo(
        () => makeRehypeSearchHighlight(previewSearchQuery),
        [previewSearchQuery]
    );
    // Stable plugin arrays so ReactMarkdown doesn't recompile on unrelated re-renders
    const rehypePluginsMixedPreview = useMemo(
        () =>
            [
                rehypeHighlight,
                rehypeMathjax,
                rehypeAddSourceLines,
                rehypeSearchHighlightPlugin,
            ] as any[],
        [rehypeSearchHighlightPlugin]
    );
    const rehypePluginsViewPreview = useMemo(
        () => [rehypeHighlight, rehypeMathjax, rehypeSearchHighlightPlugin] as any[],
        [rehypeSearchHighlightPlugin]
    );

    const remarkPluginsWithItemRef = useMemo(
        () => [remarkGfm, remarkMath, remarkItemReference] as any[],
        []
    );

    // Mirror HTML for editor search highlight overlay (transparent marks over the textarea)
    const editorHighlightHtml = useMemo(() => {
        if (!editorSearchOpen || !editorSearchQuery.trim()) return "";
        const q = editorSearchQuery.toLowerCase();
        const lower = editContent.toLowerCase();
        const parts: string[] = [];
        let last = 0;
        let matchNum = 0;
        let pos = 0;
        while (true) {
            const found = lower.indexOf(q, pos);
            if (found === -1) break;
            if (found > last) {
                parts.push(
                    editContent
                        .slice(last, found)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                );
            }
            const isActive = matchNum === editorSearchIdx;
            const chunk = editContent
                .slice(found, found + q.length)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            parts.push(
                `<mark class="editor-search-mark${isActive ? " active" : ""}">${chunk}</mark>`
            );
            last = found + q.length;
            matchNum++;
            pos = found + 1;
        }
        if (last < editContent.length) {
            parts.push(
                editContent
                    .slice(last)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
            );
        }
        return parts.join("");
    }, [editorSearchQuery, editContent, editorSearchOpen, editorSearchIdx]);

    const markdownComponents = useMemo(() => {
        return {
            a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                <a
                    href={href}
                    onClick={(e) => {
                        if (!href || href.startsWith("#")) return;
                        e.preventDefault();
                        e.stopPropagation();
                        openUrl(href).catch(console.error);
                    }}
                    style={{ cursor: "pointer" }}
                >
                    {children}
                </a>
            ),
            img: ({ src, alt }: { src?: string; alt?: string }) => {
                // Parse optional ?width=N from the src
                const widthMatch = src?.match(/\?width=(\d+)/);
                const initialWidth = widthMatch ? parseInt(widthMatch[1]) : undefined;
                // cleanPathNorm is the path without ?width=N suffix
                const cleanPathNorm = src?.replace(/\?width=\d+$/, "") ?? "";

                let imgSrc = cleanPathNorm;
                if (cleanPathNorm.startsWith("images/") && imagesDir) {
                    const filename = cleanPathNorm.replace(/^images\//, "");
                    imgSrc = convertFileSrc(`${imagesDir}/${filename}`);
                }

                const handleWidthChange = (newWidth: number) => {
                    const escaped = cleanPathNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const updated = latestContentRef.current.replace(
                        new RegExp(`(!\\[[^\\]]*\\]\\(${escaped})(?:\\?width=\\d+)?(\\))`, "g"),
                        `$1?width=${newWidth}$2`
                    );
                    latestContentRef.current = updated;
                    if (isEditMode) {
                        setEditContent(updated);
                        pushHistory(updated);
                        patch({ hasChanges: true });
                    } else if (script) {
                        updateMarkdown({ ...script, command: updated });
                    }
                };

                return (
                    <ResizableImage
                        src={imgSrc}
                        alt={alt ?? ""}
                        initialWidth={initialWidth}
                        onWidthChange={handleWidthChange}
                    />
                );
            },
            itemref: ({ id }: { id?: string }) => <ItemReference id={id} />,
            input: ({ node, checked, disabled, ...props }: any) => {
                if (props.type === "checkbox") {
                    return (
                        <input
                            {...props}
                            style={{ cursor: "pointer" }}
                            type="checkbox"
                            defaultChecked={checked}
                            disabled={false}
                            onClick={(e) => {
                                e.stopPropagation();
                                const target = e.target as HTMLInputElement;
                                const allCheckboxes =
                                    document.querySelectorAll('input[type="checkbox"]');
                                let index = -1;
                                for (let i = 0; i < allCheckboxes.length; i++) {
                                    if (allCheckboxes[i] === target) {
                                        index = i;
                                        break;
                                    }
                                }
                                if (index !== -1) {
                                    handleCheckboxToggle(index);
                                }
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                        />
                    );
                }
                return <input {...props} />;
            },
        };
    }, [script?.command, imagesDir]);

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
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.05s ease" }}
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
                {isEditMode ? (
                    editViewMode === "plain" ? (
                        <div className="relative h-full">
                            {editorSearchOpen && (
                                <SearchBar
                                    query={editorSearchQuery}
                                    onQueryChange={setEditorSearchQuery}
                                    matchCount={editorSearchMatches.length}
                                    matchIdx={editorSearchIdx}
                                    // @ts-ignore
                                    inputRef={editorSearchInputRef}
                                    onAdvance={() =>
                                        setEditorSearchIdx((i) =>
                                            editorSearchMatches.length === 0
                                                ? 0
                                                : (i + 1) % editorSearchMatches.length
                                        )
                                    }
                                    onClose={() => {
                                        setEditorSearchOpen(false);
                                        setEditorSearchQuery("");
                                    }}
                                />
                            )}
                            <div
                                ref={editorWrapperRef}
                                className="h-full overflow-auto bg-[#1e1e1e] relative"
                            >
                                {editorSearchOpen && editorSearchQuery.trim() && (
                                    <div
                                        aria-hidden="true"
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            padding: "16px",
                                            fontFamily:
                                                '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                            fontSize: `${fontSize}px`,
                                            lineHeight: "1.5",
                                            color: "transparent",
                                            pointerEvents: "none",
                                            whiteSpace: "pre-wrap",
                                            overflowWrap: "break-word",
                                            overflow: "hidden",
                                            zIndex: 2,
                                            userSelect: "none",
                                        }}
                                        dangerouslySetInnerHTML={{ __html: editorHighlightHtml }}
                                    />
                                )}
                                <SimpleEditor
                                    value={editContent}
                                    onValueChange={(code) => {
                                        setEditContent(code);
                                        latestContentRef.current = code;
                                        patch({ hasChanges: true });
                                        patch({ edited: false });
                                        pushHistory(code);
                                    }}
                                    highlight={(code) =>
                                        highlight(code, languages.markdown, "markdown")
                                    }
                                    padding={16}
                                    style={{
                                        fontFamily:
                                            '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                        fontSize: fontSize,
                                        lineHeight: 1.5,
                                        minHeight: "100%",
                                        backgroundColor: "#1e1e1e",
                                        color: "#d4d4d4",
                                    }}
                                    textareaClassName="focus:outline-none"
                                    onKeyDown={handleEditorKeyDown}
                                />
                            </div>
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
                                {editorSearchOpen && (
                                    <SearchBar
                                        query={editorSearchQuery}
                                        onQueryChange={setEditorSearchQuery}
                                        matchCount={editorSearchMatches.length}
                                        matchIdx={editorSearchIdx}
                                        // @ts-ignore
                                        inputRef={editorSearchInputRef}
                                        onAdvance={() =>
                                            setEditorSearchIdx((i) =>
                                                editorSearchMatches.length === 0
                                                    ? 0
                                                    : (i + 1) % editorSearchMatches.length
                                            )
                                        }
                                        onClose={() => {
                                            setEditorSearchOpen(false);
                                            setEditorSearchQuery("");
                                            setPreviewSearchOpen(false);
                                            setPreviewSearchQuery("");
                                            setPreviewSearchIdx(0);
                                        }}
                                    />
                                )}
                                <div
                                    ref={editorWrapperRef}
                                    className="h-full overflow-auto bg-[#1e1e1e] relative"
                                >
                                    {editorSearchOpen && editorSearchQuery.trim() && (
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                padding: "16px",
                                                fontFamily:
                                                    '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                                fontSize: `${fontSize}px`,
                                                lineHeight: "1.5",
                                                color: "transparent",
                                                pointerEvents: "none",
                                                whiteSpace: "pre-wrap",
                                                overflowWrap: "break-word",
                                                overflow: "hidden",
                                                zIndex: 2,
                                                userSelect: "none",
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: editorHighlightHtml,
                                            }}
                                        />
                                    )}
                                    <SimpleEditor
                                        value={editContent}
                                        onValueChange={(code) => {
                                            setEditContent(code);
                                            latestContentRef.current = code;
                                            patch({ hasChanges: true });
                                            patch({ edited: false });
                                            pushHistory(code);
                                        }}
                                        highlight={(code) =>
                                            highlight(code, languages.markdown, "markdown")
                                        }
                                        padding={16}
                                        style={{
                                            fontFamily:
                                                '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                            fontSize: fontSize,
                                            lineHeight: 1.5,
                                            minHeight: "100%",
                                            backgroundColor: "#1e1e1e",
                                            color: "#d4d4d4",
                                        }}
                                        textareaClassName="focus:outline-none"
                                        onKeyDown={handleEditorKeyDown}
                                        onKeyUp={(e) => {
                                            const CURSOR_KEYS = new Set([
                                                "ArrowUp",
                                                "ArrowDown",
                                                "ArrowLeft",
                                                "ArrowRight",
                                                "Home",
                                                "End",
                                                "PageUp",
                                                "PageDown",
                                            ]);
                                            if (CURSOR_KEYS.has(e.key))
                                                handleEditorCursorChange(false);
                                        }}
                                        onDoubleClick={() => handleEditorCursorChange(true)}
                                    />
                                </div>
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
                                    width:
                                        editViewMode === "preview"
                                            ? "100%"
                                            : `${100 - splitRatio}%`,
                                }}
                            >
                                {previewSearchOpen && (
                                    <SearchBar
                                        query={previewSearchQuery}
                                        onQueryChange={setPreviewSearchQuery}
                                        matchCount={previewSearchCount}
                                        matchIdx={previewSearchIdx}
                                        // @ts-ignore
                                        inputRef={previewSearchInputRef}
                                        onAdvance={() =>
                                            setPreviewSearchIdx((i) =>
                                                previewSearchCount === 0
                                                    ? 0
                                                    : (i + 1) % previewSearchCount
                                            )
                                        }
                                        onClose={() => {
                                            setPreviewSearchOpen(false);
                                            setPreviewSearchQuery("");
                                            setPreviewSearchIdx(0);
                                            setEditorSearchOpen(false);
                                            setEditorSearchQuery("");
                                        }}
                                    />
                                )}
                                <Box
                                    ref={previewBoxRef}
                                    className="markdown-preview"
                                    style={{ width: "100%" }}
                                    onDoubleClick={handlePreviewDoubleClick}
                                    sx={{
                                        fontSize: `${fontSize}px`,
                                        height: "100%",
                                        userSelect: "text",
                                        cursor: "text",
                                        overflowY: "auto",
                                        backgroundColor: "rgb(209, 213, 219)",
                                        padding: "24px",
                                        ".dark &": {
                                            backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                                            color: "rgb(212, 212, 212) !important",
                                        },
                                        "& h1": {
                                            fontSize: "2em",
                                            fontWeight: "700",
                                            marginTop: "0.67em",
                                            marginBottom: "0.67em",
                                            borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                                            paddingBottom: "0.3em",
                                            color: "rgb(255, 255, 255)",
                                        },
                                        "& h2": {
                                            fontSize: "1.75em",
                                            fontWeight: "700",
                                            marginTop: "0.75em",
                                            marginBottom: "0.5em",
                                            borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                                            paddingBottom: "0.3em",
                                            color: "rgb(255, 255, 255)",
                                        },
                                        "& h3": {
                                            fontSize: "1.5em",
                                            fontWeight: "600",
                                            marginTop: "0.75em",
                                            marginBottom: "0.5em",
                                            color: "rgb(245, 245, 245)",
                                        },
                                        "& h4": {
                                            fontSize: "1.25em",
                                            fontWeight: "600",
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                            color: "rgb(245, 245, 245)",
                                        },
                                        "& h5": {
                                            fontSize: "1.1em",
                                            fontWeight: "600",
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                            color: "rgb(230, 230, 230)",
                                        },
                                        "& h6": {
                                            fontSize: "1em",
                                            fontWeight: "600",
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                            color: "rgb(220, 220, 220)",
                                        },
                                        "& h1:first-child, & h2:first-child, & h3:first-child, & h4:first-child, & h5:first-child, & h6:first-child":
                                            {
                                                marginTop: "0",
                                            },
                                        "& ul, & ol": {
                                            paddingLeft: LIST_GUTTER_WIDTH,
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                        },
                                        "& ul": {
                                            listStyleType: "disc",
                                        },
                                        "& ol": {
                                            listStyleType: "decimal",
                                        },
                                        "& li": {
                                            display: "list-item",
                                            paddingLeft: LIST_ITEM_PADDING,
                                            lineHeight: LIST_ITEM_LINE_HEIGHT,
                                        },
                                        "& li:not(.task-list-item)": {
                                            marginLeft: "-0.5em",
                                        },
                                        "& li.task-list-item": {
                                            listStyleType: "none",
                                            paddingLeft: "0",
                                        },
                                        "& input[type='checkbox']": {
                                            appearance: "none !important",
                                            WebkitAppearance: "none !important",
                                            width: "16px",
                                            height: "16px",
                                            marginTop: "-2px",
                                            marginRight: CHECKBOX_SPACING,
                                            marginLeft: "0",
                                            cursor: "pointer",
                                            border: "2px solid rgba(255, 255, 255, 0.3)",
                                            borderRadius: "3px",
                                            backgroundColor: "transparent",
                                            position: "relative",
                                            left: `-${LIST_GUTTER_WIDTH}`,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            verticalAlign: "middle",
                                            flexShrink: 0,
                                            "&:checked": {
                                                backgroundColor: "rgb(59, 130, 246)",
                                                borderColor: "rgb(59, 130, 246)",
                                                "&::after": {
                                                    content: '"✓"',
                                                    color: "white",
                                                    fontSize: "12px",
                                                    fontWeight: "bold",
                                                    lineHeight: "1",
                                                },
                                            },
                                        },
                                        "& p": {
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                        },
                                        "& code:not(pre code)": {
                                            fontSize: "0.95em",
                                            backgroundColor: LIGHT_WHITE_BG,
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                        },
                                        "& pre": {
                                            backgroundColor: "rgba(0, 0, 0, 0.3)",
                                            borderRadius: "4px",
                                            padding: "12px",
                                            overflow: "auto",
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                        },
                                        "& pre code": {
                                            backgroundColor: "transparent",
                                            padding: "0",
                                            fontSize: "0.9em",
                                        },
                                        "& blockquote": {
                                            borderLeft: "4px solid rgba(255, 255, 255, 0.3)",
                                            paddingLeft: "1em",
                                            marginLeft: "0",
                                            color: "rgba(255, 255, 255, 0.8)",
                                        },
                                        "& a": {
                                            color: "rgb(96, 165, 250)",
                                            textDecoration: "underline",
                                            "&:hover": {
                                                color: "rgb(147, 197, 253)",
                                            },
                                        },
                                        "& table": {
                                            borderCollapse: "collapse",
                                            width: "100%",
                                            marginTop: "0.5em",
                                            marginBottom: "0.5em",
                                        },
                                        "& th, & td": {
                                            border: "1px solid rgba(255, 255, 255, 0.2)",
                                            padding: "8px",
                                        },
                                        "& th": {
                                            backgroundColor: "rgba(0, 0, 0, 0.3)",
                                            fontWeight: "600",
                                        },
                                        "& mjx-container": {
                                            display: "inline-block",
                                            verticalAlign: "middle",
                                        },
                                        "& mjx-container[display='true']": {
                                            display: "block",
                                            textAlign: "center",
                                            margin: "1em 0",
                                        },
                                    }}
                                >
                                    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
                                        <ReactMarkdown
                                            remarkPlugins={remarkPluginsWithItemRef}
                                            rehypePlugins={rehypePluginsMixedPreview}
                                            components={markdownComponents}
                                        >
                                            {editContent}
                                        </ReactMarkdown>
                                    </div>
                                </Box>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="h-full">
                        {previewSearchOpen && (
                            <SearchBar
                                query={previewSearchQuery}
                                onQueryChange={setPreviewSearchQuery}
                                matchCount={previewSearchCount}
                                matchIdx={previewSearchIdx}
                                // @ts-ignore
                                inputRef={previewSearchInputRef}
                                onAdvance={() =>
                                    setPreviewSearchIdx((i) =>
                                        previewSearchCount === 0 ? 0 : (i + 1) % previewSearchCount
                                    )
                                }
                                onClose={() => {
                                    setPreviewSearchOpen(false);
                                    setPreviewSearchQuery("");
                                    setPreviewSearchIdx(0);
                                    setEditorSearchOpen(false);
                                    setEditorSearchQuery("");
                                }}
                            />
                        )}
                        <Box
                            ref={viewBoxRef}
                            className="markdown-preview"
                            sx={{
                                fontSize: `${fontSize}px`,
                                height: "100%",
                                userSelect: "text",
                                cursor: "text",
                                overflowY: "auto",
                                backgroundColor: "rgb(209, 213, 219)",
                                padding: "24px",
                                ".dark &": {
                                    backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                                    color: "rgb(220, 220, 220) !important",
                                },
                                "& h1": {
                                    fontSize: "2em",
                                    fontWeight: "700",
                                    marginTop: "0.67em",
                                    marginBottom: "0.67em",
                                    borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                                    paddingBottom: "0.3em",
                                    color: "rgb(255, 255, 255)",
                                },
                                "& h2": {
                                    fontSize: "1.75em",
                                    fontWeight: "700",
                                    marginTop: "0.75em",
                                    marginBottom: "0.5em",
                                    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                                    paddingBottom: "0.3em",
                                    color: "rgb(255, 255, 255)",
                                },
                                "& h3": {
                                    fontSize: "1.5em",
                                    fontWeight: "600",
                                    marginTop: "0.75em",
                                    marginBottom: "0.5em",
                                    color: "rgb(245, 245, 245)",
                                },
                                "& h4": {
                                    fontSize: "1.25em",
                                    fontWeight: "600",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                    color: "rgb(245, 245, 245)",
                                },
                                "& h5": {
                                    fontSize: "1.1em",
                                    fontWeight: "600",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                    color: "rgb(230, 230, 230)",
                                },
                                "& h6": {
                                    fontSize: "1em",
                                    fontWeight: "600",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                    color: "rgb(220, 220, 220)",
                                },
                                "& h1:first-child, & h2:first-child, & h3:first-child, & h4:first-child, & h5:first-child, & h6:first-child":
                                    {
                                        marginTop: "0",
                                    },
                                "& ul, & ol": {
                                    paddingLeft: LIST_GUTTER_WIDTH,
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& ul": {
                                    listStyleType: "disc",
                                },
                                "& ol": {
                                    listStyleType: "decimal",
                                },
                                "& li": {
                                    display: "list-item",
                                    paddingLeft: LIST_ITEM_PADDING,
                                    lineHeight: LIST_ITEM_LINE_HEIGHT,
                                },
                                "& li:not(.task-list-item)": {
                                    marginLeft: "-0.5em",
                                },
                                "& li.task-list-item": {
                                    listStyleType: "none",
                                    paddingLeft: "0",
                                },
                                "& input[type='checkbox']": {
                                    appearance: "none !important",
                                    WebkitAppearance: "none !important",
                                    width: "16px",
                                    height: "16px",
                                    marginTop: "-2px",
                                    marginRight: CHECKBOX_SPACING,
                                    marginLeft: "0",
                                    cursor: "pointer",
                                    border: "2px solid rgba(255, 255, 255, 0.3)",
                                    borderRadius: "3px",
                                    backgroundColor: "transparent",
                                    position: "relative",
                                    left: `-${LIST_GUTTER_WIDTH}`,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    verticalAlign: "middle",
                                    flexShrink: 0,
                                    "&:checked": {
                                        backgroundColor: "rgb(59, 130, 246)",
                                        borderColor: "rgb(59, 130, 246)",
                                        "&::after": {
                                            content: '"✓"',
                                            color: "white",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            lineHeight: "1",
                                        },
                                    },
                                },
                                "& p": {
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& code:not(pre code)": {
                                    fontSize: "0.95em",
                                    backgroundColor: LIGHT_WHITE_BG,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                },
                                "& pre": {
                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                    borderRadius: "4px",
                                    padding: "12px",
                                    overflow: "auto",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& pre code": {
                                    backgroundColor: "transparent",
                                    padding: "0",
                                    fontSize: "0.9em",
                                },
                                "& blockquote": {
                                    borderLeft: "4px solid rgba(255, 255, 255, 0.3)",
                                    paddingLeft: "1em",
                                    marginLeft: "0",
                                    color: "rgba(255, 255, 255, 0.8)",
                                },
                                "& a": {
                                    color: "rgb(96, 165, 250)",
                                    textDecoration: "underline",
                                    "&:hover": {
                                        color: "rgb(147, 197, 253)",
                                    },
                                },
                                "& table": {
                                    borderCollapse: "collapse",
                                    width: "100%",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& th, & td": {
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    padding: "8px",
                                },
                                "& th": {
                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                    fontWeight: "600",
                                },
                                "& mjx-container": {
                                    display: "inline-block",
                                    verticalAlign: "middle",
                                },
                                "& mjx-container[display='true']": {
                                    display: "block",
                                    textAlign: "center",
                                    margin: "1em 0",
                                },
                            }}
                            onDoubleClick={() =>
                                patch({ isEditMode: true, editName: script?.name || "" })
                            }
                        >
                            <div style={{ maxWidth: "860px", margin: "0 auto" }}>
                                <ReactMarkdown
                                    key={script?.command}
                                    remarkPlugins={remarkPluginsWithItemRef}
                                    rehypePlugins={rehypePluginsViewPreview}
                                    components={markdownComponents}
                                >
                                    {script?.command || ""}
                                </ReactMarkdown>
                            </div>
                        </Box>
                    </div>
                )}
            </div>
        </div>
    );
}
