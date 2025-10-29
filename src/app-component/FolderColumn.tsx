
import { FolderCode } from "lucide-react";
import { folderApi } from "../store/api/folderApi";
import { appStateApi } from "../store/api/appStateApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSelectedFolderId } from "../store/slices/folderSlice";
import { cn } from "../lib/utils";

export default function FolderColumn() {
    const { data: folders, isLoading } = folderApi.endpoints.getAllFolders.useQuery();
    const dispatch = useAppDispatch();
    const selectedFolderId = useAppSelector(s => s.folder.selectedFolderId);
    const [setLastOpenedFolder] = appStateApi.endpoints.setLastOpenedFolder.useMutation();
    const handleFolderClick = (folderId: number) => {
        dispatch(setSelectedFolderId(folderId));
        setLastOpenedFolder(folderId);
    };
    appStateApi.endpoints.getAppState.useQuery();


    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-4">
                <FolderCode />
                <div className="font-medium">Script Folders</div>
            </div>
            <div className="h-px bg-gray-400" />
            <div className="space-y-1 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}
                {folders && folders.map((folder) => (
                    <div
                        key={folder.id}
                        onClick={() => handleFolderClick(folder.id)}
                        className={cn(
                            "px-3 py-2 rounded-md cursor-pointer transition-colors",
                            "hover:bg-gray-100 active:bg-gray-200",
                            selectedFolderId === folder.id && "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                        )}
                    >
                        {folder.name}
                    </div>
                ))}
            </div>
        </div>
    )
}