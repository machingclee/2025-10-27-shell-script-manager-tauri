import { scriptApi } from "@/store/api/scriptApi";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { FileText, Terminal } from "lucide-react";
import { useState } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ExecuteConfirmDialog from "./ExecuteConfirmDialog";

/**
 * Renders an [item#ID] cross-reference chip inside a markdown preview.
 * Left-click: markdown → open subwindow; shell → confirmation dialog then execute.
 * Right-click to open a context menu with the same actions.
 */
export default function ItemReference({
    id,
    darkMode = true,
}: {
    id?: string;
    darkMode?: boolean;
}) {
    const scriptId = id ? parseInt(id, 10) : undefined;
    const { data: script, isLoading } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: scriptId == null || isNaN(scriptId ?? NaN),
    });

    const [confirmOpen, setConfirmOpen] = useState(false);

    const executeScript = async () => {
        if (!script) return;
        try {
            if (script.showShell) {
                await invoke("execute_command_in_shell", { command: script.command });
            } else {
                await invoke("execute_command", { command: script.command });
            }
        } catch (err) {
            console.error("ItemReference execute error:", err);
        }
    };

    const openMarkdown = async () => {
        if (!script) return;
        try {
            await emit("open-markdown-reference", {
                scriptId: script.id,
                scriptName: script.name,
            });
        } catch (err) {
            console.error("ItemReference open error:", err);
        }
    };

    const handleChipClick = () => {
        if (!script) return;
        if (script.isMarkdown) {
            openMarkdown();
        } else {
            setConfirmOpen(true);
        }
    };

    if (isLoading) {
        return (
            <span
                style={{
                    background: darkMode ? "rgba(64,64,64,0.5)" : "#e5e7eb",
                    color: darkMode ? "#a3a3a3" : "#6b7280",
                    border: `1px solid ${darkMode ? "#525252" : "#d1d5db"}`,
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            >
                <span
                    style={{ background: darkMode ? "#737373" : "#9ca3af" }}
                    className="w-3 h-3 rounded-full animate-pulse"
                />
                ...
            </span>
        );
    }

    if (!script) {
        return (
            <span
                style={{
                    background: darkMode ? "rgba(127,29,29,0.3)" : "#fee2e2",
                    color: darkMode ? "#f87171" : "#dc2626",
                    border: `1px solid ${darkMode ? "rgba(185,28,28,0.5)" : "#fca5a5"}`,
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                title={`Unknown item #${id}`}
            >
                [item#{id}]
            </span>
        );
    }

    return (
        <>
            <ExecuteConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                scriptName={script.name}
                scriptCommand={script.command}
                onConfirm={executeScript}
            />

            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                onClick={handleChipClick}
                                style={{
                                    background: darkMode ? "rgba(64,64,64,0.8)" : "#ffffff",
                                    color: darkMode ? "#d4d4d4" : "#404040",
                                    border: `1px solid ${darkMode ? "rgba(82,82,82,0.6)" : "#d1d5db"}`,
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium cursor-pointer select-none transition-colors"
                            >
                                {script.isMarkdown ? (
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                ) : (
                                    <Terminal className="w-4 h-4 flex-shrink-0" />
                                )}
                                {script.name}
                            </span>
                        </TooltipTrigger>
                        {!script.isMarkdown && script.command && (
                            <TooltipContent side="bottom" className="max-w-sm">
                                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                    {script.command}
                                </pre>
                            </TooltipContent>
                        )}
                        {script.isMarkdown && (
                            <TooltipContent side="bottom">
                                Open in-app markdown preview
                            </TooltipContent>
                        )}
                    </Tooltip>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleChipClick}>
                        {script.isMarkdown ? "Open in new window" : "Execute script"}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </>
    );
}
