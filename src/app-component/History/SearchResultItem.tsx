import { useState } from "react";
import { FileText, FolderOpen, Terminal } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import NameTagDisplay from "@/lib/NameTagDisplay";
import { useAppDispatch } from "@/store/hooks";
import { rootFolderSlice } from "@/store/slices/rootFolderSlice";
import { appStateApi } from "@/store/api/appStateApi";

type SearchResultScript = {
    id?: number | null;
    name: string;
    isMarkdown: boolean;
};

/**
 * Lite card for search/history side panels.
 * Context menu + double-click only navigate to the workspace-level root folder
 * (direct child of a workspace). No Open / Execute / Edit.
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
    const { data: appState } = appStateApi.endpoints.getAppState.useQueryState();

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
                    onDoubleClick={goToRootFolder}
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
