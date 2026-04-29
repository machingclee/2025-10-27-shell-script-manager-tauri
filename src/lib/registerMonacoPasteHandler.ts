import * as monaco from "monaco-editor";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { invoke } from "@tauri-apps/api/core";

type RawImage = { width: number; height: number; rgba: number[] };

// Standalone Monaco's markdown language config does not register these as
// auto-surround pairs (unlike the full VS Code markdown extension), so we
// implement the wrapping ourselves.
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

export interface MarkdownEditorBehaviorOptions {
    /** Called when the user double-clicks a line. Omit to disable. */
    onDoubleClickLine?: (lineNum: number) => void;
}

function replaceCurrentSelection(
    editorInstance: MonacoEditorNS.IStandaloneCodeEditor,
    text: string
) {
    const model = editorInstance.getModel();
    const selection = editorInstance.getSelection();
    if (!model || !selection) return;

    // Compute where the cursor should end up after pasting `text`, starting
    // from the selection's start position. We do this from the text itself
    // (not via model.getPositionAt) so that multi-line pastes land correctly.
    const start = selection.getStartPosition();
    const lines = text.split("\n");
    const endLine = start.lineNumber + lines.length - 1;
    const endColumn =
        lines.length === 1 ? start.column + text.length : lines[lines.length - 1].length + 1;

    editorInstance.executeEdits(
        "paste",
        [{ range: selection, text, forceMoveMarkers: true }],
        [new monaco.Selection(endLine, endColumn, endLine, endColumn)]
    );
}

/**
 * Registers all standard markdown editor behaviors on a Monaco instance:
 *  - Cmd+V: image + text paste via Rust/arboard (no macOS permission dialog)
 *  - Pair-wrapping for selected text (* _ ` ( [ { " ') — not in standalone Monaco's markdown config
 *  - Double-click line callback (optional)
 *  - Post-animation layout pass
 *
 * Call this inside an editor's `onMount` callback.
 */
export function registerMarkdownEditorBehaviors(
    editorInstance: MonacoEditorNS.IStandaloneCodeEditor,
    options: MarkdownEditorBehaviorOptions = {}
): void {
    // Cmd+V: image via Rust, then text via Rust — no macOS permission dialog.
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, async () => {
        const imgData = await invoke<RawImage | null>("read_clipboard_image").catch(() => null);

        if (imgData) {
            const { width, height, rgba } = imgData;
            const MAX_WIDTH = 1400;
            const scale = width > MAX_WIDTH ? MAX_WIDTH / width : 1;
            const w = Math.round(width * scale);
            const h = Math.round(height * scale);

            const src = document.createElement("canvas");
            src.width = width;
            src.height = height;
            src.getContext("2d")!.putImageData(
                new ImageData(new Uint8ClampedArray(rgba), width, height),
                0,
                0
            );
            const out = document.createElement("canvas");
            out.width = w;
            out.height = h;
            out.getContext("2d")!.drawImage(src, 0, 0, w, h);

            const blob = await new Promise<Blob | null>((resolve) =>
                out.toBlob(resolve, "image/png")
            );
            if (!blob) return;

            const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
            const filename = await invoke<string>("save_pasted_image", { data: bytes });
            replaceCurrentSelection(editorInstance, `![pasted image](images/${filename})`);
            return;
        }

        const text = await invoke<string | null>("read_clipboard_text").catch(() => null);
        if (text) {
            replaceCurrentSelection(editorInstance, text);
        }
    });

    // Pair-wrapping: standalone Monaco's markdown language does not register
    // these as auto-surround pairs, so we do it manually.
    Object.entries(WRAP_PAIRS).forEach(([open, close]) => {
        editorInstance.onKeyDown((e) => {
            if (e.browserEvent.key !== open) return;
            // Let Cmd/Ctrl/Alt combinations (e.g. Cmd+[) fall through to Monaco's
            // built-in keybindings (indent, outdent, etc.).
            if (e.ctrlKey || e.metaKey || e.altKey) return;
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

    // Optional double-click line callback.
    if (options.onDoubleClickLine) {
        const cb = options.onDoubleClickLine;
        editorInstance.onMouseDown((e) => {
            if (e.event.detail === 2) {
                const line = e.target.position?.lineNumber;
                if (line != null) cb(line);
            }
        });
    }

    // Force a layout pass after any dialog/window animation finishes.
    requestAnimationFrame(() => requestAnimationFrame(() => editorInstance.layout()));
}

/** @deprecated Use registerMarkdownEditorBehaviors instead. */
export const registerMonacoPasteHandler = registerMarkdownEditorBehaviors;
