import { ScriptsFolderResponse } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { workspaceApi } from "@/store/api/workspaceApi";
import {
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Folder, FolderInput } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

function containsFolder(folder: ScriptsFolderResponse, targetId: number): boolean {
    if (folder.id === targetId) return true;
    return folder.subfolders.some((sub) => containsFolder(sub, targetId));
}

function FolderItem({
    folder,
    rootFolderId,
    currentFolderId,
    scriptId,
    onMove,
}: {
    folder: ScriptsFolderResponse;
    rootFolderId: number;
    currentFolderId: number;
    scriptId: number;
    onMove: (folderId: number, rootFolderId: number) => void;
}) {
    const isCurrent = containsFolder(folder, currentFolderId);
    const disabledClass = "opacity-40 cursor-default dark:text-neutral-500";
    const enabledClass = "cursor-pointer dark:hover:bg-neutral-700 dark:text-neutral-200";

    if (folder.subfolders.length > 0) {
        return (
            <ContextMenuSub key={folder.id}>
                <ContextMenuSubTrigger className={isCurrent ? disabledClass : enabledClass}>
                    <div className="flex items-center mr-2">
                        <Folder className="w-4 h-4 mr-2" />
                        {folder.name}
                    </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                    <ContextMenuItem
                        disabled={isCurrent}
                        className={isCurrent ? disabledClass : enabledClass}
                        onClick={() => !isCurrent && onMove(folder.id, rootFolderId)}
                    >
                        Move here
                    </ContextMenuItem>
                    <ContextMenuSeparator className="dark:bg-neutral-700" />
                    {folder.subfolders.map((sub) => (
                        <FolderItem
                            key={sub.id}
                            folder={sub}
                            rootFolderId={rootFolderId}
                            currentFolderId={currentFolderId}
                            scriptId={scriptId}
                            onMove={onMove}
                        />
                    ))}
                </ContextMenuSubContent>
            </ContextMenuSub>
        );
    }

    return (
        <ContextMenuItem
            key={folder.id}
            disabled={isCurrent}
            className={isCurrent ? disabledClass : enabledClass}
            onClick={() => !isCurrent && onMove(folder.id, rootFolderId)}
        >
            <Folder className="w-4 h-4 mr-2" />
            {folder.name}
        </ContextMenuItem>
    );
}

export default function MoveToFolderMenu({
    scriptId,
    currentFolderId,
}: {
    scriptId: number;
    currentFolderId: number;
}) {
    const port = useAppSelector((s) => s.config.backendPort);
    const { data: workspaces } = workspaceApi.endpoints.getAllWorkspaces.useQuery(undefined, {
        skip: port === 0,
    });
    const [moveScriptIntoFolder] = scriptApi.endpoints.moveScriptIntoFolder.useMutation();

    const handleMove = (folderId: number, rootFolderId: number) => {
        moveScriptIntoFolder({ scriptId, folderId, rootFolderId });
    };

    return (
        <ContextMenuSub>
            <ContextMenuSubTrigger className="cursor-pointer dark:hover:bg-neutral-700 dark:focus:bg-neutral-700 dark:text-neutral-200">
                <FolderInput className="w-4 h-4 mr-2" />
                Move to Folder
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                {(workspaces || []).map((workspace) => (
                    <ContextMenuSub key={workspace.id}>
                        <ContextMenuSubTrigger className="cursor-pointer dark:hover:bg-neutral-700 dark:text-neutral-200">
                            <div className="flex items-center mr-2">{workspace.name}</div>
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                            {workspace.folders.map((folder) => (
                                <FolderItem
                                    key={folder.id}
                                    folder={folder}
                                    rootFolderId={folder.id}
                                    currentFolderId={currentFolderId}
                                    scriptId={scriptId}
                                    onMove={handleMove}
                                />
                            ))}
                            {workspace.folders.length === 0 && (
                                <ContextMenuItem disabled className="dark:text-neutral-500">
                                    No folders
                                </ContextMenuItem>
                            )}
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                ))}
            </ContextMenuSubContent>
        </ContextMenuSub>
    );
}
