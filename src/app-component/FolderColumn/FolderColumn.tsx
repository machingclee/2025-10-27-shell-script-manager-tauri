
import React from "react";
import { FolderCode, Plus } from "lucide-react";
import { folderApi } from "../../store/api/folderApi";
import { appStateApi } from "../../store/api/appStateApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import { Button } from "@/components/ui/button";
import { useState } from "react";
import folderSlice from "../../store/slices/folderSlice";
import SortableFolderItem from "./SortableFolderItem";



export default function FolderColumn() {
    const { data: folders, isLoading } = folderApi.endpoints.getAllFolders.useQuery(undefined, {
        // Stabilize the reference to prevent unnecessary re-renders
        selectFromResult: (result) => ({
            ...result,
            data: result.data ?? [],
        }),
    });
    const dispatch = useAppDispatch();
    const selectedFolderId = useAppSelector(s => s.folder.selectedFolderId);
    const isReordering = useAppSelector(s => s.folder.isReorderingFolder);
    const [setLastOpenedFolder] = appStateApi.endpoints.setLastOpenedFolder.useMutation();
    const [reorderFolders] = folderApi.endpoints.reorderFolders.useMutation();
    const [renameFolder] = folderApi.endpoints.renameFolder.useMutation();
    const [deleteFolder] = folderApi.endpoints.deleteFolder.useMutation();
    const [createFolder] = folderApi.endpoints.createFolder.useMutation();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    appStateApi.endpoints.getAppState.useQuery();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleFolderClick = (folderId: number) => {
        dispatch(folderSlice.actions.setSelectedFolderId(folderId));
        setLastOpenedFolder(folderId);
    };

    const handleDragStart = () => {
        // Hide selection highlight during drag to avoid flashing
        dispatch(folderSlice.actions.setIsReorderingFolder(true));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id && folders) {
            const oldIndex = folders.findIndex((f) => f.id === active.id);
            const newIndex = folders.findIndex((f) => f.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                reorderFolders({ fromIndex: oldIndex, toIndex: newIndex });
            }
        }

        // Restore selection highlight after drag
        dispatch(folderSlice.actions.setIsReorderingFolder(false));
    };

    const handleRename = (id: number, newName: string) => {
        renameFolder({ id, newName });
    };

    const handleDelete = (id: number) => {
        deleteFolder(id);
        // If the deleted folder was selected, clear selection
        if (selectedFolderId === id) {
            dispatch(folderSlice.actions.clearSelectedFolderId());
        }
    };

    const handleCreateFolder = async () => {
        if (newFolderName.trim()) {
            await createFolder({ name: newFolderName.trim() });
            setNewFolderName("");
            setIsCreateDialogOpen(false);
        }
    };

    const folderIds = React.useMemo(() => folders.map(f => f.id), [folders]);

    return (
        <div className="flex flex-col h-full dark:text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 p-4">
                    <FolderCode />
                    <div className="font-medium">Script Folders</div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 mr-4 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                    onClick={() => setIsCreateDialogOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New Folder
                </Button>
            </div>
            <div className="h-px bg-gray-400 dark:bg-neutral-600" />
            <div className="space-y-1 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}
                {!isLoading && folders.length > 0 && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={folderIds}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1">
                                {folders.map((folder) => (
                                    <SortableFolderItem
                                        key={folder.id}
                                        folder={folder}
                                        isSelected={!isReordering && selectedFolderId === folder.id}
                                        onClick={() => handleFolderClick(folder.id)}
                                        onRename={handleRename}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Create Folder Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                            Enter a name for the new folder
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="folder-name">Folder Name</Label>
                            <Input
                                className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                id="folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newFolderName.trim()) {
                                        handleCreateFolder();
                                    }
                                }}
                                placeholder="My Scripts"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}