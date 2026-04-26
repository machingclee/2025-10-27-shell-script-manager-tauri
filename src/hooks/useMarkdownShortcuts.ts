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
    /** Escape (bare, no modifier) */
    onEscape?: () => void;
    /** Cmd/Ctrl + = or + */
    onZoomIn?: () => void;
    /** Cmd/Ctrl + - */
    onZoomOut?: () => void;
    /** Cmd/Ctrl + 0 */
    onZoomReset?: () => void;
    /** Cmd/Ctrl + B — toggle between mixed and preview mode */
    onToggleView?: () => void;
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
    onEscape,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onToggleView,
}: MarkdownShortcutOptions) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey && onEscape) {
                e.preventDefault();
                onEscape();
                return;
            }

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
                return;
            }

            if ((e.key === "=" || e.key === "+") && onZoomIn) {
                e.preventDefault();
                onZoomIn();
                return;
            }

            if (e.key === "-" && onZoomOut) {
                e.preventDefault();
                onZoomOut();
                return;
            }

            if (e.key === "0" && onZoomReset) {
                e.preventDefault();
                onZoomReset();
                return;
            }

            if (e.key === "b" && onToggleView) {
                e.preventDefault();
                onToggleView();
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        enabled,
        onSave,
        onClose,
        onFind,
        onSubmit,
        onEscape,
        onZoomIn,
        onZoomOut,
        onZoomReset,
        onToggleView,
    ]);
}
