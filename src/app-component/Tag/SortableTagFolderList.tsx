import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Folder, GripVertical } from "lucide-react";
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
import { tagApi, type TagFolderDTO } from "@/store/api/tagApi";
import { useAppDispatch } from "@/store/hooks";
import { setIsReorderingFolder } from "@/store/slices/rootFolderSlice";

export default function SortableTagFolderList({
    folders,
    selectedId,
    onSelect,
}: {
    folders: TagFolderDTO[];
    selectedId: number | "ungrouped" | null;
    onSelect: (id: number) => void;
}) {
    const dispatch = useAppDispatch();
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

    useEffect(() => () => {
        dispatch(setIsReorderingFolder(false));
    }, [dispatch]);

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

    return (
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
                    <SortableFolderRow
                        key={folder.id}
                        folder={folder}
                        selected={selectedId === folder.id}
                        onSelect={() => onSelect(folder.id)}
                    />
                ))}
            </SortableContext>
            <DragOverlay>
                {activeFolder ? (
                    <div className="cursor-grabbing overflow-hidden rounded-md bg-white shadow-md dark:bg-neutral-800">
                        <TagFolderPickerRow
                            label={activeFolder.name}
                            selected={selectedId === activeFolder.id}
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
    );
}

export function TagFolderPickerRow({
    label,
    selected,
    onClick,
    dragHandle,
}: {
    label: string;
    selected: boolean;
    onClick?: () => void;
    dragHandle?: ReactNode;
}) {
    return (
        <div
            className={cn(
                "flex w-full items-center rounded-md text-sm",
                selected
                    ? "bg-gray-600 text-white dark:bg-neutral-500"
                    : "hover:bg-gray-100 dark:hover:bg-neutral-700"
            )}
        >
            {dragHandle}
            <button
                type="button"
                onClick={onClick}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-2 text-left"
            >
                <Folder className="w-4 h-4 flex-shrink-0" fill="currentColor" />
                <span className="truncate">{label}</span>
            </button>
        </div>
    );
}

function SortableFolderRow({
    folder,
    selected,
    onSelect,
}: {
    folder: TagFolderDTO;
    selected: boolean;
    onSelect: () => void;
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
        <div ref={setNodeRef} style={style} {...attributes} className="w-full">
            <TagFolderPickerRow
                label={folder.name}
                selected={selected}
                onClick={onSelect}
                dragHandle={
                    <div
                        ref={setActivatorNodeRef}
                        {...listeners}
                        className={cn(
                            "cursor-grab active:cursor-grabbing p-0.5 ml-1 flex-shrink-0 rounded",
                            selected
                                ? "hover:bg-gray-800 dark:hover:bg-neutral-700"
                                : "hover:bg-gray-200 dark:hover:bg-neutral-600"
                        )}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>
                }
            />
        </div>
    );
}
