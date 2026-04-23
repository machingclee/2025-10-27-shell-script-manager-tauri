import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeMathjax from "rehype-mathjax";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { scriptApi } from "@/store/api/scriptApi";
import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Edit, Eye, AlignLeft, Columns2, Globe } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { convertFileSrc } from "@tauri-apps/api/core";
import SimpleEditor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-tomorrow.css";

const LIGHT_WHITE_BG = "rgba(255, 255, 255, 0.2)";

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
                            children: [{ type: "text", value: node.value.slice(found, found + q.length) }],
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
                    if (e.key === "Enter") { e.preventDefault(); onAdvance(); }
                    if (e.key === "Escape") { e.preventDefault(); onClose(); }
                }}
                placeholder="Search…"
                className="bg-transparent text-white text-sm outline-none w-44 placeholder-neutral-500"
            />
            <span className="text-neutral-400 text-xs min-w-[3rem] text-right select-none">
                {query.trim() ? (matchCount > 0 ? `${matchIdx + 1}/${matchCount}` : "0/0") : ""}
            </span>
            <button
                onMouseDown={(e) => { e.preventDefault(); onClose(); }}
                className="text-neutral-400 hover:text-white leading-none"
                aria-label="Close search"
            >
                ✕
            </button>
        </div>
    );
}

export default function MarkdownEditor({ scriptId }: { scriptId: number | undefined }) {
    const dispatch = useAppDispatch();

    const { data: script, isLoading: scriptIsLoading } = scriptApi.endpoints.getScriptById.useQuery(
        scriptId,
        {
            skip: !(scriptId != null),
        }
    );

    // Read editMode from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const editModeFromUrl = urlParams.get("editMode") === "true";

    const [isEditMode, setIsEditMode] = useState(editModeFromUrl);
    const [editContent, setEditContent] = useState("");
    const [editName, setEditName] = useState("");
    const [edited, setEdited] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [splitRatio, setSplitRatio] = useState(50);
    const [editViewMode, setEditViewMode] = useState<"plain" | "mixed">("mixed");
    // Only true after useEffect has seeded editContent from the real script data.
    // Prevents SimpleEditor from mounting with an empty string and letting
    // WKWebView's NSUndoManager record "" → content as an undoable action.
    const [editorReady, setEditorReady] = useState(false);
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const latestContentRef = useRef("");
    const handleSaveEditRef = useRef<((closeEditMode?: boolean) => Promise<void>) | null>(null);
    const imagesDirRef = useRef<string | null>(null);
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
            imagesDirRef.current = dir;
        });
    }, []);

    // Split-pane drag handling
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const pct = (e.clientX / window.innerWidth) * 100;
            setSplitRatio(Math.min(80, Math.max(20, pct)));
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

    const pushHistory = useCallback((content: string) => {
        if (isUndoingRef.current) return; // ignore changes triggered by our own undo/redo
        const stack = undoStackRef.current.slice(0, undoIndexRef.current + 1);
        stack.push(content);
        if (stack.length > 500) stack.shift();
        undoStackRef.current = stack;
        undoIndexRef.current = stack.length - 1;
    }, []);

    const handleEnableEdit = () => {
        setIsEditMode(true);
        setEditName(script?.name || "");
    };

    const handleViewAsHtml = async () => {
        if (!script) return;
        try {
            const imagesDir = imagesDirRef.current ?? "";
            const resolvedMarkdown = (script.command || "").replace(
                /!\[([^\]]*)\]\(images\/([^)]+)\)/g,
                (_match, altText, rest) => {
                    const filename = rest.replace(/\?width=\d+$/, "");
                    const widthMatch = rest.match(/\?width=(\d+)/);
                    const widthAttr = widthMatch ? ` width="${widthMatch[1]}"` : "";
                    return `<img src="file://${imagesDir}/${filename}" alt="${altText}"${widthAttr} style="max-width:100%" />`;
                }
            );
            const file = await unified()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkMath)
                .use(remarkRehype, { allowDangerousHtml: true })
                .use(rehypeHighlight)
                .use(rehypeMathjax)
                .use(rehypeStringify, { allowDangerousHtml: true })
                .process(resolvedMarkdown);
            const bodyHtml = String(file);
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${script.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; background: #ffffff; color: #1f2328; line-height: 1.7; }
    h1 { font-size: 2em; font-weight: 700; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; margin-top: 0.67em; margin-bottom: 0.67em; }
    h2 { font-size: 1.75em; font-weight: 700; border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; margin-top: 0.75em; margin-bottom: 0.5em; }
    h3 { font-size: 1.5em; font-weight: 600; margin-top: 0.75em; margin-bottom: 0.5em; }
    h4 { font-size: 1.25em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    h5 { font-size: 1.1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    h6 { font-size: 1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    p { margin-top: 0.5em; margin-bottom: 0.5em; }
    a { color: #0969da; text-decoration: underline; }
    ul, ol { padding-left: 2em; margin-top: 0.5em; margin-bottom: 0.5em; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { display: list-item; padding-left: 0.5em; line-height: 1.4; }
    ul.contains-task-list { padding-left: 2em; }
    li.task-list-item { list-style: none; padding-left: 0; }
    input[type="checkbox"] {
      appearance: none; -webkit-appearance: none;
      width: 16px; height: 16px;
      margin-top: -2px; margin-right: -1.5em; margin-left: 0;
      cursor: pointer;
      border: 2px solid #999; border-radius: 3px;
      background-color: transparent;
      position: relative; left: -2em;
      display: inline-flex; align-items: center; justify-content: center;
      vertical-align: middle; flex-shrink: 0;
    }
    input[type="checkbox"]:checked { background-color: rgb(59,130,246); border-color: rgb(59,130,246); }
    input[type="checkbox"]:checked::after { content: "✓"; color: white; font-size: 12px; font-weight: bold; line-height: 1; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); }
    code:not(pre code) { background: #f6f8fa; border: 1px solid #d0d7de; padding: 2px 6px; border-radius: 4px; font-size: 0.95em; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow: auto; margin-top: 0.5em; margin-bottom: 0.5em; }
    pre code.hljs { background: transparent; padding: 0; font-size: 0.9em; }
    blockquote { border-left: 4px solid #d0d7de; margin-left: 0; padding-left: 1em; color: #57606a; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5em; margin-bottom: 0.5em; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; border-radius: 4px; }
    mjx-container { display: inline-block; vertical-align: middle; }
    mjx-container[display="true"] { display: block; text-align: center; margin: 1em 0; }
  </style>
</head>
<body>
  <h1 style="margin-top:0">${script.name}</h1>
  ${bodyHtml}
</body>
</html>`;
            await invoke("write_and_open_html", { html });
        } catch (error) {
            console.error("Failed to open as HTML:", error);
        }
    };

    // Initialize editName when script loads if starting in edit mode
    useEffect(() => {
        if (editModeFromUrl && script) {
            setEditName(script.name || "");
        }
    }, [script, editModeFromUrl]);

    const handleSaveEdit = useCallback(
        async (closeEditMode: boolean = true) => {
            if (!script) {
                return;
            }

            await updateMarkdown({
                ...script,
                name: editName,
                command: editContent,
            }).unwrap();

            setHasChanges(false);
            setEdited(true);
            setTimeout(() => setEdited(false), 2000);

            if (closeEditMode) {
                setIsEditMode(false);
            }

            dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));

            // Notify main window to refresh its data
            await emit("markdown-updated", { scriptId: script.id });
        },
        [script, editName, editContent, updateMarkdown, dispatch]
    );

    // Keep ref updated with latest handleSaveEdit
    useEffect(() => {
        handleSaveEditRef.current = handleSaveEdit;
    }, [handleSaveEdit]);

    // Global Cmd+S handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (isEditMode) {
                    handleSaveEdit(false);
                }
            }

            // Cmd+W or Esc to close window
            if ((e.metaKey || e.ctrlKey) && e.key === "w") {
                e.preventDefault();
                // Drive the close from Rust via invoke so WKWebView teardown happens
                // entirely outside the JS event-handler stack — prevents SIGSEGV on macOS.
                invoke("close_subwindow", { label: getCurrentWindow().label });
            }

            // Cmd+F — open search bar(s)
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                if (isEditMode) {
                    setEditorSearchOpen(true);
                    setTimeout(() => editorSearchInputRef.current?.focus(), 0);
                    if (editViewMode === "mixed") {
                        setPreviewSearchOpen(true);
                        // focus editor search (preview search is secondary)
                    }
                } else {
                    setPreviewSearchOpen(true);
                    setTimeout(() => previewSearchInputRef.current?.focus(), 0);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, editViewMode, handleSaveEdit]);

    const handleCancelEdit = () => {
        setEditContent(script?.command || "");
        setIsEditMode(false);
    };

    // const handleClose = () => {
    //     // Close the window
    //     getCurrentWindow().close();
    // };

    const endEditButton = () => {
        return (
            <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
            >
                End Edit
            </Button>
        );
    };

    // const closeButton = () => {
    //     return (
    //         <Button
    //             variant="outline"
    //             onClick={handleClose}
    //             className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
    //         >
    //             Close
    //         </Button>
    //     );
    // };

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
            setHasChanges(true);
            setEdited(false);
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
    }, [script]);

    // Add Cmd+S keyboard shortcut for saving
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (isEditMode && script) {
                    await handleSaveEdit(false);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, script, editName, editContent]);

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

        const handler = (e: KeyboardEvent) => {
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
                setHasChanges(true);
                setEdited(false);
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
            const lineTop = 16 + lineNum * 22.5;
            wrapper.scrollTop = Math.max(0, lineTop - wrapper.clientHeight / 2 + 11);
        }
    }, [editorSearchIdx, editorSearchMatches, editorSearchQuery, editorSearchOpen, editContent]);

    // ── Preview search ─────────────────────────────────────────────────────────
    // After ReactMarkdown commits (with marks already injected by the rehype plugin),
    // highlight the active mark differently and scroll to it.
    useLayoutEffect(() => {
        if (!previewSearchOpen || !previewSearchQuery.trim()) {
            setPreviewSearchCount(0);
            return;
        }
        const container = (isEditMode ? previewBoxRef.current : viewBoxRef.current) as HTMLElement | null;
        if (!container) return;
        const marks = Array.from(container.querySelectorAll<HTMLElement>("mark.search-mark"));
        setPreviewSearchCount(marks.length);
        if (marks.length === 0) return;
        const idx = previewSearchIdx % marks.length;
        marks.forEach((m, i) => {
            m.style.backgroundColor = i === idx ? "rgba(255, 160, 0, 0.7)" : "rgba(255, 210, 0, 0.35)";
            m.style.color = "inherit";
            m.style.borderRadius = "2px";
            m.style.padding = "1px 0";
        });
        marks[idx].scrollIntoView({ block: "center" });
    }, [previewSearchIdx, previewSearchOpen, previewSearchQuery, isEditMode, editContent, script?.command]);

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
        [editContent, scrollPreviewToLine]
    );

    const handlePreviewDoubleClick = useCallback(
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
                            const FONT_SIZE = 15;
                            const LINE_HEIGHT = FONT_SIZE * 1.5; // matches SimpleEditor style
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

    const handleEditorKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
            const wrapPairs: Record<string, string> = {
                "*": "*",
                _: "_",
                "`": "`",
                "(": ")",
                "[": "]",
                "{": "}",
                '"': '"',
                "'": "'",
            };

            const close = wrapPairs[e.key];
            if (!close) return;

            const textarea = e.currentTarget as HTMLTextAreaElement;
            const { selectionStart, selectionEnd } = textarea;
            if (selectionStart === selectionEnd) return; // no selection — normal typing

            e.preventDefault();
            const selected = editContent.slice(selectionStart, selectionEnd);
            const newContent =
                editContent.slice(0, selectionStart) +
                e.key +
                selected +
                close +
                editContent.slice(selectionEnd);

            setEditContent(newContent);
            pushHistory(newContent);
            setHasChanges(true);
            setEdited(false);

            // Restore the selection inside the wrap characters after React re-render
            requestAnimationFrame(() => {
                textarea.selectionStart = selectionStart + 1;
                textarea.selectionEnd = selectionEnd + 1;
            });
        },
        [editContent, pushHistory]
    );

    // Rehype plugin that highlights all preview occurrences of the search query
    const rehypeSearchHighlightPlugin = useMemo(
        () => makeRehypeSearchHighlight(previewSearchQuery),
        [previewSearchQuery]
    );
    // Stable plugin arrays so ReactMarkdown doesn't recompile on unrelated re-renders
    const rehypePluginsMixedPreview = useMemo(
        () => [rehypeHighlight, rehypeMathjax, rehypeAddSourceLines, rehypeSearchHighlightPlugin] as any[],
        [rehypeSearchHighlightPlugin]
    );
    const rehypePluginsViewPreview = useMemo(
        () => [rehypeHighlight, rehypeMathjax, rehypeSearchHighlightPlugin] as any[],
        [rehypeSearchHighlightPlugin]
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
                parts.push(editContent.slice(last, found).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            }
            const isActive = matchNum === editorSearchIdx;
            const chunk = editContent.slice(found, found + q.length).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            parts.push(`<mark class="editor-search-mark${isActive ? " active" : ""}">${chunk}</mark>`);
            last = found + q.length;
            matchNum++;
            pos = found + 1;
        }
        if (last < editContent.length) {
            parts.push(editContent.slice(last).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
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
                const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
                const cleanPath = src?.replace(/\?width=\d+$/, "") ?? "";

                let imgSrc = cleanPath;
                if (cleanPath.startsWith("images/") && imagesDirRef.current) {
                    const filename = cleanPath.replace(/^images\//, "");
                    imgSrc = convertFileSrc(`${imagesDirRef.current}/${filename}`);
                }

                return (
                    <img
                        src={imgSrc}
                        alt={alt ?? ""}
                        style={{
                            maxWidth: "100%",
                            borderRadius: "4px",
                            ...(width ? { width: `${width}px` } : {}),
                        }}
                    />
                );
            },
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
    }, [script?.command]);

    return (
        <div className="h-screen w-screen bg-white dark:bg-neutral-800 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                        {isEditMode ? (
                            <Edit className="w-5 h-5 text-black dark:text-white" />
                        ) : (
                            <Eye className="w-5 h-5 text-black dark:text-white" />
                        )}
                        {isEditMode ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => {
                                    setEditName(e.target.value);
                                    setHasChanges(true);
                                    setEdited(false);
                                }}
                                className="text-lg font-semibold bg-transparent border border-gray-300 dark:border-neutral-600 focus:outline-none focus:border-blue-500 text-black dark:text-white px-2 py-1 rounded flex-1 max-w-md"
                                placeholder="Markdown name"
                            />
                        ) : (
                            <h2
                                className="text-lg font-semibold text-black dark:text-white cursor-pointer"
                                onDoubleClick={handleEnableEdit}
                            >
                                {script?.name}
                            </h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditMode && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {edited ? "Saved" : hasChanges ? "Not Saved" : ""}
                            </span>
                        )}
                        {!isEditMode ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleViewAsHtml}
                                    className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                                >
                                    <Globe className="w-4 h-4 mr-2" />
                                    View as HTML
                                </Button>
                                <Button
                                    onClick={handleEnableEdit}
                                    className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center rounded-lg overflow-hidden border border-neutral-600">
                                    <button
                                        onClick={() => setEditViewMode("plain")}
                                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none ${
                                            editViewMode === "plain"
                                                ? "bg-neutral-600 text-white"
                                                : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                                        }`}
                                    >
                                        <AlignLeft className="w-3.5 h-3.5" />
                                        Plain Text
                                    </button>
                                    <button
                                        onClick={() => setEditViewMode("mixed")}
                                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none ${
                                            editViewMode === "mixed"
                                                ? "bg-neutral-600 text-white"
                                                : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                                        }`}
                                    >
                                        <Columns2 className="w-3.5 h-3.5" />
                                        Mixed
                                    </button>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleViewAsHtml}
                                    className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                                >
                                    <Globe className="w-4 h-4 mr-2" />
                                    View as HTML
                                </Button>
                                <Button
                                    onClick={() => handleSaveEdit(true)}
                                    disabled={!hasChanges}
                                    className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                                >
                                    Save Changes
                                </Button>
                                {endEditButton()}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {scriptIsLoading || (isEditMode && !editorReady) ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500 dark:text-gray-400">
                            Loading script data...
                        </div>
                    </div>
                ) : isEditMode ? (
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
                                    onAdvance={() => setEditorSearchIdx((i) => editorSearchMatches.length === 0 ? 0 : (i + 1) % editorSearchMatches.length)}
                                    onClose={() => { setEditorSearchOpen(false); setEditorSearchQuery(""); }}
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
                                            fontFamily: '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                            fontSize: "15px",
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
                                        setHasChanges(true);
                                        setEdited(false);
                                        pushHistory(code);
                                    }}
                                    highlight={(code) =>
                                        highlight(code, languages.markdown, "markdown")
                                    }
                                    padding={16}
                                    style={{
                                        fontFamily:
                                            '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                        fontSize: 15,
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
                                    width: `${splitRatio}%`,
                                    pointerEvents: isDragging ? "none" : undefined,
                                    userSelect: isDragging ? "none" : undefined,
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
                                        onAdvance={() => setEditorSearchIdx((i) => editorSearchMatches.length === 0 ? 0 : (i + 1) % editorSearchMatches.length)}
                                        onClose={() => { setEditorSearchOpen(false); setEditorSearchQuery(""); setPreviewSearchOpen(false); setPreviewSearchQuery(""); setPreviewSearchIdx(0); }}
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
                                                fontFamily: '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                                fontSize: "15px",
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
                                            setHasChanges(true);
                                            setEdited(false);
                                            pushHistory(code);
                                        }}
                                        highlight={(code) =>
                                            highlight(code, languages.markdown, "markdown")
                                        }
                                        padding={16}
                                        style={{
                                            fontFamily:
                                                '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                            fontSize: 15,
                                            lineHeight: 1.5,
                                            minHeight: "100%",
                                            backgroundColor: "#1e1e1e",
                                            color: "#d4d4d4",
                                        }}
                                        textareaClassName="focus:outline-none"
                                        onKeyDown={handleEditorKeyDown}
                                        onKeyUp={() => handleEditorCursorChange(false)}
                                        onDoubleClick={() => handleEditorCursorChange(true)}
                                    />
                                </div>
                            </div>

                            {/* Divider */}
                            <div
                                className="w-1 cursor-col-resize bg-neutral-600 hover:bg-blue-500 flex-shrink-0 transition-colors"
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
                            <div className="h-full" style={{ width: `${100 - splitRatio}%` }}>
                                {previewSearchOpen && (
                                    <SearchBar
                                        query={previewSearchQuery}
                                        onQueryChange={setPreviewSearchQuery}
                                        matchCount={previewSearchCount}
                                        matchIdx={previewSearchIdx}
                                        // @ts-ignore
                                        inputRef={previewSearchInputRef}
                                        onAdvance={() => setPreviewSearchIdx((i) => previewSearchCount === 0 ? 0 : (i + 1) % previewSearchCount)}
                                        onClose={() => { setPreviewSearchOpen(false); setPreviewSearchQuery(""); setPreviewSearchIdx(0); setEditorSearchOpen(false); setEditorSearchQuery(""); }}
                                    />
                                )}
                            <Box
                                ref={previewBoxRef}
                                className="markdown-preview"
                                style={{ width: "100%" }}
                                onDoubleClick={handlePreviewDoubleClick}
                                sx={{
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
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={rehypePluginsMixedPreview}
                                    components={markdownComponents}
                                >
                                    {editContent}
                                </ReactMarkdown>
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
                                onAdvance={() => setPreviewSearchIdx((i) => previewSearchCount === 0 ? 0 : (i + 1) % previewSearchCount)}
                                onClose={() => { setPreviewSearchOpen(false); setPreviewSearchQuery(""); setPreviewSearchIdx(0); setEditorSearchOpen(false); setEditorSearchQuery(""); }}
                            />
                        )}
                        <Box
                            ref={viewBoxRef}
                            className="markdown-preview"
                            sx={{
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
                            onDoubleClick={handleEnableEdit}
                        >
                            <ReactMarkdown
                                key={script?.command}
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={rehypePluginsViewPreview}
                                components={markdownComponents}
                            >
                                {script?.command || ""}
                            </ReactMarkdown>
                        </Box>
                    </div>
                )}
            </div>
        </div>
    );
}
