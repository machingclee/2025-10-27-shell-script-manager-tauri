import React from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { useState, useEffect } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, FolderPlus, Folder, ChevronRight, ChevronDown } from "lucide-react";
import { ScriptsFolderResponse } from "@/types/dto";
import { folderApi } from "@/store/api/folderApi";
import { useAppSelector } from "@/store/hooks";
import clsx from "clsx";
import SortableScriptItem from "./SortableScriptItem";

export default function ({
    folder: folder,
    closeAllFoldersTrigger,
}: {
    folder: ScriptsFolderResponse;
    closeAllFoldersTrigger: number;
}) {
    const [deleteFolder] = folderApi.endpoints.deleteFolder.useMutation();
    const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
    const [updateFolder] = folderApi.endpoints.updateFolder.useMutation();
    const [isExpanded, setIsExpanded] = useState(false);

    // Close folder when closeAllFoldersTrigger changes
    useEffect(() => {
        if (closeAllFoldersTrigger > 0) {
            setIsExpanded(false);
        }
    }, [closeAllFoldersTrigger]);

    const onClick = () => {
        setIsExpanded(!isExpanded);
    };
    const isSelected = false;
    const onRename = (newName: string) => {
        updateFolder({
            id: folder.id,
            ordering: folder.ordering,
            createdAt: folder.createdAt!,
            createdAtHk: folder.createdAtHk!,
            name: newName,
        });
    };
    const onDelete = (id: number) => {
        deleteFolder(id);
    };
    const onCreateSubfolder = (parentId: number, subfolderName: string) => {
        console.log("onCreateSubfolder", parentId, subfolderName);
    };

    const {
        attributes,
        listeners,
        setNodeRef: setSortableNodeRef,
        transform,
        transition,
        isDragging,
        setActivatorNodeRef,
    } = useSortable({
        id: folder.id!!,
        data: {
            type: "folder",
            folderId: folder.id,
            folder: folder,
        },
        animateLayoutChanges: (args) => {
            const { isSorting, wasDragging } = args;
            // Disable all animations when actively sorting or just finished dragging
            if (isSorting || wasDragging) return false;
            return defaultAnimateLayoutChanges(args);
        },
    });

    // Make folder also a droppable target for scripts
    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id: `folder-droppable-${folder.id}`,
        data: {
            type: "folder",
            folderId: folder.id,
            folder: folder,
        },
    });

    // Get the active dragging item to check if it's a script
    const { active, over } = useDndContext();
    const isDraggingScript = active?.data.current?.type === "script";

    // Check if this folder's droppable OR sortable is the "over" target
    // The folder has both IDs: the sortable ID (folder.id) and droppable ID (folder-droppable-${folder.id})
    const isFolderOver = over?.id === `folder-droppable-${folder.id}` || over?.id === folder.id;

    // Only show highlight when dragging a script over this folder
    const showHighlight = isFolderOver && isDraggingScript;

    // Close folder when dragging starts
    useEffect(() => {
        if (isDragging && isExpanded) {
            setIsExpanded(false);
        }
    }, [isDragging]);

    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isCreateSubfolderOpen, setIsCreateSubfolderOpen] = useState(false);
    const [newName, setNewName] = useState(folder.name);
    const [subfolderName, setSubfolderName] = useState("");

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transform ? "none" : transition, // Disable transition while transforming
        opacity: isDragging ? 0 : 1,
        width: "100%",
        height: "auto",
        minHeight: "fit-content",
        touchAction: "none",
    };

    const handleRename = () => {
        onRename(newName);
        setIsRenameOpen(false);
    };

    const handleDelete = () => {
        onDelete(folder.id);
        setIsDeleteOpen(false);
    };

    const handleCreateSubfolder = () => {
        if (subfolderName.trim()) {
            onCreateSubfolder(folder.id, subfolderName);
            setSubfolderName("");
            setIsCreateSubfolderOpen(false);
        }
    };

    const combinedRef = (node: HTMLElement | null) => {
        setSortableNodeRef(node);
        setDroppableNodeRef(node);
    };

    return (
        <>
            <div style={style} {...attributes} className="w-full flex-shrink-0" ref={combinedRef}>
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div
                            onClick={onClick}
                            className={clsx({
                                "flex items-center gap-3 pl-5 py-3 rounded-md transition-colors duration-200 w-full flex-shrink-0 cursor-pointer": true,
                                "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600":
                                    !showHighlight,
                                "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-neutral-500 dark:hover:bg-neutral-600 dark:active:bg-neutral-700":
                                    isSelected && !showHighlight,
                                "bg-transparent": isReordering && !showHighlight,
                                "hover:bg-transparent": isReordering && !showHighlight,
                                "active:bg-transparent": isReordering && !showHighlight,
                                "dark:hover:bg-transparent": isReordering && !showHighlight,
                                "dark:active:bg-transparent": isReordering && !showHighlight,
                                "bg-gray-400 dark:bg-neutral-600": showHighlight,
                            })}
                        >
                            <div
                                ref={setActivatorNodeRef}
                                {...listeners}
                                className={cn(
                                    "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-200 flex-shrink-0 dark:hover:bg-neutral-600",
                                    isSelected && "hover:bg-gray-800 dark:hover:bg-neutral-700"
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
                                {folder.shellScripts.length > 0 ? (
                                    isExpanded ? (
                                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                    )
                                ) : (
                                    <div className="w-4 h-4 flex-shrink-0" />
                                )}
                                <Folder className="w-4 h-4 flex-shrink-0" fill="currentColor" />
                                {folder.name}
                                {folder.shellScripts.length > 0 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({folder.shellScripts.length})
                                    </span>
                                )}
                            </div>
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:border-neutral-700">
                        {!folder.parentFolder && (
                            <ContextMenuItem
                                className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                                onClick={() => {
                                    setSubfolderName("");
                                    setIsCreateSubfolderOpen(true);
                                    onClick();
                                }}
                            >
                                <FolderPlus className="w-4 h-4 mr-2" />
                                Create Subfolder
                            </ContextMenuItem>
                        )}
                        <ContextMenuItem
                            className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                            onClick={() => {
                                setNewName(folder.name);
                                setIsRenameOpen(true);
                            }}
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => setIsDeleteOpen(true)}
                            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                {/* Scripts list - shown when expanded */}
                {isExpanded && folder.shellScripts.length > 0 && (
                    <SortableContext
                        items={folder.shellScripts.map((s) => s.id || 0)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="ml-8 mt-2 space-y-2">
                            {folder.shellScripts.map((script) => (
                                <SortableScriptItem
                                    key={script.id}
                                    script={script}
                                    parentFolderId={folder.id}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}
            </div>

            {/* Rename Dialog */}
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Rename Folder</DialogTitle>
                        <DialogDescription>Enter a new name for "{folder.name}".</DialogDescription>
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
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{folder.name}"? This will also delete
                            all scripts in this folder. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Subfolder Dialog */}
            <Dialog open={isCreateSubfolderOpen} onOpenChange={setIsCreateSubfolderOpen}>
                <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Create Subfolder</DialogTitle>
                        <DialogDescription>
                            Create a new subfolder inside "{folder.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="subfolder-name">Subfolder Name</Label>
                            <Input
                                id="subfolder-name"
                                value={subfolderName}
                                onChange={(e) => setSubfolderName(e.target.value)}
                                placeholder="Subfolder name"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && subfolderName.trim()) {
                                        handleCreateSubfolder();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateSubfolderOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateSubfolder} disabled={!subfolderName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
