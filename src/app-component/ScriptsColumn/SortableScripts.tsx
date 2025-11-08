import { closestCenter, DndContext, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScriptsFolderResponse } from "@/types/dto";
import { DragEndEvent } from "@dnd-kit/core";
import { useAppDispatch } from "@/store/hooks";
import { folderSlice } from "@/store/slices/folderSlice";
import SortableScriptItem from "./SortableScriptItem";

export default function SortableScripts({
    sensors,
    handleDragScriptsEnd,
    folderResponse,
    selectedFolderId,
}: {
    sensors: ReturnType<typeof useSensors>;
    handleDragScriptsEnd: (event: DragEndEvent) => void;
    folderResponse: ScriptsFolderResponse;
    selectedFolderId: number;
}) {
    const dispatch = useAppDispatch();
    return (
        <DndContext
            onDragStart={() => {
                dispatch(folderSlice.actions.setIsReorderingFolder(true));
            }}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragScriptsEnd}
        >
            <SortableContext
                items={folderResponse.shellScripts.map((s) => ({ id: s.id || 0 }))}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4">
                    {folderResponse.shellScripts.map((script) => (
                        <SortableScriptItem
                            key={script.id}
                            script={script}
                            folderId={selectedFolderId}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
