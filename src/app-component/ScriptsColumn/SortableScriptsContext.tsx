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

    // Get the script's current parent folder ID
    const draggedScript = active?.data.current?.script;
    const scriptParentFolderId = draggedScript?.parentFolderId;

    // Only show highlight when:
    // 1. Dragging a script
    // 2. Over this droppable
    // 3. Script is from a different folder (subfolder, not the root folder)
    const isDraggingFromSubfolder = isDraggingScript && scriptParentFolderId !== selectedFolderId;
    const showHighlight = isOver && isDraggingFromSubfolder;

    return (
        <SortableContext
            items={folderResponse.shellScripts.map((s) => s.id || 0)}
            strategy={verticalListSortingStrategy}
        >
            <div
                ref={setNodeRef}
                className={`space-y-4 min-h-[400px] p-4 rounded-md transition-all duration-200 ${
                    showHighlight
                        ? "bg-neutral-200 dark:bg-neutral-700 border-2 border-neutral-400 dark:border-neutral-600"
                        : "border-2 border-transparent"
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
