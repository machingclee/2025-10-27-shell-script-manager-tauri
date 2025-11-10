import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { GripVertical, Folders, ChevronRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
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
import { WorkspaceDTO, WorkspaceResponse, CollisionType, ScriptsFolderResponse } from "@/types/dto";
import { useAppSelector } from "@/store/hooks";
import clsx from "clsx";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableFolderItem from "./SortableFolderItem";

export default function SortableWorkspace({
    workspace,
    onRename,
    onDelete,
    onFolderClick,
    sortableId,
    droppableId,
}: {
    workspace: WorkspaceResponse;
    sortableId: string;
    droppableId: string;
    onRename: (workspace: WorkspaceDTO, newName: string) => void;
    onDelete: (id: number) => void;
    onFolderClick: (folderId: number) => void;
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
        id: sortableId,
        data: {
            type: CollisionType.WORKSPACE,
            object: workspace,
        },
    });

    // Make the workspace header a droppable zone for folders
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: droppableId,
        data: {
            type: CollisionType.WORKSPACE,
            object: workspace,
        },
    });

    const folders = workspace?.folders || [];
    const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
    const selectedFolderId = useAppSelector((s) => s.folder.selectedRootFolderId);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [newName, setNewName] = useState(workspace.name);

    const getWorkspaceFolderSortableId = (folder: ScriptsFolderResponse) => {
        return `workspace-folder-${workspace.id}-${folder.id}`;
    };

    // Callback ref to set both sortable and droppable refs on the entire workspace container
    const setContainerRef = React.useCallback(
        (node: HTMLDivElement | null) => {
            setDroppableRef(node);
        },
        [setDroppableRef]
    );

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0 : 1,
        width: "100%",
        height: "auto",
        minHeight: "fit-content",
        touchAction: "none",
    };

    const handleRename = () => {
        onRename(workspace, newName);
        setIsRenameOpen(false);
    };

    const handleDelete = () => {
        onDelete(workspace.id);
        setIsDeleteOpen(false);
    };

    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} className="w-full flex-shrink-0">
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div
                            ref={setContainerRef}
                            className={clsx({
                                "w-full rounded-md transition-colors p-1": true,
                                "bg-neutral-200 dark:bg-neutral-700": isOver,
                            })}
                        >
                            {/* Workspace Header */}
                            <div
                                className={clsx({
                                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full flex-shrink-0": true,
                                    "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600": true,
                                    "bg-transparent": isReordering,
                                    "hover:bg-transparent": isReordering,
                                    "active:bg-transparent": isReordering,
                                })}
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                <div
                                    ref={setActivatorNodeRef}
                                    {...listeners}
                                    className={cn(
                                        "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-200 flex-shrink-0 dark:hover:bg-neutral-600"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <GripVertical className="w-4 h-4" />
                                </div>

                                {/* Chevron for expand/collapse */}
                                <div className="flex-shrink-0">
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </div>

                                {/* Workspace Name */}
                                <div className="flex-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                                    {workspace.name}
                                </div>

                                {/* Folder Count */}
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                    {folders.length}
                                </div>
                            </div>

                            {/* Folders List (when expanded) */}
                            {isExpanded && folders.length > 0 && (
                                <div className="ml-8 mt-1 space-y-1">
                                    <SortableContext
                                        items={folders.map((f) => getWorkspaceFolderSortableId(f))}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {folders.map((folder) => (
                                            <SortableFolderItem
                                                key={folder.id}
                                                folder={folder}
                                                isSelected={selectedFolderId === folder.id}
                                                onClick={() => onFolderClick(folder.id)}
                                                onRename={() => {}}
                                                onDelete={() => {}}
                                                onCreateSubfolder={() => {}}
                                                type={CollisionType.WORKSPACE_NESTED_FOLDER}
                                                sortableId={getWorkspaceFolderSortableId(folder)}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                            )}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:border-neutral-700">
                        <ContextMenuItem
                            className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                            onClick={() => {
                                setNewName(workspace.name);
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
                        <DialogTitle>Rename Workspace</DialogTitle>
                        <DialogDescription>
                            Enter a new name for "{workspace.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="workspace-name">Workspace Name</Label>
                            <Input
                                id="workspace-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Workspace name"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newName.trim()) {
                                        handleRename();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={!newName.trim()}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{workspace.name}"? This action cannot
                            be undone.
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
        </>
    );
}
