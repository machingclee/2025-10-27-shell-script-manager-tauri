import { Button } from "@/components/ui/button";
import { Script, scriptApi } from "@/store/api/scriptApi";
import { Edit, Play, Trash } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

export default function ScriptItem({ script, folderId }: { script: Script; folderId: number }) {
    const [runScript] = scriptApi.endpoints.runScript.useMutation();
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();
    const [updateScript] = scriptApi.endpoints.updateScript.useMutation();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState(script.name);
    const [editCommand, setEditCommand] = useState(script.command);

    // Reset form when dialog opens
    useEffect(() => {
        if (isEditOpen) {
            setEditName(script.name);
            setEditCommand(script.command);
        }
    }, [isEditOpen, script.name, script.command]);

    const handleRun = () => {
        runScript(script.command);
    };

    const handleDelete = () => {
        deleteScript({ id: script.id, folderId });
    };

    const handleUpdate = async () => {
        await updateScript({
            id: script.id,
            name: editName,
            content: editCommand,
        });
        setIsEditOpen(false);
    };

    return (
        <div
            className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors bg-white cursor-pointer"
            onDoubleClick={handleRun}
        >
            <div className="flex items-center gap-2 justify-between mb-4">
                <div className="font-bold text-lg">{script.name}</div>
                <div className="flex items-center gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="!shadow-none">
                                <Trash className="w-4 h-4" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white text-black">
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
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="bg-gray-100 p-1 rounded-md border-0 !shadow-none">
                                <Edit className="w-4 h-4" /> Edit
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white text-black">
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
                                        rows={4}
                                        className="font-mono text-sm"
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
                        className="bg-gray-100 p-0 border-0 !shadow-none"
                        onClick={handleRun}
                    >
                        <Play className="w-4 h-4" /> Execute
                    </Button>
                </div>
            </div>
            <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-2 rounded-md">{script.command}</div>
        </div>
    );
}