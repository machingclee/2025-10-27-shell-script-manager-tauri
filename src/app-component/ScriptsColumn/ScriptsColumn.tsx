import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ScrollText, FoldVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    pointerWithin,
    rectIntersection,
} from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { scriptApi } from "@/store/api/scriptApi";
import { folderApi } from "@/store/api/folderApi";
import { ShellScriptDTO, ScriptsFolderResponse, ShellScriptResponse } from "@/types/dto";
import rootFolderSlice from "@/store/slices/rootFolderSlice";
import SortableSubfoldersContext from "./SortableSubfoldersContext";
import SortableScriptsContext from "./SortableScriptsContext";
import GenericScriptItem from "./GenericScriptItem";
import CollapsableFolder from "./SortatbleCollapsableFolder";

// Helper function to find script recursively in folders and subfolders
const findScriptRecursive = (
    folderResponse: ScriptsFolderResponse,
    scriptId: number
): { script: ShellScriptDTO; parentFolderId: number } | null => {
    // Search in current folder's scripts
    const script = folderResponse.shellScripts.find((s) => s.id === scriptId);
    if (script) return { script, parentFolderId: folderResponse.id };

    // Search in subfolders
    for (const subfolder of folderResponse.subfolders) {
        const found = findScriptRecursive(subfolder, scriptId);
        if (found) return found;
    }

    return null;
};

// Helper function to find which folder contains a specific script
const findFolderContainingScript = (
    folderResponse: ScriptsFolderResponse,
    scriptId: number
): ScriptsFolderResponse | null => {
    // Check if script is in current folder
    if (folderResponse.shellScripts.some((s) => s.id === scriptId)) {
        return folderResponse;
    }

    // Search in subfolders
    for (const subfolder of folderResponse.subfolders) {
        const found = findFolderContainingScript(subfolder, scriptId);
        if (found) return found;
    }

    return null;
};

export default function ScriptsColumn() {
    const selectedRootFolderId = useAppSelector((s) => s.folder.selectedRootFolderId);
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { data: selectedFolder } = folderApi.endpoints.getAllFolders.useQueryState(undefined, {
        selectFromResult: (result) => ({
            data: result.data?.find((f) => f.id === selectedRootFolderId),
        }),
    });
    const { data: folderResponse, isLoading } = folderApi.endpoints.getFolderById.useQuery(
        selectedRootFolderId ?? 0,
        {
            skip: !backendPort || !selectedRootFolderId,
        }
    );
    const [reorderScripts] = scriptApi.endpoints.reorderScripts.useMutation();
    const [reorderSubfolders] = folderApi.endpoints.reorderFolders.useMutation();
    const [moveScriptIntoFolder] = scriptApi.endpoints.moveScriptIntoFolder.useMutation();
    const [activeId, setActiveId] = useState<number | null>(null);
    const [activeType, setActiveType] = useState<"script" | "folder" | null>(null);
    const [closeAllFoldersTrigger, setCloseAllFoldersTrigger] = useState(0);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Custom collision detection that prioritizes droppable zones when dragging scripts
    const customCollisionDetection: CollisionDetection = (args) => {
        const { active } = args;
        const isDraggingScript = active?.data.current?.type === "script";

        // When dragging a script, prioritize droppable zones (folders and root folder area)
        if (isDraggingScript) {
            const pointerCollisions = pointerWithin(args);
            const rectCollisions = rectIntersection(args);

            if (pointerCollisions.length > 0 || rectCollisions.length > 0) {
                // Check if we're over any script items (for reordering)
                // Exclude folders from script collisions
                const scriptCollisions = pointerCollisions.filter(({ id, data }) => {
                    const isDroppable = String(id).includes("droppable");
                    const isFolder = data?.current?.type === "folder";
                    return !isDroppable && !isFolder;
                });

                // Check if we're over any subfolder droppables (use both pointer and rect)
                const folderDroppableCollision =
                    pointerCollisions.find(({ id }) =>
                        String(id).startsWith("folder-droppable-")
                    ) ||
                    rectCollisions.find(({ id }) => String(id).startsWith("folder-droppable-"));

                // If we have script collisions, always prioritize them for sorting
                if (scriptCollisions.length > 0) {
                    // Collect all droppables to notify them of hover state
                    const droppablesToInclude = [];

                    // Check for root droppable
                    const rootDroppableCollision =
                        pointerCollisions.find(({ id }) =>
                            String(id).startsWith("root-scripts-droppable-")
                        ) ||
                        rectCollisions.find(({ id }) =>
                            String(id).startsWith("root-scripts-droppable-")
                        );

                    if (rootDroppableCollision) {
                        droppablesToInclude.push(rootDroppableCollision);
                    }

                    if (folderDroppableCollision) {
                        droppablesToInclude.push(folderDroppableCollision);
                    }

                    // Script collisions first for sorting, then droppables for highlight
                    return [...scriptCollisions, ...droppablesToInclude];
                }

                // Prioritize folder droppables when moving to a different folder
                if (folderDroppableCollision) {
                    return [folderDroppableCollision];
                }

                // Check for root-scripts-droppable using both pointer and rect intersection
                const rootDroppableCollision =
                    pointerCollisions.find(({ id }) =>
                        String(id).startsWith("root-scripts-droppable-")
                    ) ||
                    rectCollisions.find(({ id }) =>
                        String(id).startsWith("root-scripts-droppable-")
                    );

                // If only root droppable collision (empty area)
                if (rootDroppableCollision) {
                    return [rootDroppableCollision];
                }
            }
        }

        // For folders or when no droppable collision, use rect intersection for sorting
        return rectIntersection(args);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as number);
        setActiveType(active.data.current?.type || null);

        // Only set reordering state when dragging a folder, not a script
        if (active.data.current?.type === "folder") {
            dispatch(rootFolderSlice.actions.setIsReorderingFolder(true));
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || !folderResponse || !selectedRootFolderId) {
            dispatch(rootFolderSlice.actions.setIsReorderingFolder(false));
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        // Case 1: Script dropped on folder (or root folder area) - move script to folder
        if (activeData?.type === "script" && overData?.type === "folder") {
            const script = activeData.script;
            const targetFolderId = overData.folderId;

            console.log("Moving script to folder:", script.id, "->", targetFolderId);

            moveScriptIntoFolder({
                scriptId: script.id,
                folderId: targetFolderId,
                rootFolderId: selectedRootFolderId,
            })
                .unwrap()
                .catch((error) => {
                    console.error("Failed to move script:", error);
                });
        }
        // Case 2: Reordering scripts
        else if (activeData?.type === "script" && overData?.type === "script") {
            const activeScript = activeData.script as ShellScriptResponse;
            const overScript = overData.script as ShellScriptResponse;

            // Find which folders contain the scripts
            const activeFolder = findFolderContainingScript(folderResponse, activeScript.id!);
            const overFolder = findFolderContainingScript(folderResponse, overScript.id!);

            if (!activeFolder || !overFolder) {
                console.error("Could not find folders containing scripts");
                return;
            }

            // Case 2a: Scripts in the same folder - just reorder
            if (activeFolder.id === overFolder.id) {
                const oldIndex = activeFolder.shellScripts.findIndex(
                    (s) => s.id === activeScript.id
                );
                const newIndex = activeFolder.shellScripts.findIndex((s) => s.id === overScript.id);

                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    console.log(
                        `Reordering scripts in folder ${activeFolder.id}: ${oldIndex} -> ${newIndex}`
                    );
                    reorderScripts({
                        folderId: activeFolder.id,
                        fromIndex: oldIndex,
                        toIndex: newIndex,
                        rootFolderId: selectedRootFolderId,
                    })
                        .unwrap()
                        .catch((error) => {
                            console.error("Failed to reorder scripts:", error);
                        });
                }
            }
            // Case 2b: Scripts in different folders - move and reorder
            else {
                const targetIndex = overFolder.shellScripts.findIndex(
                    (s) => s.id === overScript.id
                );

                if (targetIndex !== -1) {
                    console.log(
                        `Moving script ${activeScript.id} from folder ${activeFolder.id} to folder ${overFolder.id} at index ${targetIndex}`
                    );

                    const currentScriptCount = overFolder.shellScripts.length;

                    // Step 1: Move the script to the target folder
                    moveScriptIntoFolder({
                        scriptId: activeScript.id!,
                        folderId: overFolder.id,
                        rootFolderId: selectedRootFolderId,
                    })
                        .unwrap()
                        .then(() => {
                            // Step 2: Reorder the script to the target index
                            // After moving, the script is at the end (currentScriptCount position)
                            const fromIndex = currentScriptCount;
                            if (fromIndex !== targetIndex) {
                                return reorderScripts({
                                    folderId: overFolder.id,
                                    fromIndex: fromIndex,
                                    toIndex: targetIndex,
                                    rootFolderId: selectedRootFolderId,
                                }).unwrap();
                            }
                        })
                        .catch((error) => {
                            console.error("Failed to move and reorder script:", error);
                        });
                }
            }
        }
        // Case 3: Reordering folders
        else if (activeData?.type === "folder" && overData?.type === "folder") {
            const oldIndex = folderResponse.subfolders.findIndex((f) => f.id === active.id);
            const newIndex = folderResponse.subfolders.findIndex((f) => f.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                console.log("Reordering folders");
                reorderSubfolders({
                    parentFolderId: selectedRootFolderId,
                    fromIndex: oldIndex,
                    toIndex: newIndex,
                    rootFolderId: selectedRootFolderId,
                })
                    .unwrap()
                    .catch((error) => {
                        console.error("Failed to reorder folders:", error);
                    });
            }
        }

        dispatch(rootFolderSlice.actions.setIsReorderingFolder(false));
        setActiveId(null);
        setActiveType(null);
    };

    const displayName = () => {
        if (selectedFolder) {
            return (
                <div>
                    Scripts in <span className="font-bold text-[18px]">{selectedFolder.name}</span>
                </div>
            );
        }
        return <Label>Scripts</Label>;
    };

    const handleCloseAllFolders = () => {
        setCloseAllFoldersTrigger((prev) => prev + 1);
    };

    const header = () => {
        return (
            <>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 p-4">
                        <ScrollText />
                        <div className="font-medium">{displayName()}</div>
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                        <Button
                            variant="ghost"
                            className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                            disabled={!selectedRootFolderId}
                            onClick={handleCloseAllFolders}
                            title="Close all folders"
                        >
                            <FoldVertical className="w-4 h-4" /> Close All
                        </Button>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="flex flex-col h-full dark:text-white">
            {header()}
            <div className="h-px bg-gray-400 dark:bg-neutral-600" />
            <div className="space-y-2 p-4 overflow-y-auto flex-1 min-h-[400px] bg-gray-50 dark:bg-neutral-800">
                {isLoading && <div>Loading...</div>}

                <DndContext
                    sensors={sensors}
                    collisionDetection={customCollisionDetection}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {folderResponse && folderResponse.subfolders.length > 0 && (
                        <SortableSubfoldersContext
                            folderResponse={folderResponse}
                            closeAllFoldersTrigger={closeAllFoldersTrigger}
                        />
                    )}

                    {folderResponse && selectedRootFolderId && (
                        <SortableScriptsContext
                            folderResponse={folderResponse}
                            selectedFolderId={selectedRootFolderId}
                        />
                    )}
                    <DragOverlay>
                        {activeId &&
                            activeType === "script" &&
                            folderResponse &&
                            (() => {
                                const scriptInfo = findScriptRecursive(folderResponse, activeId);
                                return scriptInfo ? (
                                    <div className="opacity-80 cursor-grabbing">
                                        <div className="bg-white dark:bg-neutral-800 rounded-md shadow-lg border border-gray-200 dark:border-neutral-700">
                                            <GenericScriptItem
                                                script={scriptInfo.script}
                                                parentFolderId={scriptInfo.parentFolderId}
                                            />
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        {activeId &&
                            activeType === "folder" &&
                            folderResponse &&
                            (() => {
                                const folder = folderResponse.subfolders.find(
                                    (f) => f.id === activeId
                                );
                                return folder ? (
                                    <div className="opacity-80 cursor-grabbing">
                                        <CollapsableFolder
                                            folder={folder}
                                            closeAllFoldersTrigger={closeAllFoldersTrigger}
                                        />
                                    </div>
                                ) : null;
                            })()}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
