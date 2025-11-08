import { ScriptsFolderResponse } from "@/types/dto";
import { closestCenter, DndContext, useSensors } from "@dnd-kit/core";
import { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CollapsableFolder from "./CollapsableFolder";
import { folderSlice } from "@/store/slices/folderSlice";
import { useAppDispatch } from "@/store/hooks";

export default function SortableSubfolders({
    sensors,
    handleDragFoldersEnd,
    folderResponse,
}: {
    sensors: ReturnType<typeof useSensors>;
    handleDragFoldersEnd: (event: DragEndEvent) => void;
    folderResponse: ScriptsFolderResponse;
}) {
    const dispatch = useAppDispatch();
    return (
        <DndContext
            onDragStart={() => {
                dispatch(folderSlice.actions.setIsReorderingFolder(true));
            }}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragFoldersEnd}
        >
            <SortableContext
                items={folderResponse.subfolders.map((s) => ({ id: s.id || 0 }))}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4">
                    {folderResponse.subfolders.map((folder) => (
                        <CollapsableFolder key={folder.id} folder={folder} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
