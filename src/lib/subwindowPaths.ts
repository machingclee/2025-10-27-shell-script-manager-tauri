/**
 * Utility for generating subwindow URLs
 * Handles dev vs production paths automatically
 */
export const getSubwindowPaths = {
    markdown: (scriptId: number, editMode: boolean = false): string => {
        const queryParams = `scriptId=${scriptId}${editMode ? "&editMode=true" : ""}`;

        if (import.meta.env.DEV) {
            // Development: use Vite dev server
            return `http://localhost:1420/src/subwindows/markdown-window.html?${queryParams}`;
        } else {
            // Production: Vite preserves src/ structure in dist/
            return `tauri://localhost/src/subwindows/markdown-window.html?${queryParams}`;
        }
    },
};
