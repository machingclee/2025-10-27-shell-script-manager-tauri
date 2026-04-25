import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Custom title bar for subwindows (decorations: false).
 * Mirrors the main window's close/minimize/maximize controls.
 */
export default function SubwindowTitleBar({ title }: { title?: string }) {
    const [isMaximized, setIsMaximized] = useState(false);

    const handleDragStart = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        getCurrentWindow().startDragging().catch(console.error);
    };

    const handleClose = async () => {
        await getCurrentWindow().close();
    };

    const handleMinimize = async () => {
        await getCurrentWindow().minimize();
    };

    const handleMaximize = async () => {
        await getCurrentWindow().toggleMaximize();
        setIsMaximized((v) => !v);
    };

    const handleDoubleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await getCurrentWindow().toggleMaximize();
        setIsMaximized((v) => !v);
    };

    return (
        <div
            className="h-10 flex-shrink-0 select-none bg-white dark:bg-[rgba(255,255,255,0.05)] border-b border-gray-200 dark:border-neutral-700 flex items-center w-full relative z-[200] pointer-events-auto"
            onMouseDown={handleDragStart}
            onDoubleClick={handleDoubleClick}
        >
            {/* Traffic-light buttons */}
            <div className="absolute left-4 flex gap-2 z-10 items-center">
                <button
                    onClick={handleClose}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group"
                    aria-label="Close"
                >
                    <span className="hidden group-hover:block text-red-900 text-xs leading-none">
                        ×
                    </span>
                </button>
                <button
                    onClick={handleMinimize}
                    className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center group"
                    aria-label="Minimize"
                >
                    <span className="hidden group-hover:block text-yellow-900 text-xs leading-none">
                        −
                    </span>
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center group"
                    aria-label="Maximize"
                >
                    <span className="hidden group-hover:block text-green-900 text-xs leading-none">
                        {isMaximized ? "−" : "+"}
                    </span>
                </button>
            </div>

            {/* Centered title */}
            {title && (
                <div className="flex-1 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-neutral-300 truncate px-20">
                    {title}
                </div>
            )}
        </div>
    );
}
