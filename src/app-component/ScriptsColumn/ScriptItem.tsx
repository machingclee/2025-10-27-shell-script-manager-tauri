import { Button } from "@/components/ui/button";
import { Edit, Play, Trash } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
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

export default function ScriptItem({ script, folderId }: { script: ShellScriptDTO; folderId: number }) {
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();
    const [updateScript] = scriptApi.endpoints.updateScript.useMutation();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editName, setEditName] = useState(script.name);
    const [editCommand, setEditCommand] = useState(script.command);
    const [isSelected, setIsSelected] = useState(false);
    const [showShell, setShowShell] = useState(false);

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
            console.log('Running script:', script.command);
            await invoke('run_script', { command: script.command });
        } catch (error) {
            console.error('Failed to run script:', error);
        }
    };

    const handleDelete = () => {
        deleteScript({ id: script.id ?? 0, folderId });
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
            ...script as unknown as ScriptsFolderDTO,
            id: script.id,
            name: editName,
            command: editCommand,
            showShell: showShell,
        }
        await updateScript(finalScriptDTO);
        setIsEditOpen(false);
    };

    const onShowShellChange = (checked: boolean) => {

        setShowShell(checked);
    };

    return (
        <div
            className={`px-3 py-2 rounded-md border transition-colors cursor-pointer ${isSelected
                ? 'bg-gray-200 border-gray-400 dark:bg-[rgba(0,0,0,0.2)] dark:border-neutral-500'
                : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] dark:border-neutral-600 dark:hover:bg-[rgba(255,255,255,0.2)]'
                }`}
            onMouseDown={() => setIsSelected(true)}
            onMouseUp={() => setIsSelected(false)}
            onMouseLeave={() => setIsSelected(false)}
            onDoubleClick={(e) => handleRun(e)}
        >
            <div className="flex items-center gap-2 justify-between mb-4">
                <div className="font-bold text-lg">{script.name}</div>
                <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs font-medium">Show Shell</span>
                        <Switch
                            checked={showShell}
                            onCheckedChange={onShowShellChange}
                            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-neutral-600"
                        />
                    </div>
                    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                        <Button
                            variant="destructive"
                            className="!shadow-none transition-transform duration-150 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                            onClick={handleDeleteClick}
                        >
                            <Trash className="w-4 h-4" /> Delete
                        </Button>
                        <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Script?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete "{script.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button
                        variant="ghost"
                        className="bg-gray-100 p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                        onClick={handleEditClick}
                    >
                        <Edit className="w-4 h-4" /> Edit
                    </Button>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen} >
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
                                        className="font-mono text-sm  bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdate}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button
                        variant="ghost"
                        className="bg-gray-100 p-0 border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                        onClick={handleExecuteClick}
                    >
                        <Play className="w-4 h-4" /> Execute
                    </Button>
                </div>
            </div>
            <div className="border border-[rgba(0,0,0,0.1)] text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-2 rounded-md dark:text-neutral-300 dark:bg-[rgba(0,0,0,0.1)] dark:border dark:border-[rgba(255,255,255,0.1)]">{script.command}</div>
        </div>
    );
}