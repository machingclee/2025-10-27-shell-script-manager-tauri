import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { ScriptsFolderResponse } from "@/types/dto";
import SortableScriptItem from "./SortableScriptItem";

export default function SortableScriptsContext({
    folderResponse,
    selectedFolderId,
}: {
    folderResponse: ScriptsFolderResponse;
    selectedFolderId: number;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `root-scripts-droppable-${selectedFolderId}`,
        data: {
            type: "folder",
            folderId: selectedFolderId,
        },
    });

    const { active } = useDndContext();
    const isDraggingScript = active?.data.current?.type === "script";
    const showHighlight = isOver && isDraggingScript;

    return (
        <SortableContext
            items={folderResponse.shellScripts.map((s) => s.id || 0)}
            strategy={verticalListSortingStrategy}
        >
            <div
                ref={setNodeRef}
                className={`space-y-4 min-h-[100px] p-2 rounded-md transition-colors ${
                    showHighlight ? "bg-gray-100 dark:bg-neutral-700" : ""
                }`}
            >
                {folderResponse.shellScripts.map((script) => (
                    <SortableScriptItem
                        key={script.id}
                        script={script}
                        folderId={selectedFolderId}
                    />
                ))}
                {folderResponse.shellScripts.length === 0 && (
                    <div className="text-gray-400 dark:text-neutral-500 text-center py-8">
                        Drop scripts here
                    </div>
                )}
            </div>
        </SortableContext>
    );
}
