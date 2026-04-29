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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AddMarkdownDialog } from "../FolderColumn/Dialog/AddMarkdownDialog";
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
    Plus,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import ExecuteConfirmDialog from "./ExecuteConfirmDialog";

// ─── Script right-click context actions ───────────────────────────────────────
function ScriptContextActions({
    script,
    folderId,
    onDeleteRequest,
    onExecuteRequest,
}: {
    script: ShellScriptResponse;
    folderId: number;
    onDeleteRequest: (script: ShellScriptResponse, folderId: number) => void;
    onExecuteRequest: (script: ShellScriptResponse) => void;
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
                    onClick={() => onExecuteRequest(script)}
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

// ─── Folder right-click context actions ──────────────────────────────────────
function FolderContextActions({
    folder,
    onAddMarkdownRequest,
    onAddScriptRequest,
}: {
    folder: ScriptsFolderResponse;
    onAddMarkdownRequest: (folder: ScriptsFolderResponse) => void;
    onAddScriptRequest: (folder: ScriptsFolderResponse) => void;
}) {
    return (
        <>
            <ContextMenuItem
                className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                onClick={() => onAddMarkdownRequest(folder)}
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Markdown
            </ContextMenuItem>
            <ContextMenuItem
                className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700"
                onClick={() => onAddScriptRequest(folder)}
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Script
            </ContextMenuItem>
        </>
    );
}

// ─── Recursive folder node ─────────────────────────────────────────────────────
function FolderNode({
    folder,
    onDeleteRequest,
    onExecuteRequest,
    onAddMarkdownRequest,
    onAddScriptRequest,
}: {
    folder: ScriptsFolderResponse;
    onDeleteRequest: (script: ShellScriptResponse, folderId: number) => void;
    onExecuteRequest: (script: ShellScriptResponse) => void;
    onAddMarkdownRequest: (folder: ScriptsFolderResponse) => void;
    onAddScriptRequest: (folder: ScriptsFolderResponse) => void;
}) {
    const hasContent = folder.subfolders.length > 0 || folder.shellScripts.length > 0;

    if (!hasContent) {
        return (
            <DropdownMenuSub key={folder.id}>
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <DropdownMenuSubTrigger className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700 dark:hover:bg-neutral-700">
                            <Folder className="w-4 h-4 mr-2" />
                            {folder.name}
                        </DropdownMenuSubTrigger>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="dark:bg-neutral-800 dark:border-neutral-700">
                        <FolderContextActions
                            folder={folder}
                            onAddMarkdownRequest={onAddMarkdownRequest}
                            onAddScriptRequest={onAddScriptRequest}
                        />
                    </ContextMenuContent>
                </ContextMenu>
                <DropdownMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700">
                    <DropdownMenuItem disabled className="dark:text-neutral-500 opacity-50">
                        Empty folder
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );
    }

    return (
        <DropdownMenuSub key={folder.id}>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <DropdownMenuSubTrigger className="cursor-pointer dark:text-neutral-200 dark:focus:bg-neutral-700 dark:hover:bg-neutral-700">
                        <Folder className="w-4 h-4 mr-2" />
                        {folder.name}
                    </DropdownMenuSubTrigger>
                </ContextMenuTrigger>
                <ContextMenuContent className="dark:bg-neutral-800 dark:border-neutral-700">
                    <FolderContextActions
                        folder={folder}
                        onAddMarkdownRequest={onAddMarkdownRequest}
                        onAddScriptRequest={onAddScriptRequest}
                    />
                </ContextMenuContent>
            </ContextMenu>
            <DropdownMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700">
                {folder.subfolders.map((sub) => (
                    <FolderNode
                        key={sub.id}
                        folder={sub}
                        onDeleteRequest={onDeleteRequest}
                        onExecuteRequest={onExecuteRequest}
                        onAddMarkdownRequest={onAddMarkdownRequest}
                        onAddScriptRequest={onAddScriptRequest}
                    />
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
                                        onExecuteRequest(script);
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
                                onExecuteRequest={onExecuteRequest}
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
    const port = useAppSelector((s) => s.config.backendPort);
    const { data: workspaces } = workspaceApi.endpoints.getAllWorkspaces.useQuery(undefined, {
        skip: port === 0,
    });
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();
    const [createScript] = scriptApi.endpoints.createScript.useMutation();
    const [createMarkdownScript] = scriptApi.endpoints.createMarkdownScript.useMutation();

    const [pendingDelete, setPendingDelete] = useState<{
        script: ShellScriptResponse;
        folderId: number;
    } | null>(null);

    const [pendingExecute, setPendingExecute] = useState<ShellScriptResponse | null>(null);

    // Add markdown state
    const [pendingAddMarkdown, setPendingAddMarkdown] = useState<ScriptsFolderResponse | null>(
        null
    );
    const [markdownName, setMarkdownName] = useState("");
    const [markdownContent, setMarkdownContent] = useState("");

    // Add script state
    const [pendingAddScript, setPendingAddScript] = useState<ScriptsFolderResponse | null>(null);
    const [scriptName, setScriptName] = useState("");
    const [scriptCommand, setScriptCommand] = useState("");

    const handleDeleteRequest = (script: ShellScriptResponse, folderId: number) => {
        setPendingDelete({ script, folderId });
    };

    const handleExecuteRequest = (script: ShellScriptResponse) => {
        setPendingExecute(script);
    };

    const handleAddMarkdownRequest = (folder: ScriptsFolderResponse) => {
        setMarkdownName("");
        setMarkdownContent("");
        setPendingAddMarkdown(folder);
    };

    const handleAddScriptRequest = (folder: ScriptsFolderResponse) => {
        setScriptName("");
        setScriptCommand("");
        setPendingAddScript(folder);
    };

    const confirmAddMarkdown = async () => {
        if (!pendingAddMarkdown || !markdownName.trim()) return;
        await createMarkdownScript({
            name: markdownName,
            content: markdownContent,
            folderId: pendingAddMarkdown.id,
        });
        setPendingAddMarkdown(null);
    };

    const confirmAddScript = async () => {
        if (!pendingAddScript || !scriptName.trim() || !scriptCommand.trim()) return;
        await createScript({
            name: scriptName,
            content: scriptCommand,
            folderId: pendingAddScript.id,
        });
        setPendingAddScript(null);
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
                    className="dark:bg-neutral-800 dark:border-neutral-700 z-[9999]"
                    align="end"
                >
                    {(workspaces || []).length === 0 && (
                        <DropdownMenuItem disabled className="dark:text-neutral-500">
                            No workspaces
                        </DropdownMenuItem>
                    )}
                    {(workspaces || []).map((workspace) => (
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
                                            onExecuteRequest={handleExecuteRequest}
                                            onAddMarkdownRequest={handleAddMarkdownRequest}
                                            onAddScriptRequest={handleAddScriptRequest}
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

            {/* Add Markdown Dialog */}
            {pendingAddMarkdown && (
                <AddMarkdownDialog
                    isAddMarkdownOpen={pendingAddMarkdown !== null}
                    setIsAddMarkdownOpen={(open) => {
                        if (!open) setPendingAddMarkdown(null);
                    }}
                    folder={pendingAddMarkdown}
                    markdownName={markdownName}
                    setMarkdownName={setMarkdownName}
                    markdownContent={markdownContent}
                    setMarkdownContent={setMarkdownContent}
                    handleAddMarkdown={confirmAddMarkdown}
                />
            )}

            {/* Add Script Dialog */}
            <Dialog
                open={pendingAddScript !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingAddScript(null);
                }}
            >
                <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Add Script to "{pendingAddScript?.name}"</DialogTitle>
                        <DialogDescription>
                            Create a new script inside this folder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="qs-script-name">Name</Label>
                            <Input
                                className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                id="qs-script-name"
                                autoFocus
                                value={scriptName}
                                onChange={(e) => setScriptName(e.target.value)}
                                placeholder="Script name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="qs-script-command">Command</Label>
                            <Textarea
                                id="qs-script-command"
                                value={scriptCommand}
                                onChange={(e) => setScriptCommand(e.target.value)}
                                placeholder="Command to execute"
                                rows={18}
                                className="font-mono text-sm bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingAddScript(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmAddScript}
                            disabled={!scriptName.trim() || !scriptCommand.trim()}
                        >
                            Create Script
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ExecuteConfirmDialog
                open={pendingExecute !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingExecute(null);
                }}
                scriptName={pendingExecute?.name ?? ""}
                scriptCommand={pendingExecute?.command ?? ""}
                onConfirm={() => {
                    if (!pendingExecute) return;
                    emit("quick-nav-execute-script", {
                        scriptId: pendingExecute.id,
                        command: pendingExecute.command,
                        showShell: pendingExecute.showShell,
                    });
                    setPendingExecute(null);
                }}
            />
        </>
    );
}
