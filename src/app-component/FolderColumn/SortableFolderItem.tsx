import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { Pencil, Trash2, FolderPlus, Folder, Plus } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { CollisionType, ScriptsFolderResponse } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";

import clsx from "clsx";
import { AddScriptDialog } from "./Dialog/AddScriptDialog";
import { AddMarkdownDialog } from "./Dialog/AddMarkdownDialog";
import { CreateSubfolderDialog } from "./Dialog/CreateSubfolderDialog";
import { DeleteFolderDialog } from "./Dialog/DeleteFolderDialog";
import { RenameFolderDialog } from "./Dialog/RenameFolderDialog";
import { AIProfilesDialog } from "../AIProfile/Dialog/AIProfilesDialog";

export default React.memo(
    function SortableFolderItem({
        folder,
        isSelected,
        onClick,
        onRename,
        onDelete,
        onCreateSubfolder,
        type = CollisionType.ROOT_FOLDER,
        sortableId,
    }: {
        folder: ScriptsFolderResponse;
        isSelected: boolean;
        onClick: () => void;
        onRename: (newName: string) => void;
        onDelete: (id: number) => void;
        onCreateSubfolder: (parentId: number, subfolderName: string) => Promise<void>;
        type?: CollisionType;
        sortableId: string;
    }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
            setActivatorNodeRef,
        } = useSortable({
            id: sortableId,
            data: {
                type: type,
                object: folder,
            },
        });
        const isReordering = useAppSelector((s) => s.folder.isReorderingFolder);
        const [createScript] = scriptApi.endpoints.createScript.useMutation();
        const [createMarkdownScript] = scriptApi.endpoints.createMarkdownScript.useMutation();
        const [isRenameOpen, setIsRenameOpen] = useState(false);
        const [isDeleteOpen, setIsDeleteOpen] = useState(false);
        const [isCreateSubfolderOpen, setIsCreateSubfolderOpen] = useState(false);
        const [isAddScriptOpen, setIsAddScriptOpen] = useState(false);
        const [isAddMarkdownOpen, setIsAddMarkdownOpen] = useState(false);
        const [newName, setNewName] = useState(folder.name);
        const [subfolderName, setSubfolderName] = useState("");
        const [scriptName, setScriptName] = useState("");
        const [scriptCommand, setScriptCommand] = useState("");
        const [markdownName, setMarkdownName] = useState("");
        const [markdownContent, setMarkdownContent] = useState("");

        const style: React.CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition: transition,
            opacity: isDragging ? 0 : 1,
            width: "100%",
            height: "auto",
            minHeight: "fit-content",
            touchAction: "none",
        };

        const handleRename = () => {
            onRename(newName);
            setIsRenameOpen(false);
        };

        const handleDelete = () => {
            onDelete(folder.id);
            setIsDeleteOpen(false);
        };

        const handleCreateSubfolder = () => {
            if (subfolderName.trim()) {
                onCreateSubfolder(folder.id, subfolderName);
                setSubfolderName("");
                setIsCreateSubfolderOpen(false);
            }
        };

        const handleAddScript = async () => {
            if (scriptName.trim() && scriptCommand.trim()) {
                await createScript({
                    name: scriptName,
                    content: scriptCommand,
                    folderId: folder.id,
                });
                setScriptName("");
                setScriptCommand("");
                setIsAddScriptOpen(false);
            }
        };

        const handleAddMarkdown = async () => {
            if (markdownName.trim() && markdownContent.trim()) {
                await createMarkdownScript({
                    name: markdownName,
                    content: markdownContent,
                    folderId: folder.id,
                });
                setMarkdownName("");
                setMarkdownContent("");
                setIsAddMarkdownOpen(false);
            }
        };

        return (
            <>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...attributes}
                    className="w-full flex-shrink-0"
                    onClick={onClick}
                >
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div
                                className={clsx({
                                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full flex-shrink-0": true,
                                    "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-700 dark:active:bg-neutral-600": true,
                                    "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-neutral-500 dark:hover:bg-neutral-600 dark:active:bg-neutral-700":
                                        isSelected,
                                    "bg-transparent": isReordering,
                                    "hover:bg-transparent": isReordering,
                                    "active:bg-transparent": isReordering,
                                    "dark:hover:bg-transparent": isReordering,
                                    "dark:active:bg-transparent": isReordering,
                                })}
                            >
                                <div
                                    ref={setActivatorNodeRef}
                                    {...listeners}
                                    className={cn(
                                        "cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-gray-200 flex-shrink-0 dark:hover:bg-neutral-600",
                                        isSelected && "hover:bg-gray-800 dark:hover:bg-neutral-700"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                <Folder className="w-5 h-5 flex-shrink-0" fill="currentColor" />
                                <div className="flex-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                                    {folder.name}
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:border-neutral-700">
                            <ContextMenuItem
                                className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                                onClick={() => {
                                    setScriptName("");
                                    setScriptCommand("");
                                    setIsAddScriptOpen(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Script
                            </ContextMenuItem>

                            <ContextMenuItem
                                className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                                onClick={() => {
                                    setMarkdownName("");
                                    setMarkdownContent("");
                                    setIsAddMarkdownOpen(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Markdown
                            </ContextMenuItem>

                            <ContextMenuItem
                                className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                                onClick={() => {
                                    setSubfolderName("");
                                    setIsCreateSubfolderOpen(true);
                                    onClick();
                                }}
                            >
                                <FolderPlus className="w-4 h-4 mr-2" />
                                Create Subfolder
                            </ContextMenuItem>
                            <ContextMenuItem
                                className="dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                                onClick={() => {
                                    setNewName(folder.name);
                                    setIsRenameOpen(true);
                                }}
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Rename
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => setIsDeleteOpen(true)}
                                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </div>

                {/* Rename Dialog */}
                <RenameFolderDialog
                    isRenameOpen={isRenameOpen}
                    setIsRenameOpen={setIsRenameOpen}
                    folder={folder}
                    newName={newName}
                    setNewName={setNewName}
                    handleRename={handleRename}
                />

                {/* Delete Confirmation Dialog */}
                <DeleteFolderDialog
                    isDeleteOpen={isDeleteOpen}
                    setIsDeleteOpen={setIsDeleteOpen}
                    folder={folder}
                    handleDelete={handleDelete}
                />

                {/* Create Subfolder Dialog */}
                <CreateSubfolderDialog
                    isCreateSubfolderOpen={isCreateSubfolderOpen}
                    setIsCreateSubfolderOpen={setIsCreateSubfolderOpen}
                    folder={folder}
                    subfolderName={subfolderName}
                    setSubfolderName={setSubfolderName}
                    handleCreateSubfolder={handleCreateSubfolder}
                />

                {/* Add Script Dialog */}
                <AddScriptDialog
                    isAddScriptOpen={isAddScriptOpen}
                    setIsAddScriptOpen={setIsAddScriptOpen}
                    folder={folder}
                    scriptName={scriptName}
                    setScriptName={setScriptName}
                    scriptCommand={scriptCommand}
                    setScriptCommand={setScriptCommand}
                    handleAddScript={handleAddScript}
                />

                {/* Add Markdown Dialog */}
                <AddMarkdownDialog
                    isAddMarkdownOpen={isAddMarkdownOpen}
                    setIsAddMarkdownOpen={setIsAddMarkdownOpen}
                    folder={folder}
                    markdownName={markdownName}
                    setMarkdownName={setMarkdownName}
                    markdownContent={markdownContent}
                    setMarkdownContent={setMarkdownContent}
                    handleAddMarkdown={handleAddMarkdown}
                />
                {/* AiProfilesDialog */}
                <AIProfilesDialog />
            </>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render if these specific props change
        return (
            prevProps.folder.id === nextProps.folder.id &&
            prevProps.folder.name === nextProps.folder.name &&
            prevProps.folder.ordering === nextProps.folder.ordering &&
            prevProps.isSelected === nextProps.isSelected
        );
    }
);
