
import React from "react";
import { FolderCode, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { folderApi } from "../store/api/folderApi";
import { appStateApi } from "../store/api/appStateApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";

import { cn } from "../lib/utils";
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
    useSortable,
    verticalListSortingStrategy,
    defaultAnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Button } from "@/components/ui/button";
import { useState } from "react";
import folderSlice from "../store/slices/folderSlice";

interface SortableFolderItemProps {
    folder: { id: number; name: string; ordering: number };
    isSelected: boolean;
    onClick: () => void;
    onRename: (id: number, newName: string) => void;
    onDelete: (id: number) => void;
}

const SortableFolderItem = React.memo(function SortableFolderItem({ folder, isSelected, onClick, onRename, onDelete }: SortableFolderItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        setActivatorNodeRef,
    } = useSortable({
        id: folder.id,
        animateLayoutChanges: (args) => {
            const { wasDragging } = args;
            // Disable animation when dropping
            if (wasDragging) return false;
            return defaultAnimateLayoutChanges(args);
        },
    });

    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [newName, setNewName] = useState(folder.name);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
        width: '100%',
        height: 'auto',
        minHeight: 'fit-content',
        touchAction: 'none',
    };

    const handleRename = () => {
        onRename(folder.id, newName);
        setIsRenameOpen(false);
    };

    const handleDelete = () => {
        onDelete(folder.id);
        setIsDeleteOpen(false);
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                className="w-full flex-shrink-0"
                onClick={onClick}
            >
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full flex-shrink-0",
                                "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600",
                                isSelected && "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-gray-500 dark:hover:bg-gray-600 dark:active:bg-gray-700"
                            )}
                        >
                            <div
                                ref={setActivatorNodeRef}
                                {...listeners}
                                className={cn(
                                    "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-200 flex-shrink-0 dark:hover:bg-gray-600",
                                    isSelected && "hover:bg-gray-800 dark:hover:bg-gray-700"
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                                {folder.name}
                            </div>
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                        <ContextMenuItem className="dark:hover:bg-gray-700 dark:focus:bg-gray-700" onClick={() => {
                            setNewName(folder.name);
                            setIsRenameOpen(true);
                        }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => setIsDeleteOpen(true)}
                            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>

            {/* Rename Dialog */}
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent className="bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-700">
                    <DialogHeader>
                        <DialogTitle>Rename Folder</DialogTitle>
                        <DialogDescription>
                            Enter a new name for "{folder.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="folder-name">Folder Name</Label>
                            <Input
                                id="folder-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Folder name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={!newName}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{folder.name}"? This will also delete all scripts in this folder. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
        prevProps.folder.id === nextProps.folder.id &&
        prevProps.folder.name === nextProps.folder.name &&
        prevProps.folder.ordering === nextProps.folder.ordering &&
        prevProps.isSelected === nextProps.isSelected
    );
});

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
                    className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 mr-4 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    onClick={() => setIsCreateDialogOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New Folder
                </Button>
            </div>
            <div className="h-px bg-gray-400 dark:bg-gray-600" />
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
                <DialogContent className="bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700">
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