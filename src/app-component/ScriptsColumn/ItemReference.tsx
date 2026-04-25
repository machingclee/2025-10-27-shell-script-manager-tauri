import { scriptApi } from "@/store/api/scriptApi";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { FileText, Terminal } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * Renders an [item#ID] cross-reference chip inside a markdown preview.
 * Right-click to open a context menu with actions (open / execute).
 */
export default function ItemReference({ id }: { id?: string }) {
    const scriptId = id ? parseInt(id, 10) : undefined;
    const { data: script, isLoading } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: scriptId == null || isNaN(scriptId ?? NaN),
    });

    const handleOpen = async () => {
        if (!script) return;
        try {
            if (script.isMarkdown) {
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
            console.error("ItemReference action error:", err);
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
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium border cursor-context-menu select-none transition-colors bg-neutral-700/80 text-neutral-300 border-neutral-600/60 hover:bg-neutral-600/50"
                    title="Right-click for actions"
                >
                    {script.isMarkdown ? (
                        <FileText className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <Terminal className="w-4 h-4 flex-shrink-0" />
                    )}
                    {script.name}
                </span>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleOpen}>
                    {script.isMarkdown ? "Open in new window" : "Execute script"}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
