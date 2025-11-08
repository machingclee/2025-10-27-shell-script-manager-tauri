import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Plus, ScrollText, GripVertical } from "lucide-react";
import ScriptItem from "./ScriptItem";
import { Button } from "@/components/ui/button";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    defaultAnimateLayoutChanges,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useState } from "react";
import { scriptApi } from "@/store/api/scriptApi";
import { folderApi } from "@/store/api/folderApi";
import { ScriptsFolderResponse, ShellScriptDTO } from "@/types/dto";
import CollapsableFolder from "./CollapsableFolder";
import folderSlice from "@/store/slices/folderSlice";
import SortableSubfolders from "./SortableSubfolders";
import SortableScripts from "./SortableScripts";

export default function ScriptsColumn() {
    const selectedFolderId = useAppSelector((s) => s.folder.selectedFolderId);
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { data: selectedFolder } = folderApi.endpoints.getAllFolders.useQueryState(undefined, {
        selectFromResult: (result) => ({
            data: result.data?.find((f) => f.id === selectedFolderId),
        }),
    });
    const { data: folderResponse, isLoading } = folderApi.endpoints.getFolderById.useQuery(
        selectedFolderId ?? 0,
        {
            skip: !backendPort || !selectedFolderId,
        }
    );
    const [createScript] = scriptApi.endpoints.createScript.useMutation();
    const [reorderScripts] = scriptApi.endpoints.reorderScripts.useMutation();
    const [reorderSubfolders] = folderApi.endpoints.reorderFolders.useMutation();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCommand, setNewCommand] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragScriptsEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        console.log("active", active);
        console.log("over", over);
        if (over && active.id !== over.id && folderResponse && selectedFolderId) {
            const oldIndex = folderResponse.shellScripts.findIndex((s) => s.id === active.id);
            const newIndex = folderResponse.shellScripts.findIndex((s) => s.id === over.id);

            console.log("oldIndex", oldIndex);
            console.log("newIndex", newIndex);
            if (oldIndex !== -1 && newIndex !== -1) {
                console.log("reordering scripts");
                reorderScripts({
                    folderId: selectedFolderId,
                    fromIndex: oldIndex,
                    toIndex: newIndex,
                })
                    .unwrap()
                    .catch((error) => {
                        console.error("Failed to reorder scripts:", error);
                    });
            }
        }
    };

    const handleDragFoldersEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        console.log("active", active);
        console.log("over", over);
        if (over && active.id !== over.id && folderResponse && selectedFolderId) {
            const oldIndex = folderResponse.subfolders.findIndex((s) => s.id === active.id);
            const newIndex = folderResponse.subfolders.findIndex((s) => s.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                console.log("reordering scripts");
                reorderSubfolders({
                    parentFolderId: selectedFolderId,
                    fromIndex: oldIndex,
                    toIndex: newIndex,
                })
                    .unwrap()
                    .catch((error) => {
                        console.error("Failed to reorder scripts:", error);
                    });
            }
        }
        dispatch(folderSlice.actions.setIsReorderingFolder(false));
    };

    const handleCreate = async () => {
        if (!selectedFolderId) return;

        await createScript({
            name: newName,
            content: newCommand,
            folderId: selectedFolderId,
        });

        setNewName("");
        setNewCommand("");
        setIsCreateOpen(false);
    };

    const displayName = () => {
        if (selectedFolder) {
            return (
                <div>
                    Scripts in <span className="font-bold text-[18px]">{selectedFolder.name}</span>
                </div>
            );
        }
        return <Label>Scripts</Label>;
    };

    const header = () => {
        return (
            <>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 p-4">
                        <ScrollText />
                        <div className="font-medium">{displayName()}</div>
                    </div>
                    <Button
                        variant="ghost"
                        className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 mr-4 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                        disabled={!selectedFolderId}
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="w-4 h-4" /> Add Script
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                            <DialogHeader>
                                <DialogTitle>Create New Script</DialogTitle>
                                <DialogDescription>
                                    Add a new script with a name and command.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-name">Name</Label>
                                    <Input
                                        className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                        id="new-name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Script name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-command">Command</Label>
                                    <Textarea
                                        id="new-command"
                                        value={newCommand}
                                        onChange={(e) => setNewCommand(e.target.value)}
                                        placeholder="Command to execute"
                                        rows={4}
                                        className="font-mono text-sm  bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={!newName || !newCommand}>
                                    Create Script
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </>
        );
    };

    return (
        <div className="flex flex-col h-full dark:text-white">
            {header()}
            <div className="h-px bg-gray-400 dark:bg-neutral-600" />
            <div className="space-y-2 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}

                {folderResponse &&
                    folderResponse.shellScripts &&
                    folderResponse.shellScripts.length > 0 &&
                    selectedFolderId && (
                        <SortableSubfolders
                            sensors={sensors}
                            handleDragFoldersEnd={handleDragFoldersEnd}
                            folderResponse={folderResponse}
                        />
                    )}

                <div className="h-5"></div>

                {folderResponse &&
                    folderResponse.shellScripts &&
                    folderResponse.shellScripts.length > 0 &&
                    selectedFolderId && (
                        <SortableScripts
                            sensors={sensors}
                            handleDragScriptsEnd={handleDragScriptsEnd}
                            folderResponse={folderResponse}
                            selectedFolderId={selectedFolderId}
                        />
                    )}
            </div>
        </div>
    );
}
