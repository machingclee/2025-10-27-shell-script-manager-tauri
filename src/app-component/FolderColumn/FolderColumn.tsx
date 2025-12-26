import { FolderCode, Loader2, Plus } from "lucide-react";
import { folderApi } from "../../store/api/folderApi";
import { workspaceApi } from "../../store/api/workspaceApi";
import { appStateApi } from "../../store/api/appStateApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { invoke } from "@tauri-apps/api/core";

import {
    DndContext,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    CollisionDetection,
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
import SortableWorkspace from "./SortableWorkspace";
import {
    WorkspaceResponse,
    CollisionType as CollisionType,
    ScriptsFolderResponse,
} from "@/types/dto";
import RootFoldersDroppableArea from "./RootFoldersDroppableArea";

// Root Folders Droppable Area Component

type LeftColumnCollision =
    | {
          type: CollisionType.WORKSPACE;
          object: WorkspaceResponse;
      }
    | {
          type: CollisionType.ROOT_FOLDER;
          object: ScriptsFolderResponse;
      }
    | {
          type: CollisionType.WORKSPACE_NESTED_FOLDER;
          object: ScriptsFolderResponse;
      }
    | {
          type: CollisionType.ROOT_FOLDERS_AREA;
          object: null;
      };

export default function FolderColumn() {
    const dispatch = useAppDispatch();
    const selectedFolderId = useAppSelector((s) => s.folder.selectedRootFolderId);
    const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const [openingLocalhost, setOpeningLocalhost] = useState(false);

    // Track active dragging item for DragOverlay
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceResponse | null>(null);
    const [activeFolder, setActiveFolder] = useState<
        ScriptsFolderResponse | WorkspaceResponse | null
    >(null);

    const { data: workspaces, isLoading: isLoadingWorkspaces } =
        workspaceApi.endpoints.getAllWorkspaces.useQuery(undefined, {
            skip: !backendPort,
            selectFromResult: (result) => ({
                ...result,
                data: result.data ?? [],
            }),
        });

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
    const [createFolder] = folderApi.endpoints.createRootFolder.useMutation();
    const [createSubfolder] = folderApi.endpoints.createSubfolder.useMutation();
    const [createWorkspace] = workspaceApi.endpoints.createWorkspace.useMutation();
    const [updateWorkspace] = workspaceApi.endpoints.updateWorkspace.useMutation();
    const [deleteWorkspace] = workspaceApi.endpoints.deleteWorkspace.useMutation();
    const [reorderWorkspaces] = workspaceApi.endpoints.reorderWorkspaces.useMutation();
    const [moveFolderToWorkspace] = workspaceApi.endpoints.moveFolderToWorkspace.useMutation();
    const [resetFolderParentWorkspace] =
        workspaceApi.endpoints.resetFolderParentWorkspace.useMutation();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreateWorkspaceDialogOpen, setIsCreateWorkspaceDialogOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [isBackendClicked, setIsBackendClicked] = useState(false);

    const { data: appState } = appStateApi.endpoints.getAppState.useQuery(undefined, {
        skip: !backendPort,
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
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

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const id = String(active.id);

        // Determine if dragging workspace, root folder, or workspace folder
        if (id.startsWith("workspace-folder-")) {
            // Parse workspace-folder-{workspaceId}-{folderId}
            const parts = id.replace("workspace-folder-", "").split("-");
            const workspaceId = Number(parts[0]);
            const folderId = Number(parts[1]);

            const workspace = workspaces.find((w) => w.id === workspaceId);
            if (workspace) {
                const folder = workspace.folders.find((f) => f.id === folderId);
                if (folder) {
                    setActiveFolder(folder);
                    setActiveWorkspace(null);
                }
            }
        } else if (id.startsWith("workspace-")) {
            const workspaceId = Number(id.replace("workspace-", ""));
            const workspace = workspaces.find((w) => w.id === workspaceId);
            if (workspace) {
                setActiveWorkspace(workspace);
                setActiveFolder(null);
            }
        } else if (id.startsWith("folder-")) {
            const folderId = Number(id.replace("folder-", ""));
            const folder = folders.find((f) => f.id === folderId);
            if (folder) {
                setActiveFolder(folder);
                setActiveWorkspace(null);
            }
        }

        // Hide selection highlight during drag to avoid flashing
        dispatch(folderSlice.actions.setIsReorderingFolder(true));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over) {
            const activeData = active.data.current as LeftColumnCollision;
            const overData = over.data.current as LeftColumnCollision;

            // Case 1: Dragging workspace over workspace (reorder workspaces)
            if (
                activeData?.type === CollisionType.WORKSPACE &&
                overData?.type === CollisionType.WORKSPACE
            ) {
                if (active.id !== over.id) {
                    reorderWorkspaces({
                        fromIndex: activeData.object.ordering,
                        toIndex: overData.object.ordering,
                    });
                }
            }
            // Case 2: Dragging root folder over workspace (add folder to workspace)
            else if (
                activeData?.type === CollisionType.ROOT_FOLDER &&
                overData?.type === CollisionType.WORKSPACE
            ) {
                const folderId = activeData?.object.id as number;
                const workspaceId = overData?.object.id as number;
                await moveFolderToWorkspace({
                    workspaceId,
                    folderId,
                });
            }
            // Case 2a: Dragging workspace folder over different workspace (move to that workspace)
            else if (
                activeData?.type === CollisionType.WORKSPACE_NESTED_FOLDER &&
                overData?.type === CollisionType.WORKSPACE
            ) {
                // Parse workspace-folder-{workspaceId}-{folderId}
                const sourceWorkspaceId = activeData?.object.parentWorkspace?.id as number;
                const folderId = activeData?.object.id as number;
                const targetWorkspaceId = overData?.object.id as number;

                // Only move if dropping on a different workspace
                if (sourceWorkspaceId !== targetWorkspaceId) {
                    // Remove from current workspace and add to target workspace
                    await resetFolderParentWorkspace({ folderId });
                    await moveFolderToWorkspace({
                        workspaceId: targetWorkspaceId,
                        folderId,
                    });
                }
            }
            // Case 3: Dragging workspace folder over root folder (remove from workspace)
            else if (
                activeData?.type === CollisionType.WORKSPACE_NESTED_FOLDER &&
                overData?.type === CollisionType.ROOT_FOLDER
            ) {
                const folderId = activeData?.object.id as number;
                await resetFolderParentWorkspace({ folderId });
            }
            // Case 4: Dragging root folder over root folder (reorder root-level folders or remove from workspace)
            else if (
                activeData?.type === CollisionType.ROOT_FOLDER &&
                overData?.type === CollisionType.ROOT_FOLDER
            ) {
                const activeFolderId = activeData?.object.id as number;
                const overFolderId = overData?.object.id as number;

                // Check if the active folder is from a workspace
                const containingWorkspace = workspaces.find((workspace) =>
                    workspace.folders.some((folder) => folder.id === activeFolderId)
                );

                if (containingWorkspace) {
                    // Remove folder from workspace first
                    await resetFolderParentWorkspace({
                        folderId: activeFolderId,
                    });
                } else if (active.id !== over.id) {
                    // Both folders are already root-level folders, just reorder them
                    const folderOldIndex = folders.findIndex((f) => f.id === activeFolderId);
                    const folderNewIndex = folders.findIndex((f) => f.id === overFolderId);

                    if (folderOldIndex !== -1 && folderNewIndex !== -1) {
                        reorderFolders({
                            parentWorkspaceId: undefined, // Root level, no workspace
                            parentFolderId: undefined,
                            fromIndex: folderOldIndex,
                            toIndex: folderNewIndex,
                        });
                    }
                }
            }
            // Case 5: Dragging workspace folder over another workspace folder (reorder or move)
            else if (
                activeData?.type === CollisionType.WORKSPACE_NESTED_FOLDER &&
                overData?.type === CollisionType.WORKSPACE_NESTED_FOLDER
            ) {
                if (active.id !== over.id) {
                    const activeWorkspaceId = activeData?.object.parentWorkspace?.id as number;
                    const activeFolderId = activeData?.object.id as number;
                    const overWorkspaceId = overData?.object.parentWorkspace?.id as number;
                    const overFolderId = overData?.object.id as number;

                    if (activeWorkspaceId === overWorkspaceId) {
                        // Same workspace - reorder folders within workspace
                        const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
                        if (workspace) {
                            // Find the actual indices within the workspace's folder array
                            const folderOldIndex = workspace.folders.findIndex(
                                (f) => f.id === activeFolderId
                            );
                            const folderNewIndex = workspace.folders.findIndex(
                                (f) => f.id === overFolderId
                            );

                            if (folderOldIndex !== -1 && folderNewIndex !== -1) {
                                await reorderFolders({
                                    parentWorkspaceId: activeWorkspaceId,
                                    parentFolderId: undefined,
                                    fromIndex: folderOldIndex,
                                    toIndex: folderNewIndex,
                                });
                            }
                        }
                    } else {
                        // Different workspaces - move folder to other workspace
                        await moveFolderToWorkspace({
                            workspaceId: overWorkspaceId,
                            folderId: activeFolderId,
                        });
                    }
                }
            } else if (
                activeData?.type === CollisionType.WORKSPACE_NESTED_FOLDER &&
                overData?.type === CollisionType.ROOT_FOLDERS_AREA
            ) {
                const folderId = activeData?.object.id as number;
                await resetFolderParentWorkspace({ folderId });
            }

            // Clear active dragging state
            setActiveWorkspace(null);
            setActiveFolder(null);

            // Restore selection highlight after drag
            dispatch(folderSlice.actions.setIsReorderingFolder(false));
        }
    };

    const handleRename = (folder: ScriptsFolderResponse, newName: string) => {
        updateFolder({
            id: folder.id,
            ordering: folder.ordering,
            createdAt: folder.createdAt!,
            createdAtHk: folder.createdAtHk!,
            name: newName,
        });
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

    const handleCreateWorkspace = async () => {
        if (newWorkspaceName.trim()) {
            await createWorkspace({ name: newWorkspaceName.trim() });
            setNewWorkspaceName("");
            setIsCreateWorkspaceDialogOpen(false);
        }
    };

    const handleCreateSubfolder = async (parentId: number, subfolderName: string) => {
        await createSubfolder({ parentFolderId: parentId, name: subfolderName });
    };

    const handleRenameWorkspace = async (workspace: any, newName: string) => {
        await updateWorkspace({ ...workspace, name: newName });
    };

    const handleDeleteWorkspace = async (id: number) => {
        await deleteWorkspace(id);
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

    const getWorkspaceDroppableId = (workspace: WorkspaceResponse) => {
        return `workspace-${workspace.id}`;
    };
    const getWorkspaceSortableId = (workspace: WorkspaceResponse) => {
        return `workspace-${workspace.id}`;
    };

    return (
        <div className="flex flex-col h-full dark:text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 p-4">
                    <FolderCode />
                    <div className="font-medium">Workspaces</div>
                </div>
                <div className="flex items-center gap-2 mr-4">
                    {/* <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                        onClick={() => setIsCreateDialogOpen(true)}
                        title="Create new folder"
                    >
                        <Plus className="w-4 h-4" />
                        <FolderCode className="w-4 h-4" />
                    </Button> */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                        onClick={() => setIsCreateWorkspaceDialogOpen(true)}
                        title="Create new workspace"
                    >
                        <Plus className="w-4 h-4" />
                        Workspace
                    </Button>
                </div>
            </div>
            <div className="h-px bg-gray-400 dark:bg-neutral-600" />
            <div className="space-y-1 p-4 overflow-y-auto flex-1">
                {(isLoading || isLoadingWorkspaces) && <div>Loading...</div>}

                {!isLoading &&
                    !isLoadingWorkspaces &&
                    (workspaces.length > 0 || folders.length > 0) && (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={customFolderWorkspaceDetection}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-1">
                                {/* Separate SortableContext for Workspaces */}
                                <SortableContext
                                    items={workspaces.map((w) => getWorkspaceSortableId(w))}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {workspaces.map((workspace) => (
                                        <SortableWorkspace
                                            key={workspace.id}
                                            workspace={workspace}
                                            sortableId={getWorkspaceSortableId(workspace)}
                                            droppableId={getWorkspaceDroppableId(workspace)}
                                            onRename={handleRenameWorkspace}
                                            onDelete={handleDeleteWorkspace}
                                            onFolderClick={handleFolderClick}
                                        />
                                    ))}
                                </SortableContext>

                                {/* Separate SortableContext for Root Folders */}
                                <RootFoldersDroppableArea
                                    folders={folders}
                                    isReordering={isReordering}
                                    selectedFolderId={selectedFolderId}
                                    handleFolderClick={handleFolderClick}
                                    handleRename={handleRename}
                                    handleDelete={handleDelete}
                                    handleCreateSubfolder={handleCreateSubfolder}
                                />
                            </div>

                            <DragOverlay>
                                {activeWorkspace && (
                                    <div className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg">
                                        <SortableWorkspace
                                            workspace={activeWorkspace}
                                            sortableId={""}
                                            droppableId={""}
                                            onRename={() => {}}
                                            onDelete={() => {}}
                                            onFolderClick={() => {}}
                                        />
                                    </div>
                                )}
                                {activeFolder && (
                                    <div className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg">
                                        <SortableFolderItem
                                            folder={{
                                                id: activeFolder.id || 0,
                                                name: activeFolder.name,
                                                ordering: activeFolder.ordering,
                                                createdAt: activeFolder.createdAt,
                                                createdAtHk: activeFolder.createdAtHk,
                                                shellScripts: [],
                                                subfolders: [],
                                                parentFolder: null,
                                                parentWorkspace: null,
                                            }}
                                            sortableId={""}
                                            isSelected={false}
                                            onClick={() => {}}
                                            onRename={() => {}}
                                            onDelete={() => {}}
                                            onCreateSubfolder={async () => {}}
                                        />
                                    </div>
                                )}
                            </DragOverlay>
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

            {/* Create Workspace Dialog */}
            <Dialog
                open={isCreateWorkspaceDialogOpen}
                onOpenChange={setIsCreateWorkspaceDialogOpen}
            >
                <DialogContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Create New Workspace</DialogTitle>
                        <DialogDescription>Enter a name for the new workspace</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="workspace-name">Workspace Name</Label>
                            <Input
                                className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                id="workspace-name"
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newWorkspaceName.trim()) {
                                        handleCreateWorkspace();
                                    }
                                }}
                                placeholder="My Workspace"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateWorkspaceDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const customFolderWorkspaceDetection: CollisionDetection = (args) => {
    const { active } = args;
    const activeId = String(active.id);

    // Use rect intersection for collision detection
    const rectCollisions = rectIntersection(args);

    // Separate sortables from droppables based on ID patterns
    const sortableCollisions = rectCollisions.filter((collision) => {
        const id = String(collision.id);
        // workspace-folder-{workspaceId}-{folderId} or folder-{folderId}
        return (
            id.startsWith("workspace-folder-") ||
            (id.startsWith("folder-") && !id.startsWith("folder-workspace-"))
        );
    });

    const droppableCollisions = rectCollisions.filter((collision) => {
        const id = String(collision.id);
        return id === "root-folders-area" || id.startsWith("workspace-");
    });

    // Get workspace droppables from rect collisions
    const workspaceDroppables = rectCollisions.filter((collision) => {
        const id = String(collision.id);
        return id.startsWith("workspace-");
    });

    // If dragging a workspace folder (workspace-folder-{workspaceId}-{folderId})
    if (activeId.startsWith("workspace-folder-")) {
        // Extract the source workspace ID from the active item
        const parts = activeId.replace("workspace-folder-", "").split("-");
        const sourceWorkspaceId = parts[0];

        // Check if we're hovering over a different workspace (prioritize moving to another workspace)
        const differentWorkspaceCollisions = workspaceDroppables.filter((c) => {
            const targetWorkspaceId = String(c.id).replace("workspace-", "");
            return targetWorkspaceId !== sourceWorkspaceId;
        });
        if (differentWorkspaceCollisions.length > 0) {
            // Prioritize moving to a different workspace
            return differentWorkspaceCollisions;
        }

        // Check if we're colliding with the root folders area
        const rootFoldersAreaCollision = droppableCollisions.find(
            (c) => String(c.id) === "root-folders-area"
        );
        if (rootFoldersAreaCollision) {
            // Prioritize root-folders-area for removing from workspace
            return [rootFoldersAreaCollision];
        }

        // Only then check for sortable collisions in the same workspace (for reordering)
        const sameWorkspaceFolderSortables = sortableCollisions.filter((c) => {
            const id = String(c.id);
            if (id.startsWith("workspace-folder-")) {
                const collisionWorkspaceId = id.replace("workspace-folder-", "").split("-")[0];
                return collisionWorkspaceId === sourceWorkspaceId;
            }
            return false;
        });
        if (sameWorkspaceFolderSortables.length > 0) {
            // Reorder within the same workspace
            return sameWorkspaceFolderSortables;
        }
    }

    // If dragging a root folder (folder-{id})
    if (activeId.startsWith("folder-") && !activeId.startsWith("folder-workspace-")) {
        // Prioritize sortable collisions (reordering within root folders)
        const rootFolderSortables = sortableCollisions.filter((c) =>
            String(c.id).startsWith("folder-")
        );
        if (rootFolderSortables.length > 0) {
            return rootFolderSortables;
        }

        // Then workspace droppables
        if (workspaceDroppables.length > 0) {
            return workspaceDroppables;
        }
    }

    // If dragging a workspace (workspace-{id})
    if (activeId.startsWith("workspace-")) {
        // Only care about other workspaces for reordering
        const workspaceCollisions = droppableCollisions.filter((c) =>
            String(c.id).startsWith("workspace-")
        );
        if (workspaceCollisions.length > 0) {
            return workspaceCollisions;
        }
    }

    // Fallback to all collisions
    return rectCollisions;
};
