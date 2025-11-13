import { Button } from "@/components/ui/button";
import { Edit, Loader2, Play, Trash, Lock, LockOpen } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { ScriptsFolderDTO, ShellScriptDTO } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { folderSlice } from "@/store/slices/folderSlice";

export default function ScriptItem({
    script,
    parentFolderId,
    liteVersionDisplay,
    historyVersion = false,
    parentFolderPath = "",
}: {
    script: ShellScriptDTO;
    parentFolderId: number;
    liteVersionDisplay?: React.ReactNode;
    historyVersion?: boolean;
    parentFolderPath?: string;
}) {
    const dispatch = useAppDispatch();
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();
    const [updateScript] = scriptApi.endpoints.updateScript.useMutation();
    const [createScriptHistory] = scriptApi.endpoints.createScriptHistory.useMutation();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editName, setEditName] = useState(script.name);
    const [editCommand, setEditCommand] = useState(script.command);
    const [isSelected, setIsSelected] = useState(false);
    const [showShell, setShowShell] = useState(false);
    const [locked, setLocked] = useState(false);
    const [isFlipping, setIsFlipping] = useState(false);
    const executingScript = useAppSelector(
        (state) => (state.folder.scripts.executing?.[script.id ?? 0] ?? { loading: false }).loading
    );

    // Reset form when dialog opens
    useEffect(() => {
        if (isEditOpen) {
            setEditName(script.name);
            setEditCommand(script.command);
        }
    }, [isEditOpen, script.name, script.command]);

    const handleRun = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            console.log("Running script:", script.command);
            dispatch(
                folderSlice.actions.setExecutingScript({ script_id: script.id ?? 0, loading: true })
            );
            // promise, no one cares the response:
            createScriptHistory({ scriptId: script.id! });
            if (script.showShell) {
                await invoke("execute_command_in_shell", { command: script.command });
            } else {
                await invoke("execute_command", { command: script.command });
            }
        } catch (error) {
            console.error("Failed to run script:", error);
        } finally {
            dispatch(
                folderSlice.actions.setExecutingScript({
                    script_id: script.id ?? 0,
                    loading: false,
                })
            );
        }
    };

    const handleDelete = () => {
        deleteScript({ id: script.id ?? 0, folderId: parentFolderId });
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteOpen(true);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditOpen(true);
    };

    const handleExecuteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleRun(e);
    };

    const handleUpdate = async () => {
        const finalScriptDTO: ShellScriptDTO = {
            ...(script as unknown as ScriptsFolderDTO),
            id: script.id,
            name: editName,
            command: editCommand,
            showShell: showShell,
            locked: locked,
        };
        await updateScript(finalScriptDTO);
        setIsEditOpen(false);
    };

    const onShowShellChange = async (checked: boolean) => {
        await updateScript({
            ...script,
            showShell: checked,
        });
        setShowShell(checked);
    };

    const onLockedToggle = async () => {
        const newLockedState = !locked;
        setIsFlipping(true);
        await updateScript({
            ...script,
            locked: newLockedState,
        });
        setLocked(newLockedState);

        // Reset flip animation after it completes
        setTimeout(() => setIsFlipping(false), 600);
    };

    useEffect(() => {
        setShowShell(script.showShell);
    }, [script.showShell]);

    useEffect(() => {
        setLocked(script.locked);
    }, [script.locked]);

    const scriptCard = (
        <div
            className={`px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                isSelected
                    ? "bg-gray-200 border-gray-400 dark:bg-[rgba(0,0,0,0.2)] dark:border-neutral-500"
                    : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] dark:border-neutral-600 dark:hover:bg-[rgba(255,255,255,0.2)]"
            }`}
            onMouseDown={() => setIsSelected(true)}
            onMouseUp={() => setIsSelected(false)}
            onMouseLeave={() => setIsSelected(false)}
            onDoubleClick={(e) => handleRun(e)}
        >
            {parentFolderPath && (
                <div className="text-xs text-gray-600 dark:text-[rgba(255,255,255,0.23)] flex flex-row justify-start">
                    {parentFolderPath}
                </div>
            )}
            <div className="flex items-center gap-2 justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="font-bold text-lg">{script.name}</div>
                    {executingScript && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                >
                    {liteVersionDisplay && liteVersionDisplay}
                    {!liteVersionDisplay && (
                        <>
                            <div className="flex items-center gap-2 mr-2">
                                <button
                                    onClick={onLockedToggle}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-200 active:scale-95 border-0 outline-none shadow-none focus:outline-none focus:ring-0"
                                    style={{ boxShadow: "none" }}
                                    title={
                                        locked
                                            ? "Locked - Click to unlock"
                                            : "Unlocked - Click to lock"
                                    }
                                >
                                    <div
                                        className={`transition-transform duration-500 ${
                                            isFlipping ? "animate-[spin_0.6s_ease-in-out]" : ""
                                        }`}
                                    >
                                        {locked ? (
                                            <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        ) : (
                                            <LockOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        )}
                                    </div>
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs font-medium">Show Shell</span>
                                <Switch
                                    checked={showShell}
                                    onCheckedChange={onShowShellChange}
                                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-neutral-600"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="border border-[rgba(0,0,0,0.1)] text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-2 rounded-md dark:text-neutral-300 dark:bg-[rgba(0,0,0,0.1)] dark:border dark:border-[rgba(255,255,255,0.1)] max-h-16 overflow-y-auto line-clamp-4">
                {script.command}
            </div>

            {/* Dialogs outside the main div */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Script?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{script.name}"? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Edit Script</DialogTitle>
                        <DialogDescription>
                            Update the name and command for your script.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Script name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-command">Command</Label>
                            <Textarea
                                id="edit-command"
                                value={editCommand}
                                onChange={(e) => setEditCommand(e.target.value)}
                                placeholder="Command to execute"
                                rows={18}
                                className="font-mono text-sm bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{scriptCard}</ContextMenuTrigger>
            <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                <ContextMenuItem
                    onClick={handleExecuteClick}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                </ContextMenuItem>
                {!historyVersion && !locked && (
                    <>
                        <ContextMenuItem
                            onClick={handleEditClick}
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={handleDeleteClick}
                            className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Delete
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
