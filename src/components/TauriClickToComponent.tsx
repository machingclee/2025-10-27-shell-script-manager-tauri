/**
 * A click-to-source component for Tauri (dev-mode only).
 *
 * WKWebView cannot navigate to vscode:// URLs via window.location.assign, so
 * we reuse click-to-react-component's React-fiber helpers but call a Tauri
 * `invoke("open_in_vscode", { path })` command instead of navigating.
 *
 * Usage: Option+Click any element to open its source in VS Code.
 */

import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// ── inlined from click-to-react-component internals (package.json exports block direct imports) ──

function getReactInstanceForElement(element: HTMLElement) {
    if ("__REACT_DEVTOOLS_GLOBAL_HOOK__" in window) {
        const { renderers } = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        for (const renderer of renderers.values()) {
            try {
                const fiber = renderer.findFiberByHostInstance(element);
                if (fiber) return fiber;
            } catch {}
        }
    }
    if ("_reactRootContainer" in element) {
        return (element as any)._reactRootContainer._internalRoot.current.child;
    }
    for (const key in element) {
        if (key.startsWith("__reactInternalInstance$") || key.startsWith("__reactFiber")) {
            return (element as any)[key];
        }
    }
}

// React 19 replaced _debugSource with _debugStack (an Error whose .stack
// trace contains the JSX callsite).  Parse it to get file / line / col.
declare const __VITE_ROOT__: string;

function parseStackFrame(line: string) {
    // JavaScriptCore (WKWebView): "fnName@URL:line:col" or "@URL:line:col"
    let m = line.match(/^[^@]*@(.+):([\d]+):([\d]+)$/);
    if (m) return { filePath: m[1], lineNumber: +m[2], columnNumber: +m[3] };
    // V8 fallback: "    at fnName (URL:line:col)" or "    at URL:line:col"
    m = line.match(/at\s+(?:.+\s+\()?(.+):([\d]+):([\d]+)\)?/);
    if (m) return { filePath: m[1], lineNumber: +m[2], columnNumber: +m[3] };
    return null;
}

function toAbsolutePath(filePath: string): string | null {
    try {
        const url = new URL(filePath);
        if (url.hostname === "localhost") {
            // Strip Vite cache-busting query and prepend workspace root
            const pathname = url.pathname.split("?")[0];
            return __VITE_ROOT__ + pathname;
        }
    } catch {}
    if (filePath.startsWith("/")) return filePath; // already absolute
    return null;
}

function parseDebugStack(err: Error) {
    if (!err?.stack) return null;
    for (const line of err.stack.split("\n")) {
        const frame = parseStackFrame(line.trim());
        if (!frame) continue;
        if (frame.filePath.includes("node_modules")) continue;
        const fileName = toAbsolutePath(frame.filePath);
        if (!fileName) continue;
        return { fileName, lineNumber: frame.lineNumber, columnNumber: frame.columnNumber };
    }
    return null;
}

function getSourceForInstance(instance: any) {
    // React ≤18: _debugSource
    if (instance?._debugSource) {
        const { columnNumber = 1, fileName, lineNumber = 1 } = instance._debugSource;
        return { columnNumber, fileName, lineNumber };
    }
    // React 19+: _debugStack
    if (instance?._debugStack instanceof Error) {
        return parseDebugStack(instance._debugStack);
    }
    return null;
}

function getSourceForElement(
    element: HTMLElement
): { fileName: string; lineNumber: number; columnNumber: number } | null {
    // Walk the React _debugOwner chain (component ownership, not DOM parent tree)
    let instance = getReactInstanceForElement(element);
    while (instance) {
        const source = getSourceForInstance(instance);
        if (source) return source;
        instance = instance._debugOwner;
    }
    return null;
}

function getPathToSource(source: { fileName: string; lineNumber: number; columnNumber: number }) {
    return `${source.fileName}:${source.lineNumber}:${source.columnNumber}`;
}

const STYLE_ID = "tauri-click-to-component-style";

const css = `
  [data-ctc-hover] * { pointer-events: auto !important; }
  [data-ctc-target] {
    cursor: context-menu !important;
    outline: -webkit-focus-ring-color auto 1px !important;
  }
`;

function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
}

export function TauriClickToComponent() {
    const [hovering, setHovering] = useState(false);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    // Inject CSS once
    useEffect(() => {
        injectStyle();
    }, []);

    // Sync data attributes used by the CSS
    useEffect(() => {
        if (hovering) {
            document.body.dataset.ctcHover = "true";
            if (target) target.dataset.ctcTarget = "true";
        } else {
            delete document.body.dataset.ctcHover;
            document
                .querySelectorAll("[data-ctc-target]")
                .forEach((el) => delete (el as HTMLElement).dataset.ctcTarget);
        }
    }, [hovering, target]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.altKey) setHovering(true);
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (!e.altKey) setHovering(false);
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (hovering && e.target instanceof HTMLElement) {
                setTarget(e.target);
            }
        },
        [hovering]
    );

    const handleClick = useCallback(
        (e: MouseEvent) => {
            if (!hovering || !(target instanceof HTMLElement)) return;
            e.preventDefault();
            e.stopPropagation();
            try {
                const source = getSourceForElement(target);
                if (!source) {
                    console.warn("[TauriClickToComponent] No source found for", target);
                    return;
                }
                const path = getPathToSource(source);
                console.log("[TauriClickToComponent] Opening:", path);
                invoke("open_in_vscode", { path }).catch(console.error);
            } catch (err) {
                console.warn("[TauriClickToComponent] Error:", err);
            }
            setHovering(false);
        },
        [hovering, target]
    );

    const handleBlur = useCallback(() => {
        setHovering(false);
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("click", handleClick, { capture: true });
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("blur", handleBlur);
        };
    }, [handleKeyDown, handleKeyUp, handleMouseMove, handleClick, handleBlur]);

    return null;
}
