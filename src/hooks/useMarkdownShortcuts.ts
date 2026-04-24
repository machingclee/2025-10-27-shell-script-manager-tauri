import { useEffect } from "react";

export interface MarkdownShortcutOptions {
    /** Whether to install the listeners. Defaults to true. */
    enabled?: boolean;
    /** Cmd/Ctrl + S */
    onSave?: () => void | Promise<void>;
    /** Cmd/Ctrl + W */
    onClose?: () => void;
    /** Cmd/Ctrl + F */
    onFind?: () => void;
    /** Cmd/Ctrl + Enter */
    onSubmit?: () => void;
}

/**
 * Registers window-level keyboard shortcuts shared across markdown surfaces
 * (MarkdownEditor subwindow, MarkdownDialog, AddMarkdownDialog).
 *
 * All handlers are optional — only the ones provided will be wired up.
 * Pass `enabled: false` to temporarily suspend the listeners (e.g. when
 * the host dialog is closed).
 */
export function useMarkdownShortcuts({
    enabled = true,
    onSave,
    onClose,
    onFind,
    onSubmit,
}: MarkdownShortcutOptions) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return;

            if (e.key === "s" && onSave) {
                e.preventDefault();
                onSave();
                return;
            }

            if (e.key === "w" && onClose) {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key === "f" && onFind) {
                e.preventDefault();
                onFind();
                return;
            }

            if (e.key === "Enter" && onSubmit) {
                e.preventDefault();
                onSubmit();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enabled, onSave, onClose, onFind, onSubmit]);
}
