import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Folder, GripVertical, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import clsx from "clsx";
import { cn } from "@/lib/utils";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    defaultAnimateLayoutChanges,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tagApi, type TagFolderDTO } from "@/store/api/tagApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setIsReorderingFolder } from "@/store/slices/rootFolderSlice";
import { useTagSelection, type SelectedTagFolderId } from "./tagSelection";

const inputClass =
    "bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white";

export default function TagFolderColumn() {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { selectedId, select } = useTagSelection();
    const { data: folders = [], isLoading } = tagApi.endpoints.getAllTagFolders.useQuery(
        undefined,
        { skip: !backendPort }
    );
    const [createTagFolder] = tagApi.endpoints.createTagFolder.useMutation();
    const [updateTagFolder] = tagApi.endpoints.updateTagFolder.useMutation();
    const [deleteTagFolder] = tagApi.endpoints.deleteTagFolder.useMutation();
    const [createTag] = tagApi.endpoints.createTag.useMutation();
    const [reorderTagFolders] = tagApi.endpoints.reorderTagFolders.useMutation();
    const [activeId, setActiveId] = useState<number | null>(null);
    const [displayFolders, setDisplayFolders] = useState(folders);
    const reorderInFlight = useRef(false);
    const foldersRef = useRef(folders);
    foldersRef.current = folders;
    const folderOrderKey = folders.map((folder) => folder.id).join(",");
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const activeFolder = displayFolders.find((folder) => folder.id === activeId) ?? null;

    useEffect(() => {
        if (reorderInFlight.current) return;
        setDisplayFolders(foldersRef.current);
    }, [folderOrderKey]);

    function stopReordering() {
        setActiveId(null);
        dispatch(setIsReorderingFolder(false));
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(Number(event.active.id));
        dispatch(setIsReorderingFolder(true));
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        stopReordering();
        if (!over || active.id === over.id) return;
        const fromIndex = displayFolders.findIndex((folder) => folder.id === active.id);
        const toIndex = displayFolders.findIndex((folder) => folder.id === over.id);
        if (fromIndex < 0 || toIndex < 0) return;
        const previous = displayFolders;
        reorderInFlight.current = true;
        setDisplayFolders(arrayMove(displayFolders, fromIndex, toIndex));
        try {
            await reorderTagFolders({ fromIndex, toIndex }).unwrap();
        } catch {
            setDisplayFolders(previous);
        } finally {
            reorderInFlight.current = false;
        }
    }

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    useEffect(() => {
        if (isLoading) return;
        if (selectedId == null) {
            select(folders[0]?.id ?? "ungrouped");
            return;
        }
        if (typeof selectedId === "number" && !folders.some((folder) => folder.id === selectedId)) {
            select(folders[0]?.id ?? "ungrouped");
        }
    }, [folders, isLoading, select, selectedId]);

    function choose(id: SelectedTagFolderId) {
        select(id);
    }

    async function handleCreateFolder() {
        const name = newFolderName.trim();
        if (!name) return;
        try {
            const created = await createTagFolder({ name }).unwrap();
            setNewFolderName("");
            setIsCreateOpen(false);
            choose(created.id);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    return (
        <div className="flex flex-col h-full dark:text-white">
            <div className="flex items-center justify-end w-full pt-[6px] pb-[7px] pr-[10px]">
                <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white p-1 !h-8 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                    onClick={() => {
                        setNewFolderName("");
                        setIsCreateOpen(true);
                    }}
                    title="Create tag folder"
                >
                    <Plus className="w-4 h-4" />
                    Tag Folder
                </Button>
            </div>
            <div className="h-[3px] bg-gray-400 dark:bg-neutral-700/70" />
            <div className="space-y-1 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}
                {!isLoading && displayFolders.length === 0 && (
                    <div className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">
                        No tag folders yet.
                    </div>
                )}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={stopReordering}
                >
                <SortableContext
                    items={displayFolders.map((folder) => folder.id)}
                    strategy={verticalListSortingStrategy}
                >
                {displayFolders.map((folder) => (
                    <TagFolderRow
                        key={folder.id}
                        folder={folder}
                        isSelected={selectedId === folder.id}
                        onSelect={() => choose(folder.id)}
                        onRename={(name) => updateTagFolder({ ...folder, name })}
                        onDelete={async () => {
                            await deleteTagFolder(folder.id);
                            if (selectedId === folder.id) {
                                const remaining = displayFolders.filter((item) => item.id !== folder.id);
                                choose(remaining[0]?.id ?? "ungrouped");
                            }
                        }}
                        onAddTag={(name) =>
                            createTag({ name, tagFolderId: folder.id }).unwrap()
                        }
                    />
                ))}
                </SortableContext>
                <DragOverlay>
                    {activeFolder ? (
                        <div className="opacity-80 cursor-grabbing">
                            <TagFolderRowFace
                                folder={activeFolder}
                                isSelected={selectedId === activeFolder.id}
                                dragHandle={
                                    <div className="p-0.5 flex-shrink-0">
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                }
                            />
                        </div>
                    ) : null}
                </DragOverlay>
                </DndContext>
            </div>
            <UngroupedRow
                isSelected={selectedId === "ungrouped"}
                onSelect={() => choose("ungrouped")}
                onAddTag={(name) => createTag({ name, tagFolderId: null }).unwrap()}
            />

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>Enter a name for the new tag folder</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tag-folder-name">Folder Name</Label>
                            <Input
                                className={inputClass}
                                id="tag-folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newFolderName.trim()) {
                                        handleCreateFolder();
                                    }
                                }}
                                placeholder="My Tags"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TagFolderRowFace({
    folder,
    isSelected,
    isReordering = false,
    dragHandle,
}: {
    folder: TagFolderDTO;
    isSelected: boolean;
    isReordering?: boolean;
    dragHandle?: ReactNode;
}) {
    return (
        <div
            className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full flex-shrink-0",
                "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600",
                isSelected &&
                    "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-neutral-500 dark:hover:bg-neutral-600 dark:active:bg-neutral-700",
                isReordering &&
                    "bg-transparent hover:bg-transparent active:bg-transparent dark:hover:bg-transparent dark:active:bg-transparent"
            )}
        >
            {dragHandle}
            <Folder className="w-5 h-5 flex-shrink-0" fill="currentColor" />
            <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
                {folder.name}
            </div>
        </div>
    );
}

function TagFolderRow({
    folder,
    isSelected,
    onSelect,
    onRename,
    onDelete,
    onAddTag,
}: {
    folder: TagFolderDTO;
    isSelected: boolean;
    onSelect: () => void;
    onRename: (name: string) => void;
    onDelete: () => void;
    onAddTag: (name: string) => Promise<unknown>;
}) {
    const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
    const contextMenuJustClosedRef = useRef(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newName, setNewName] = useState(folder.name);
    const [tagName, setTagName] = useState("");
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
        data: { type: "tag-folder", folder },
        animateLayoutChanges: (args) => {
            const { isSorting, wasDragging } = args;
            if (isSorting || wasDragging) return false;
            return defaultAnimateLayoutChanges(args);
        },
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transform ? "none" : transition,
        opacity: isDragging ? 0 : 1,
        width: "100%",
        touchAction: "none",
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                className="w-full flex-shrink-0"
                onClick={() => {
                    if (contextMenuJustClosedRef.current) return;
                    onSelect();
                }}
            >
                <ContextMenu
                    onOpenChange={(open) => {
                        if (!open) {
                            contextMenuJustClosedRef.current = true;
                            setTimeout(() => {
                                contextMenuJustClosedRef.current = false;
                            }, 300);
                        }
                    }}
                >
                    <ContextMenuTrigger asChild>
                        <div>
                            <TagFolderRowFace
                                folder={folder}
                                isSelected={isSelected}
                                isReordering={isReordering}
                                dragHandle={
                                    <div
                                        ref={setActivatorNodeRef}
                                        {...listeners}
                                        className={cn(
                                            "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-200 flex-shrink-0 dark:hover:bg-neutral-600",
                                            isSelected &&
                                                "hover:bg-gray-800 dark:hover:bg-neutral-700"
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                }
                            />
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:border-neutral-700">
                        <ContextMenuItem
                            className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                            onClick={() => {
                                onSelect();
                                setTagName("");
                                setIsAddOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Tag
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

            <NameDialog
                open={isRenameOpen}
                onOpenChange={setIsRenameOpen}
                title="Rename Folder"
                description={`Enter a new name for "${folder.name}".`}
                inputId={`rename-tag-folder-${folder.id}`}
                label="Folder Name"
                value={newName}
                onChange={setNewName}
                confirmLabel="Rename"
                onConfirm={() => {
                    const name = newName.trim();
                    if (!name) return;
                    onRename(name);
                    setIsRenameOpen(false);
                }}
            />
            <NameDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                title={`Add Tag to "${folder.name}"`}
                description="Create a new tag inside this folder."
                inputId={`add-tag-${folder.id}`}
                label="Tag Name"
                value={tagName}
                onChange={setTagName}
                confirmLabel="Create"
                onConfirm={async () => {
                    const name = tagName.trim();
                    if (!name) return;
                    try {
                        await onAddTag(name);
                        setTagName("");
                        setIsAddOpen(false);
                    } catch {
                        // The request layer already surfaces the server message.
                    }
                }}
            />
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete "{folder.name}"? Tags in this folder stay, and they move to
                            Ungrouped.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onDelete}
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

function UngroupedRow({
    isSelected,
    onSelect,
    onAddTag,
}: {
    isSelected: boolean;
    onSelect: () => void;
    onAddTag: (name: string) => Promise<unknown>;
}) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [tagName, setTagName] = useState("");

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className={`border-t border-gray-400 dark:border-neutral-600 p-2 text-xs cursor-pointer select-none flex items-center gap-2 transition-colors duration-150 ${
                            isSelected
                                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        }`}
                        onClick={onSelect}
                    >
                        <Tag className="w-4 h-4 flex-shrink-0" />
                        <span>Ungrouped</span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:border-neutral-700">
                    <ContextMenuItem
                        className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                        onClick={() => {
                            onSelect();
                            setTagName("");
                            setIsAddOpen(true);
                        }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tag
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            <NameDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                title="Add Tag"
                description="Create a tag that is not in a folder."
                inputId="add-ungrouped-tag"
                label="Tag Name"
                value={tagName}
                onChange={setTagName}
                confirmLabel="Create"
                onConfirm={async () => {
                    const name = tagName.trim();
                    if (!name) return;
                    try {
                        await onAddTag(name);
                        setTagName("");
                        setIsAddOpen(false);
                    } catch {
                        // The request layer already surfaces the server message.
                    }
                }}
            />
        </>
    );
}

function NameDialog({
    open,
    onOpenChange,
    title,
    description,
    inputId,
    label,
    value,
    onChange,
    confirmLabel,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    inputId: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    confirmLabel: string;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={inputId}>{label}</Label>
                        <Input
                            id={inputId}
                            className={inputClass}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && value.trim()) onConfirm();
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={!value.trim()}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
