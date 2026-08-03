import { useState } from "react";
import { FileText, FolderOpen, Loader2, Terminal } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import NameTagDisplay from "@/lib/NameTagDisplay";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rootFolderSlice } from "@/store/slices/rootFolderSlice";
import { appStateApi } from "@/store/api/appStateApi";
import { scriptApi } from "@/store/api/scriptApi";

type SearchResultScript = {
    id?: number | null;
    name: string;
    command?: string;
    showShell?: boolean;
    isMarkdown: boolean;
};

/**
 * Lite card for search/history side panels.
 * - Double-click: execute shell script / open markdown
 * - Context menu: only navigate to workspace-level root folder
 */
export default function SearchResultItem({
    script,
    rootFolderId,
    parentFolderPath,
    preview,
}: {
    script: SearchResultScript;
    /** Workspace-level root folder id. Navigation is a no-op when missing. */
    rootFolderId?: number | null;
    parentFolderPath?: string;
    preview: React.ReactNode;
}) {
    const dispatch = useAppDispatch();
    const [isSelected, setIsSelected] = useState(false);
    const [updateAppState] = appStateApi.endpoints.updateAppState.useMutation();
    const [notifyScriptExecuted] = scriptApi.endpoints.notifyScriptExecuted.useMutation();
    const { data: appState } = appStateApi.endpoints.getAppState.useQueryState();
    const executing = useAppSelector(
        (state) => (state.folder.scripts.executing?.[script.id ?? 0] ?? { loading: false }).loading
    );

    const folderId = rootFolderId ?? 0;

    const goToRootFolder = () => {
        if (!folderId) {
            console.warn("[SearchResultItem] No rootFolderId; cannot navigate", script);
            return;
        }
        dispatch(rootFolderSlice.actions.setSelectedRootFolderId(folderId));
        if (appState) {
            updateAppState({ ...appState, lastOpenedFolderId: folderId });
        }
    };

    const handleRun = async () => {
        if (!script.id || script.isMarkdown) return;
        try {
            dispatch(
                rootFolderSlice.actions.setExecutingScript({
                    script_id: script.id,
                    loading: true,
                })
            );
            const command = script.command ?? "";
            if (script.showShell) {
                await invoke("execute_command_in_shell", { command });
            } else {
                await invoke("execute_command", { command });
            }
            await notifyScriptExecuted({ scriptId: script.id });
        } catch (error) {
            console.error("Failed to run script:", error);
        } finally {
            dispatch(
                rootFolderSlice.actions.setExecutingScript({
                    script_id: script.id,
                    loading: false,
                })
            );
        }
    };

    const handleOpenMarkdown = async () => {
        if (!script.id || !script.isMarkdown) return;
        await emit("open-markdown-reference", {
            scriptId: script.id,
            scriptName: script.name,
        });
    };

    const handleDoubleClick = () => {
        if (script.isMarkdown) {
            handleOpenMarkdown();
            return;
        }
        handleRun();
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={`px-3 py-2 rounded-md border transition-colors cursor-pointer w-full overflow-hidden select-none ${
                        isSelected
                            ? "bg-gray-200 border-gray-400 dark:bg-[rgba(0,0,0,0.2)] dark:border-neutral-500"
                            : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] dark:border-neutral-600 dark:hover:bg-[rgba(255,255,255,0.2)]"
                    }`}
                    onMouseDown={() => setIsSelected(true)}
                    onMouseUp={() => setIsSelected(false)}
                    onMouseLeave={() => setIsSelected(false)}
                    onDoubleClick={handleDoubleClick}
                >
                    {parentFolderPath ? (
                        <div className="text-xs text-gray-600 dark:text-[rgba(255,255,255,0.23)] flex flex-row justify-start truncate">
                            {parentFolderPath}
                        </div>
                    ) : null}
                    <div className="flex items-center gap-2 min-w-0 flex-1 pt-2 mb-2">
                        <div className="font-bold text-lg break-words select-none flex items-center gap-2 flex-wrap min-w-0">
                            {script.isMarkdown ? (
                                <FileText className="w-7 h-7 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                            ) : (
                                <Terminal className="w-7 h-7 flex-shrink-0 text-green-500 dark:text-green-400" />
                            )}
                            <NameTagDisplay name={script.name} />
                            {executing && (
                                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                            )}
                            {import.meta.env.DEV && (
                                <span className="text-sm font-normal" style={{ opacity: 0.3 }}>
                                    (id: {script.id}
                                    {folderId ? `, root: ${folderId}` : ", root: missing"})
                                </span>
                            )}
                        </div>
                    </div>
                    {preview}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                <ContextMenuItem
                    onClick={goToRootFolder}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Go to root folder
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
