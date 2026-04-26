import { useRef, useCallback } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import * as monaco from "monaco-editor";
import { invoke } from "@tauri-apps/api/core";

// Use the locally-installed monaco-editor (offline / Tauri)
loader.config({ monaco });

export interface MarkdownCodeEditorProps {
    editContent: string;
    fontSize: number;
    /** Saved scroll position to restore when the editor first mounts. */
    savedScrollTop: number;
    /** Ref to be populated with the Monaco editor instance after mount. */
    editorRef: React.MutableRefObject<MonacoEditorNS.IStandaloneCodeEditor | null>;
    onChange: (value: string) => void;
    /** Called when the user double-clicks a line; triggers preview scroll+flash. */
    onScrollPreviewToLine: (lineNum: number, flash: boolean) => void;
}

export default function MarkdownCodeEditor({
    editContent,
    fontSize,
    savedScrollTop,
    editorRef,
    onChange,
    onScrollPreviewToLine,
}: MarkdownCodeEditorProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    // Keep a stable ref so handleEditorMount (which captures on first mount)
    // always calls the latest version of onScrollPreviewToLine.
    const onScrollRef = useRef(onScrollPreviewToLine);
    onScrollRef.current = onScrollPreviewToLine;

    const handleEditorMount = useCallback(
        (editorInstance: MonacoEditorNS.IStandaloneCodeEditor) => {
            editorRef.current = editorInstance;

            // Restore saved scroll position after Monaco is fully initialised.
            if (savedScrollTop) {
                requestAnimationFrame(() => {
                    editorInstance.setScrollTop(savedScrollTop);
                });
            }

            // Override paste to support image clipboard items
            editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, async () => {
                try {
                    const clipboardItems = await navigator.clipboard.read();
                    const imageItem = clipboardItems.find((item) =>
                        item.types.some((t) => t.startsWith("image/"))
                    );
                    if (imageItem) {
                        const imageType = imageItem.types.find((t) => t.startsWith("image/"))!;
                        const blob = await imageItem.getType(imageType);

                        // Compress via canvas
                        const compressedBlob = await (async () => {
                            try {
                                const bitmap = await createImageBitmap(blob);
                                const MAX_WIDTH = 1400;
                                const scale =
                                    bitmap.width > MAX_WIDTH ? MAX_WIDTH / bitmap.width : 1;
                                const w = Math.round(bitmap.width * scale);
                                const h = Math.round(bitmap.height * scale);
                                const canvas = document.createElement("canvas");
                                canvas.width = w;
                                canvas.height = h;
                                canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
                                bitmap.close();
                                return await new Promise<Blob>((resolve, reject) => {
                                    canvas.toBlob(
                                        (b) =>
                                            b
                                                ? resolve(b)
                                                : reject(new Error("canvas.toBlob failed")),
                                        "image/jpeg",
                                        0.85
                                    );
                                });
                            } catch {
                                return blob;
                            }
                        })();

                        const bytes = Array.from(
                            new Uint8Array(await compressedBlob.arrayBuffer())
                        );
                        const filename = await invoke<string>("save_pasted_image", { data: bytes });
                        const insertion = `![pasted image](images/${filename})`;
                        editorInstance.trigger("keyboard", "type", { text: insertion });
                    } else {
                        editorInstance.trigger(
                            "keyboard",
                            "editor.action.clipboardPasteAction",
                            {}
                        );
                    }
                } catch {
                    editorInstance.trigger("keyboard", "editor.action.clipboardPasteAction", {});
                }
            });

            // Pair-wrapping via Monaco API
            const WRAP_PAIRS: Record<string, string> = {
                "*": "*",
                _: "_",
                "`": "`",
                "(": ")",
                "[": "]",
                "{": "}",
                '"': '"',
                "'": "'",
            };
            Object.entries(WRAP_PAIRS).forEach(([open, close]) => {
                editorInstance.onKeyDown((e) => {
                    if (e.browserEvent.key !== open) return;
                    const sel = editorInstance.getSelection();
                    if (!sel || sel.isEmpty()) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const selectedText = editorInstance.getModel()!.getValueInRange(sel);
                    editorInstance.executeEdits("wrap", [
                        { range: sel, text: open + selectedText + close },
                    ]);
                });
            });

            // Indent / dedent via Cmd+] / Cmd+[
            editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight, () => {
                editorInstance.trigger("keyboard", "editor.action.indentLines", {});
            });
            editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft, () => {
                editorInstance.trigger("keyboard", "editor.action.outdentLines", {});
            });

            // Double-click → scroll + flash the corresponding preview element
            editorInstance.onMouseDown((e) => {
                if (e.event.detail === 2) {
                    const line = e.target.position?.lineNumber;
                    if (line != null) onScrollRef.current(line, true);
                }
            });

            // Force a layout pass after the window/dialog animation finishes so
            // Monaco measures the correct container dimensions (fixes garbled text
            // when opened in a subwindow or dialog while a CSS transition is active).
            requestAnimationFrame(() => requestAnimationFrame(() => editorInstance.layout()));
        },
        // savedScrollTop and onScrollPreviewToLine are both stable at mount time
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    return (
        <div ref={wrapperRef} className="h-full overflow-hidden bg-[#1e1e1e] relative">
            <Editor
                height="100%"
                defaultLanguage="markdown"
                value={editContent}
                theme="vs-dark"
                onMount={handleEditorMount}
                onChange={(value) => onChange(value ?? "")}
                options={{
                    fontSize,
                    lineHeight: fontSize * 1.5,
                    fontFamily: '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                    wordWrap: "on",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    renderWhitespace: "none",
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    scrollbar: { vertical: "auto", horizontal: "hidden" },
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: false,
                    tabSize: 2,
                    insertSpaces: true,
                    detectIndentation: false,
                    contextmenu: false,
                }}
            />
        </div>
    );
}
