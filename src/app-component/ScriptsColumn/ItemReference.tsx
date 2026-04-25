import { scriptApi } from "@/store/api/scriptApi";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { FileText, Terminal } from "lucide-react";

/**
 * Renders an [item#ID] cross-reference chip inside a markdown preview.
 * - Markdown items: click opens the markdown editor window.
 * - Shell script items: click executes the script.
 */
export default function ItemReference({ id }: { id?: string }) {
    const scriptId = id ? parseInt(id, 10) : undefined;
    const { data: script, isLoading } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: scriptId == null || isNaN(scriptId ?? NaN),
    });

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!script) return;

        try {
            if (script.isMarkdown) {
                // Emit to main window, which has window-creation permissions.
                // Direct WebviewWindow creation from a subwindow is blocked by capabilities.
                await emit("open-markdown-reference", {
                    scriptId: script.id,
                    scriptName: script.name,
                });
            } else {
                if (script.showShell) {
                    await invoke("execute_command_in_shell", { command: script.command });
                } else {
                    await invoke("execute_command", { command: script.command });
                }
            }
        } catch (err) {
            console.error("ItemReference handleClick error:", err);
        }
    };

    if (isLoading) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-700/50 text-neutral-400 border border-neutral-600">
                <span className="w-3 h-3 rounded-full bg-neutral-500 animate-pulse" />
                ...
            </span>
        );
    }

    if (!script) {
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-700/50"
                title={`Unknown item #${id}`}
            >
                [item#{id}]
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border cursor-pointer select-none transition-colors ${
                script.isMarkdown
                    ? "bg-blue-900/30 text-blue-300 border-blue-700/50 hover:bg-blue-800/40"
                    : "bg-green-900/30 text-green-300 border-green-700/50 hover:bg-green-800/40"
            }`}
            onClick={handleClick}
            title={script.isMarkdown ? "Click to open markdown" : "Click to execute script"}
        >
            {script.isMarkdown ? (
                <FileText className="w-3 h-3 flex-shrink-0" />
            ) : (
                <Terminal className="w-3 h-3 flex-shrink-0" />
            )}
            {script.name}
        </span>
    );
}
