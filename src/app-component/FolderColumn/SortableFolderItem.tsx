import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
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
import { Pencil, Trash2, FolderPlus } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

import clsx from "clsx";

export default React.memo(
    function SortableFolderItem({
        folder,
        isSelected,
        onClick,
        onRename,
        onDelete,
        onCreateSubfolder,
    }: {
        folder: { id: number; name: string; ordering: number; parenFolderId: number | null };
        isSelected: boolean;
        onClick: () => void;
        onRename: (newName: string) => void;
        onDelete: (id: number) => void;
        onCreateSubfolder: (parentId: number, subfolderName: string) => void;
    }) {
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
                const { isSorting, wasDragging } = args;
                // Disable all animations when actively sorting or just finished dragging
                if (isSorting || wasDragging) return false;
                return defaultAnimateLayoutChanges(args);
            },
        });
        const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
        const [isRenameOpen, setIsRenameOpen] = useState(false);
        const [isDeleteOpen, setIsDeleteOpen] = useState(false);
        const [isCreateSubfolderOpen, setIsCreateSubfolderOpen] = useState(false);
        const [newName, setNewName] = useState(folder.name);
        const [subfolderName, setSubfolderName] = useState("");

        const style: React.CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition: transform ? "none" : transition, // Disable transition while transforming
            opacity: isDragging ? 0.5 : 1,
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
                                className={clsx({
                                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full flex-shrink-0": true,
                                    "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600": true,
                                    "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-neutral-500 dark:hover:bg-neutral-600 dark:active:bg-neutral-700":
                                        isSelected,
                                    "bg-transparent": isReordering,
                                    "hover:bg-transparent": isReordering,
                                    "active:bg-transparent": isReordering,
                                    "dark:hover:bg-transparent": isReordering,
                                    "dark:active:bg-transparent": isReordering,
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
                                <div className="flex-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                                    {folder.name}
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:border-neutral-700">
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
                </div>

                {/* Rename Dialog */}
                <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                    <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
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
                    <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{folder.name}"? This will also
                                delete all scripts in this folder. This action cannot be undone.
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
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateSubfolderOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateSubfolder}
                                disabled={!subfolderName.trim()}
                            >
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render if these specific props change
        return (
            prevProps.folder.id === nextProps.folder.id &&
            prevProps.folder.name === nextProps.folder.name &&
            prevProps.folder.ordering === nextProps.folder.ordering &&
            prevProps.isSelected === nextProps.isSelected
        );
    }
);
