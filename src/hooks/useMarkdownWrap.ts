import { useCallback } from "react";
import React from "react";

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

/**
 * Returns an `onKeyDown` handler for SimpleEditor that wraps the current
 * text selection with the typed character pair (e.g. * → *selection*).
 *
 * @param content    The current editor content string.
 * @param setContent Setter that receives the updated content.
 * @param onAfterWrap Optional callback fired after the wrap (e.g. to push
 *                    the new value into an undo stack).
 */
export function useMarkdownWrap(
    content: string,
    setContent: (v: string) => void,
    onAfterWrap?: (v: string) => void
) {
    return useCallback(
        (e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
            const textarea = e.currentTarget as HTMLTextAreaElement;
            const { selectionStart, selectionEnd } = textarea;

            // Cmd/Ctrl + ]  → indent selected lines by 2 spaces
            // Cmd/Ctrl + [  → dedent selected lines by up to 2 spaces
            if ((e.metaKey || e.ctrlKey) && (e.key === "]" || e.key === "[")) {
                if (selectionStart === selectionEnd) return;
                e.preventDefault();
                const INDENT = "  ";
                const lineStart = content.lastIndexOf("\n", selectionStart - 1) + 1;
                const selectedLinesText = content.slice(lineStart, selectionEnd);
                const lines = selectedLinesText.split("\n");
                const modifiedLines =
                    e.key === "]"
                        ? lines.map((line) => INDENT + line)
                        : lines.map((line) => {
                              if (line.startsWith(INDENT)) return line.slice(2);
                              if (line.startsWith(" ")) return line.slice(1);
                              return line;
                          });
                const modifiedText = modifiedLines.join("\n");
                const newContent =
                    content.slice(0, lineStart) + modifiedText + content.slice(selectionEnd);
                setContent(newContent);
                onAfterWrap?.(newContent);
                requestAnimationFrame(() => {
                    textarea.selectionStart = lineStart;
                    textarea.selectionEnd = lineStart + modifiedText.length;
                });
                return;
            }

            // Wrap selected text with paired characters (e.g. * → *selection*)
            const close = WRAP_PAIRS[e.key];
            if (!close) return;
            if (selectionStart === selectionEnd) return; // no selection — type normally

            e.preventDefault();
            const selected = content.slice(selectionStart, selectionEnd);
            const newContent =
                content.slice(0, selectionStart) +
                e.key +
                selected +
                close +
                content.slice(selectionEnd);

            setContent(newContent);
            onAfterWrap?.(newContent);

            // Restore selection inside the wrap chars after React re-render
            requestAnimationFrame(() => {
                textarea.selectionStart = selectionStart + 1;
                textarea.selectionEnd = selectionEnd + 1;
            });
        },
        [content, setContent, onAfterWrap]
    );
}
