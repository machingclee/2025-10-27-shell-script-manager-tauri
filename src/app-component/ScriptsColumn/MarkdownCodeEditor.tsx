import { useRef, useCallback } from "react";
import Editor, { loader } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import * as monaco from "monaco-editor";
import { registerMarkdownEditorBehaviors } from "@/lib/registerMonacoPasteHandler";

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

            registerMarkdownEditorBehaviors(editorInstance, {
                onDoubleClickLine: (line) => onScrollRef.current(line, true),
            });
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
                    lineNumbers: "off",
                    glyphMargin: false,
                    folding: false,
                    tabSize: 2,
                    insertSpaces: true,
                    detectIndentation: false,
                    contextmenu: false,
                    quickSuggestions: false,
                    suggestOnTriggerCharacters: false,
                    wordBasedSuggestions: "off",
                    parameterHints: { enabled: false },
                    // Disable Monaco's custom accessibility textarea input path so
                    // that CJK IME composition (e.g. 倉頡) is handled natively by
                    // the browser — prevents the double-text duplication bug.
                    accessibilitySupport: "off",
                }}
            />
        </div>
    );
}
