import React from "react";
import { FolderCode, Loader2, Plus } from "lucide-react";
import { folderApi } from "../../store/api/folderApi";
import { appStateApi } from "../../store/api/appStateApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { invoke } from "@tauri-apps/api/core";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import folderSlice from "../../store/slices/folderSlice";
import SortableFolderItem from "./SortableFolderItem";
import { ScriptsFolderDTO } from "@/types/dto";

export default function FolderColumn() {
    const dispatch = useAppDispatch();
    const selectedFolderId = useAppSelector((s) => s.folder.selectedRootFolderId);
    const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const [openingLocalhost, setOpeningLocalhost] = useState(false);

    const { data: folders, isLoading } = folderApi.endpoints.getAllFolders.useQuery(undefined, {
        skip: !backendPort,
        // Stabilize the reference to prevent unnecessary re-renders
        selectFromResult: (result) => ({
            ...result,
            data: result.data ?? [],
        }),
    });
    const [updateAppState] = appStateApi.endpoints.updateAppState.useMutation();
    const [reorderFolders] = folderApi.endpoints.reorderFolders.useMutation();
    const [updateFolder] = folderApi.endpoints.updateFolder.useMutation();
    const [deleteFolder] = folderApi.endpoints.deleteFolder.useMutation();
    const [createFolder] = folderApi.endpoints.createFolder.useMutation();
    const [createSubfolder] = folderApi.endpoints.createSubfolder.useMutation();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isBackendClicked, setIsBackendClicked] = useState(false);

    const { data: appState } = appStateApi.endpoints.getAppState.useQuery(undefined, {
        skip: !backendPort,
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleFolderClick = (folderId: number) => {
        dispatch(folderSlice.actions.setSelectedFolderId(folderId));
        if (appState) {
            updateAppState({ ...appState, lastOpenedFolderId: folderId });
        }
    };

    const handleDragStart = () => {
        // Hide selection highlight during drag to avoid flashing
        dispatch(folderSlice.actions.setIsReorderingFolder(true));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id && folders) {
            const oldIndex = folders.findIndex((f) => f.id === active.id);
            const newIndex = folders.findIndex((f) => f.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                reorderFolders({ fromIndex: oldIndex, toIndex: newIndex });
            }
        }

        // Restore selection highlight after drag
        dispatch(folderSlice.actions.setIsReorderingFolder(false));
    };

    const handleRename = (folder: ScriptsFolderDTO, newName: string) => {
        updateFolder({ ...folder, name: newName });
    };

    const handleDelete = async (id: number) => {
        await deleteFolder(id);
        // If the deleted folder was selected, clear selection
        if (selectedFolderId === id) {
            dispatch(folderSlice.actions.clearSelectedFolderId());
        }
    };

    const handleCreateFolder = async () => {
        if (newFolderName.trim()) {
            await createFolder({ name: newFolderName.trim() });
            setNewFolderName("");
            setIsCreateDialogOpen(false);
        }
    };

    const handleCreateSubfolder = async (parentId: number, subfolderName: string) => {
        await createSubfolder({ parentFolderId: parentId, name: subfolderName });
    };

    const handleOpenBackendApi = async () => {
        // Trigger click animation
        setIsBackendClicked(true);
        setTimeout(() => setIsBackendClicked(false), 200);

        const url = `http://localhost:${backendPort}/api`;
        try {
            // Use shell command to open URL in default browser
            // macOS: open, Windows: start, Linux: xdg-open
            const isMac = navigator.userAgent.includes("Mac");
            const isWindows = navigator.userAgent.includes("Windows");

            let command: string;
            if (isMac) {
                command = `open "${url}"`;
            } else if (isWindows) {
                command = `start "${url}"`;
            } else {
                command = `xdg-open "${url}"`;
            }
            setOpeningLocalhost(true);
            await invoke("execute_command", { command });
        } catch (error) {
            console.error("Failed to open backend API:", error);
        } finally {
            setOpeningLocalhost(false);
        }
    };

    const folderIds = React.useMemo(() => folders.map((f) => f.id), [folders]);

    return (
        <div className="flex flex-col h-full dark:text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 p-4">
                    <FolderCode />
                    <div className="font-medium">Script Folders</div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 mr-4 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                    onClick={() => setIsCreateDialogOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New Folder
                </Button>
            </div>
            <div className="h-px bg-gray-400 dark:bg-neutral-600" />
            <div className="space-y-1 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}
                {!isLoading && folders.length > 0 && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1">
                                {folders.map((folder) => (
                                    <SortableFolderItem
                                        key={folder.id}
                                        folder={{ ...folder, parenFolderId: null }}
                                        isSelected={!isReordering && selectedFolderId === folder.id}
                                        onClick={() => handleFolderClick(folder.id)}
                                        onRename={(newName: string) => {
                                            handleRename(folder, newName);
                                        }}
                                        onDelete={handleDelete}
                                        onCreateSubfolder={handleCreateSubfolder}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Backend Port Info */}
            <div
                className={`relative border-t border-gray-400 dark:border-neutral-600 p-2 text-xs text-neutral-500 dark:text-neutral-400 text-center cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 select-none ${
                    isBackendClicked
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : ""
                }`}
                onClick={handleOpenBackendApi}
                title="Click to open backend API in browser"
            >
                <span>Backend: localhost:{backendPort}/api</span>
                {openingLocalhost && (
                    <span className="absolute top-1/2 right-4 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                    </span>
                )}
            </div>

            {/* Create Folder Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>Enter a name for the new folder</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="folder-name">Folder Name</Label>
                            <Input
                                className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                id="folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newFolderName.trim()) {
                                        handleCreateFolder();
                                    }
                                }}
                                placeholder="My Scripts"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
