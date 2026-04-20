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
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Edit, Eye, AlignLeft, Columns2, Globe } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
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
    h1, h2, h3, h4, h5, h6 { color: #1f2328; margin-top: 1.5em; }
    h1 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; }
    a { color: #0969da; }
    code:not(pre code) { background: #f6f8fa; border: 1px solid #d0d7de; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow: auto; }
    blockquote { border-left: 4px solid #d0d7de; margin-left: 0; padding-left: 1em; color: #57606a; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; }
    input[type="checkbox"] { margin-right: 6px; }
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
            if (((e.metaKey || e.ctrlKey) && e.key === "w") || e.key === "Escape") {
                e.preventDefault();
                // Drive the close from Rust via invoke so WKWebView teardown happens
                // entirely outside the JS event-handler stack — prevents SIGSEGV on macOS.
                invoke("close_subwindow", { label: getCurrentWindow().label });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, handleSaveEdit]);

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
        setEditContent(content);
        latestContentRef.current = content;
        // Seed the undo stack with the real content
        undoStackRef.current = [content];
        undoIndexRef.current = 0;
        setEditorReady(true);
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
            if (ie.inputType === "historyUndo" || ie.inputType === "historyRedo") {
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

            const arrayBuffer = await blob.arrayBuffer();
            const bytes = Array.from(new Uint8Array(arrayBuffer));

            try {
                const filename = await invoke<string>("save_pasted_image", { data: bytes });
                const insertion = `![pasted image](images/${filename}?width=500)`;
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

    const markdownComponents = useMemo(() => {
        return {
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
                                <div className="flex items-center rounded overflow-hidden border border-neutral-600">
                                    <button
                                        onClick={() => setEditViewMode("plain")}
                                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
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
                                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
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
                        <div
                            ref={editorWrapperRef}
                            className="h-full overflow-auto bg-[#1e1e1e] p-4"
                        >
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
                    ) : (
                        <div
                            className="flex h-full"
                            style={{ userSelect: isDraggingRef.current ? "none" : undefined }}
                        >
                            {/* Left: editor */}
                            <div
                                ref={editorWrapperRef}
                                style={{ width: `${splitRatio}%` }}
                                className="h-full overflow-auto bg-[#1e1e1e] flex-shrink-0"
                            >
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

                            {/* Divider */}
                            <div
                                className="w-1 cursor-col-resize bg-neutral-600 hover:bg-blue-500 flex-shrink-0 transition-colors"
                                onMouseDown={() => {
                                    isDraggingRef.current = true;
                                }}
                            />

                            {/* Right: live preview */}
                            <Box
                                className="markdown-preview"
                                style={{ width: `${100 - splitRatio}%` }}
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
                                    rehypePlugins={[
                                        rehypeHighlight,
                                        rehypeMathjax,
                                        rehypeAddSourceLines,
                                    ]}
                                    components={markdownComponents}
                                >
                                    {editContent}
                                </ReactMarkdown>
                            </Box>
                        </div>
                    )
                ) : (
                    <Box
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
                            rehypePlugins={[rehypeHighlight, rehypeMathjax]}
                            components={markdownComponents}
                        >
                            {script?.command || ""}
                        </ReactMarkdown>
                    </Box>
                )}
            </div>
        </div>
    );
}
