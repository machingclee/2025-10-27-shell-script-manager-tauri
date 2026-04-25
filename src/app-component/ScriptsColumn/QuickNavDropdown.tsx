import { useState } from "react";
import { workspaceApi } from "@/store/api/workspaceApi";
import { scriptApi } from "@/store/api/scriptApi";
import { ScriptsFolderResponse, ShellScriptResponse } from "@/types/dto";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { emit } from "@tauri-apps/api/event";
import {
    Compass,
    Folder,
    FileText,
    Terminal,
    Eye,
    Edit,
    Play,
    Trash2,
    Link,
    Building2,
} from "lucide-react";

// ─── Script right-click context actions ───────────────────────────────────────
function ScriptContextActions({
    script,
    folderId,
    onDeleteRequest,
}: {
    script: ShellScriptResponse;
    folderId: number;
    onDeleteRequest: (script: ShellScriptResponse, folderId: number) => void;
}) {
    return (
        <>
            {script.isMarkdown ? (
                <>
                    <ContextMenuItem
                        className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                        onClick={() =>
                            emit("quick-nav-open-markdown", {
                                scriptId: script.id,
                                editMode: false,
                                scriptName: script.name,
                            })
                        }
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                    </ContextMenuItem>
                    <ContextMenuItem
                        className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                        onClick={() =>
                            emit("quick-nav-open-markdown", {
                                scriptId: script.id,
                                editMode: true,
                                scriptName: script.name,
                            })
                        }
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </ContextMenuItem>
                </>
            ) : (
                <ContextMenuItem
                    className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                    onClick={() =>
                        emit("quick-nav-execute-script", {
                            scriptId: script.id,
                            command: script.command,
                            showShell: script.showShell,
                        })
                    }
                >
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                </ContextMenuItem>
            )}
            <ContextMenuSeparator className="dark:bg-neutral-700" />
            <ContextMenuItem
                className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                onClick={() => navigator.clipboard.writeText(`[item#${script.id}]`)}
            >
                <Link className="w-4 h-4 mr-2" />
                Copy as Markdown Reference
            </ContextMenuItem>
            <ContextMenuSeparator className="dark:bg-neutral-700" />
            <ContextMenuItem
                className="cursor-pointer text-red-600 dark:text-red-400 dark:focus:bg-neutral-700"
                onClick={() => onDeleteRequest(script, folderId)}
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
            </ContextMenuItem>
        </>
    );
}

// ─── Recursive folder node ─────────────────────────────────────────────────────
function FolderNode({
    folder,
    onDeleteRequest,
}: {
    folder: ScriptsFolderResponse;
    onDeleteRequest: (script: ShellScriptResponse, folderId: number) => void;
}) {
    const hasContent = folder.subfolders.length > 0 || folder.shellScripts.length > 0;

    if (!hasContent) {
        return (
            <DropdownMenuItem key={folder.id} disabled className="dark:text-neutral-500 opacity-50">
                <Folder className="w-4 h-4 mr-2" />
                {folder.name}
            </DropdownMenuItem>
        );
    }

    return (
        <DropdownMenuSub key={folder.id}>
            <DropdownMenuSubTrigger className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700 dark:hover:bg-neutral-700">
                <Folder className="w-4 h-4 mr-2" />
                {folder.name}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700">
                {folder.subfolders.map((sub) => (
                    <FolderNode key={sub.id} folder={sub} onDeleteRequest={onDeleteRequest} />
                ))}
                {folder.subfolders.length > 0 && folder.shellScripts.length > 0 && (
                    <DropdownMenuSeparator className="dark:bg-neutral-700" />
                )}
                {folder.shellScripts.map((script) => (
                    <ContextMenu key={script.id}>
                        <ContextMenuTrigger asChild>
                            <DropdownMenuItem
                                className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                                onSelect={() => {
                                    if (script.isMarkdown) {
                                        emit("quick-nav-open-markdown", {
                                            scriptId: script.id,
                                            editMode: false,
                                            scriptName: script.name,
                                        });
                                    } else {
                                        emit("quick-nav-execute-script", {
                                            scriptId: script.id,
                                            command: script.command,
                                            showShell: script.showShell,
                                        });
                                    }
                                }}
                            >
                                {script.isMarkdown ? (
                                    <FileText className="w-4 h-4 mr-2 text-blue-400" />
                                ) : (
                                    <Terminal className="w-4 h-4 mr-2 text-green-400" />
                                )}
                                {script.name}
                            </DropdownMenuItem>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="dark:bg-neutral-800 dark:border-neutral-700">
                            <ScriptContextActions
                                script={script}
                                folderId={folder.id}
                                onDeleteRequest={onDeleteRequest}
                            />
                        </ContextMenuContent>
                    </ContextMenu>
                ))}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}

// ─── Main QuickNavDropdown ─────────────────────────────────────────────────────
export default function QuickNavDropdown() {
    const { data: workspaces = [] } = workspaceApi.endpoints.getAllWorkspaces.useQuery(undefined);
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();

    const [pendingDelete, setPendingDelete] = useState<{
        script: ShellScriptResponse;
        folderId: number;
    } | null>(null);

    const handleDeleteRequest = (script: ShellScriptResponse, folderId: number) => {
        setPendingDelete({ script, folderId });
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        await deleteScript({ id: pendingDelete.script.id, folderId: pendingDelete.folderId });
        setPendingDelete(null);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="p-1.5 rounded hover:bg-neutral-500 bg-neutral-600 transition-colors text-gray-400  outline-none! focus:outline-none! focus-visible:outline-none! focus:ring-0! border-0 ml-2"
                        title="Quick Navigate"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Compass className="w-5 h-5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                    align="end"
                >
                    {workspaces.length === 0 && (
                        <DropdownMenuItem disabled className="dark:text-neutral-500">
                            No workspaces
                        </DropdownMenuItem>
                    )}
                    {workspaces.map((workspace) => (
                        <DropdownMenuSub key={workspace.id}>
                            <DropdownMenuSubTrigger className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700 dark:hover:bg-neutral-700">
                                <Building2 className="w-4 h-4 mr-2" />
                                {workspace.name}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700">
                                {workspace.folders.length === 0 ? (
                                    <DropdownMenuItem disabled className="dark:text-neutral-500">
                                        No folders
                                    </DropdownMenuItem>
                                ) : (
                                    workspace.folders.map((folder) => (
                                        <FolderNode
                                            key={folder.id}
                                            folder={folder}
                                            onDeleteRequest={handleDeleteRequest}
                                        />
                                    ))
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDelete(null);
                }}
            >
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Script?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{pendingDelete?.script.name}
                            &quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
