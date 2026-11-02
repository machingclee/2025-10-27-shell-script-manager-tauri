import * as monaco from "monaco-editor";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { invoke } from "@tauri-apps/api/core";

type RawImage = { width: number; height: number; rgba: number[] };

type WrapPair = { open: string; close: string };

// Standalone Monaco's markdown language config does not register these as
// auto-surround pairs (unlike the full VS Code markdown extension), so we
// implement the wrapping ourselves. Keyed by `e.code` (the physical key).
// `shift` selects which character that key types on a plain English layout.
const WRAP_BY_CODE: Record<string, WrapPair & { shift: boolean }> = {
    Digit8: { open: "*", close: "*", shift: true },
    Minus: { open: "_", close: "_", shift: true },
    Backquote: { open: "`", close: "`", shift: false },
    Digit9: { open: "(", close: ")", shift: true },
    BracketLeft: { open: "[", close: "]", shift: false },
    BracketRight: { open: "{", close: "}", shift: true },
    Quote: { open: "'", close: "'", shift: false },
    "Quote+shift": { open: '"', close: '"', shift: true },
};

// With a Chinese IME active, Shift+8 still inserts "*" but the keydown no longer
// looks like Shift+Digit8: `code` is often "" and `key` is "Process", or Shift is
// cleared while the inserted character is "*". Fullwidth forms are what some IMEs
// emit for the same key; wrapping always uses the ASCII markdown marker.
const WRAP_BY_INSERTED: Record<string, WrapPair> = {
    "*": { open: "*", close: "*" },
    "＊": { open: "*", close: "*" },
    _: { open: "_", close: "_" },
    "＿": { open: "_", close: "_" },
    "`": { open: "`", close: "`" },
    "｀": { open: "`", close: "`" },
    "(": { open: "(", close: ")" },
    "（": { open: "(", close: ")" },
    "[": { open: "[", close: "]" },
    "［": { open: "[", close: "]" },
    "{": { open: "{", close: "}" },
    "｛": { open: "{", close: "}" },
    '"': { open: '"', close: '"' },
    "＂": { open: '"', close: '"' },
    "'": { open: "'", close: "'" },
    "＇": { open: "'", close: "'" },
};

let markdownSurroundRestored = false;

/**
 * Monaco must not surround "*" itself. A Chinese IME inserts "*" and this
 * file turns that insert into one wrap; a language surrounding pair would
 * enclose the selection a second time.
 */
function ensureMarkdownDoesNotSurroundWrapChars() {
    if (markdownSurroundRestored) return;
    markdownSurroundRestored = true;
    monaco.languages.setLanguageConfiguration("markdown", {
        comments: { blockComment: ["<!--", "-->"] },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
        ],
        autoClosingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: "<", close: ">", notIn: ["string"] },
        ],
        surroundingPairs: [
            { open: "(", close: ")" },
            { open: "[", close: "]" },
            { open: "`", close: "`" },
        ],
        folding: {
            markers: {
                start: /^\s*<!--\s*#?region\b.*-->/,
                end: /^\s*<!--\s*#?endregion\b.*-->/,
            },
        },
    });
}

function nonEmptySelections(editorInstance: MonacoEditorNS.IStandaloneCodeEditor) {
    return (editorInstance.getSelections() ?? []).filter((sel) => !sel.isEmpty());
}

function wrapSelections(
    editorInstance: MonacoEditorNS.IStandaloneCodeEditor,
    open: string,
    close: string,
    selections: monaco.Selection[]
) {
    const model = editorInstance.getModel();
    if (!model || selections.length === 0) return;
    // Keep the inner text selected, shifted past the opening character just
    // inserted, so a second press wraps again (*text* → **text**) instead of
    // dropping the highlight and typing the character after the selection.
    // start/end are the ordered ends; the direction is restored so a selection
    // made right-to-left stays that way.
    const cursors = selections.map((sel) =>
        monaco.Selection.fromRange(
            new monaco.Range(
                sel.startLineNumber,
                sel.startColumn + open.length,
                sel.endLineNumber,
                sel.endColumn + open.length
            ),
            sel.getDirection()
        )
    );
    editorInstance.executeEdits(
        "wrap",
        selections.map((sel) => ({
            range: sel,
            text: open + model.getValueInRange(sel) + close,
        })),
        cursors
    );
}

export interface MarkdownEditorBehaviorOptions {
    /** Called when the user double-clicks a line. Omit to disable. */
    onDoubleClickLine?: (lineNum: number) => void;
}

function replaceCurrentSelection(
    editorInstance: MonacoEditorNS.IStandaloneCodeEditor,
    text: string
) {
    const model = editorInstance.getModel();
    // getSelections() covers every cursor, so a Cmd+D multi-selection gets the
    // paste at each occurrence instead of only the primary one.
    const selections = editorInstance.getSelections();
    if (!model || !selections || selections.length === 0) return;

    // Compute where each cursor should end up after pasting `text`, starting
    // from that selection's start position. We do this from the text itself
    // (not via model.getPositionAt) so that multi-line pastes land correctly.
    const lines = text.split("\n");
    const cursors = selections.map((selection) => {
        const start = selection.getStartPosition();
        const endLine = start.lineNumber + lines.length - 1;
        const endColumn =
            lines.length === 1 ? start.column + text.length : lines[lines.length - 1].length + 1;
        return new monaco.Selection(endLine, endColumn, endLine, endColumn);
    });

    editorInstance.executeEdits(
        "paste",
        selections.map((range) => ({ range, text, forceMoveMarkers: true })),
        cursors
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
    // Use onKeyDown (per-instance) instead of addCommand, because addCommand registers
    // into Monaco's shared global keybinding service and later editor instances silently
    // override earlier ones — making Cmd+V stop working in all but the newest tab.
    editorInstance.onKeyDown(async (e) => {
        if (!(e.metaKey || e.ctrlKey) || e.code !== "KeyV") return;
        e.preventDefault();
        e.stopPropagation();

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

    // Cmd+Y → redo (mirrors Cmd+Shift+Z).
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
        editorInstance.trigger("keyboard", "redo", null);
    });

    ensureMarkdownDoesNotSurroundWrapChars();

    // Set for the rest of this keystroke once a wrap has been applied, so the
    // IME's own insert of the same character cannot wrap the selection again.
    let suppressFollowUp = false;
    const beginWrap = () => {
        suppressFollowUp = true;
        queueMicrotask(() => {
            suppressFollowUp = false;
        });
    };

    // Last non-empty selection. A Chinese IME replaces it with "*" without a
    // usable keydown, and the cursor collapses in the same turn — keep the
    // snapshot until the microtask checkpoint so that replacement can be repaired.
    let armed: { selections: monaco.Selection[]; texts: string[] } | null = null;
    let applyingWrap = false;

    const selectionSub = editorInstance.onDidChangeCursorSelection(() => {
        const model = editorInstance.getModel();
        const selections = nonEmptySelections(editorInstance);
        if (!model || selections.length === 0) {
            if (!armed) return;
            const snapshot = armed;
            queueMicrotask(() => {
                if (armed === snapshot) armed = null;
            });
            return;
        }
        armed = {
            selections: selections.map(
                (sel) =>
                    new monaco.Selection(
                        sel.selectionStartLineNumber,
                        sel.selectionStartColumn,
                        sel.positionLineNumber,
                        sel.positionColumn
                    )
            ),
            texts: selections.map((sel) => model.getValueInRange(sel)),
        };
    });

    const contentSub = editorInstance.onDidChangeModelContent((e) => {
        if (applyingWrap || suppressFollowUp || e.isUndoing || e.isRedoing) return;
        if (!armed || e.changes.length === 0) return;
        const inserted = e.changes[0].text;
        const pair = WRAP_BY_INSERTED[inserted];
        if (!pair) return;
        if (!e.changes.every((change) => change.text === inserted && change.rangeLength > 0)) {
            return;
        }
        const matched = e.changes.map((change) => {
            const index = armed!.selections.findIndex(
                (sel) =>
                    change.range.startLineNumber === sel.startLineNumber &&
                    change.range.startColumn === sel.startColumn &&
                    change.range.endLineNumber === sel.endLineNumber &&
                    change.range.endColumn === sel.endColumn
            );
            return index < 0 ? null : { change, text: armed!.texts[index], sel: armed!.selections[index] };
        });
        if (matched.some((item) => item === null)) return;
        // One wrap for this keystroke. A second content change from the same
        // IME commit must not enclose the selection again.
        suppressFollowUp = true;
        const items = matched as {
            change: (typeof e.changes)[number];
            text: string;
            sel: monaco.Selection;
        }[];
        const { open, close } = pair;
        queueMicrotask(() => {
            try {
                const model = editorInstance.getModel();
                if (!model || applyingWrap) return;
                const sorted = [...items].sort((a, b) => a.change.rangeOffset - b.change.rangeOffset);
                let delta = 0;
                const edits: monaco.editor.IIdentifiedSingleEditOperation[] = [];
                const cursors: monaco.Selection[] = [];
                for (const item of sorted) {
                    const startOffset = item.change.rangeOffset + delta;
                    const endOffset = startOffset + item.change.text.length;
                    delta += item.change.text.length - item.change.rangeLength;
                    const start = model.getPositionAt(startOffset);
                    const end = model.getPositionAt(endOffset);
                    if (
                        model.getValueInRange(
                            new monaco.Range(
                                start.lineNumber,
                                start.column,
                                end.lineNumber,
                                end.column
                            )
                        ) !== item.change.text
                    ) {
                        return;
                    }
                    edits.push({
                        range: new monaco.Range(
                            start.lineNumber,
                            start.column,
                            end.lineNumber,
                            end.column
                        ),
                        text: open + item.text + close,
                    });
                    const lines = item.text.split("\n");
                    const endLine = start.lineNumber + lines.length - 1;
                    const endColumn =
                        lines.length === 1
                            ? start.column + open.length + item.text.length
                            : lines[lines.length - 1].length + 1;
                    cursors.push(
                        monaco.Selection.fromRange(
                            new monaco.Range(
                                start.lineNumber,
                                start.column + open.length,
                                endLine,
                                endColumn
                            ),
                            item.sel.getDirection()
                        )
                    );
                }
                applyingWrap = true;
                try {
                    editorInstance.executeEdits("wrap", edits, cursors);
                } finally {
                    applyingWrap = false;
                }
            } finally {
                suppressFollowUp = false;
            }
        });
    });

    // English layouts: the physical key is visible, so wrap here and swallow the
    // key. A Chinese IME does not report Digit8/Shift, and preventDefault does
    // not stop it from also inserting "*"; wrapping here as well as repairing
    // that insert encloses the selection twice. Let the insert land and the
    // content listener above turn it into one wrap.
    editorInstance.onKeyDown((e) => {
        // Let Cmd/Ctrl/Alt combinations (e.g. Cmd+[) fall through to Monaco's
        // built-in keybindings (indent, outdent, etc.).
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // keyCode 229 / key "Process" means an IME owns this keystroke.
        if (e.browserEvent.key === "Process" || e.browserEvent.key === "Unidentified" || e.browserEvent.keyCode === 229) {
            return;
        }
        const pair =
            WRAP_BY_CODE[e.browserEvent.code + (e.shiftKey ? "+shift" : "")] ??
            WRAP_BY_CODE[e.browserEvent.code];
        if (!pair || e.shiftKey !== pair.shift) return;
        // getSelections() covers every cursor, matching the paste path above, so a
        // Cmd+D multi-selection wraps each occurrence instead of only the primary one.
        const selections = nonEmptySelections(editorInstance);
        if (!editorInstance.getModel() || selections.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        beginWrap();
        applyingWrap = true;
        try {
            wrapSelections(editorInstance, pair.open, pair.close, selections);
        } finally {
            applyingWrap = false;
        }
    });

    editorInstance.onDidDispose(() => {
        selectionSub.dispose();
        contentSub.dispose();
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
