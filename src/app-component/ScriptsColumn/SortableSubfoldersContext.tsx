import { ScriptsFolderResponse } from "@/types/dto";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CollapsableFolder from "./SortatbleCollapsableFolder";

export default function SortableSubfoldersContext({
    folderResponse,
    closeAllFoldersTrigger,
}: {
    folderResponse: ScriptsFolderResponse;
    closeAllFoldersTrigger: number;
}) {
    return (
        <SortableContext
            items={folderResponse.subfolders.map((s) => s.id || 0)}
            strategy={verticalListSortingStrategy}
        >
            <div className="space-y-2">
                {folderResponse.subfolders.map((folder) => (
                    <CollapsableFolder
                        key={folder.id}
                        folder={folder}
                        closeAllFoldersTrigger={closeAllFoldersTrigger}
                    />
                ))}
            </div>
        </SortableContext>
    );
}
