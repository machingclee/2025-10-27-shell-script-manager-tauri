import { CollisionType, ScriptsFolderResponse } from "@/types/dto";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import clsx from "clsx";
import SortableFolderItem from "./SortableFolderItem";

export default function RootFoldersDroppableArea({
    folders,
    isReordering,
    selectedFolderId,
    handleFolderClick,
    handleRename,
    handleDelete,
    handleCreateSubfolder,
}: {
    folders: ScriptsFolderResponse[];
    isReordering: boolean;
    selectedFolderId: number | null;
    handleFolderClick: (folderId: number) => void;
    handleRename: (folder: ScriptsFolderResponse, newName: string) => void;
    handleDelete: (id: number) => Promise<void>;
    handleCreateSubfolder: (parentId: number, subfolderName: string) => Promise<void>;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: "root-folders-area",
        data: {
            type: CollisionType.ROOT_FOLDERS_AREA,
        },
    });

    const getSortableId = (folder: ScriptsFolderResponse) => {
        return `folder-${folder.id}`;
    };

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "min-h-[100px] rounded-md transition-colors",
                isOver && "bg-neutral-300 dark:bg-neutral-600"
            )}
        >
            <SortableContext
                items={folders.map((f) => getSortableId(f))}
                strategy={verticalListSortingStrategy}
            >
                {folders.length === 0 && isOver && (
                    <div className="flex items-center justify-center h-[100px] text-neutral-400 dark:text-neutral-500 text-sm">
                        Drop folder here to remove from workspace
                    </div>
                )}
                {folders.map((folder) => (
                    <SortableFolderItem
                        key={folder.id}
                        folder={folder}
                        sortableId={getSortableId(folder)}
                        isSelected={!isReordering && selectedFolderId === folder.id}
                        onClick={() => handleFolderClick(folder.id)}
                        onRename={(newName: string) => {
                            handleRename(folder, newName);
                        }}
                        onDelete={handleDelete}
                        onCreateSubfolder={handleCreateSubfolder}
                    />
                ))}
            </SortableContext>
        </div>
    );
}
