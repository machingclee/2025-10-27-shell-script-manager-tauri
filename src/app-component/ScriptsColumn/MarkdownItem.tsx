import "highlight.js/styles/github-dark.css";
import React from "react";
import { ShellScriptDTO } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, FileText, Link, ExternalLink, Pencil } from "lucide-react";
import MoveToFolderMenu from "./MoveToFolderMenu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MarkdownItem({
    script,
    parentFolderId,
    parentFolderPath = "",
    liteVersionDisplay,
    historyVersion = false,
}: {
    script: ShellScriptDTO;
    parentFolderId: number;
    parentFolderPath?: string;
    readOnly?: boolean;
    liteVersionDisplay?: React.ReactNode;
    historyVersion?: boolean;
}) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [newName, setNewName] = useState(script.name);
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();
    const [updateMarkdownScript] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const imagesDirRef = useRef<string | null>(null);
    const [isSelected, setIsSelected] = useState(false);

    useEffect(() => {
        invoke<string>("get_images_dir").then((dir) => {
            imagesDirRef.current = dir;
        });
    }, []);

    const handleViewClick = async () => {
        if (!script.id) return;
        await emit("open-markdown-reference", { scriptId: script.id, scriptName: script.name });
    };

    const handleDelete = async () => {
        setIsDeleteOpen(true);
    };

    const handleRename = async () => {
        if (!newName.trim() || !script.id) return;
        await updateMarkdownScript({ ...script, name: newName.trim() });
        setIsRenameOpen(false);
    };

    const confirmDelete = async () => {
        await deleteScript({ id: script.id!, folderId: parentFolderId });
        setIsDeleteOpen(false);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className={`rounded-md border transition-colors cursor-pointer ${historyVersion ? "" : "pt-4"} ${
                            isSelected
                                ? "bg-gray-200 border-gray-400 dark:bg-[rgba(0,0,0,0.2)] dark:border-neutral-500"
                                : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] dark:border-neutral-600 dark:hover:bg-[rgba(255,255,255,0.2)]"
                        }`}
                        onMouseDown={() => setIsSelected(true)}
                        onMouseUp={() => setIsSelected(false)}
                        onMouseLeave={() => setIsSelected(false)}
                        onDoubleClick={handleViewClick}
                    >
                        {parentFolderPath && (
                            <div className="px-3 pt-2 text-xs text-gray-600 dark:text-[rgba(255,255,255,0.23)]">
                                {parentFolderPath}
                            </div>
                        )}
                        <div className="px-3 py-2 ">
                            <div className="font-bold text-lg mb-2 select-none text-gray-900 dark:text-neutral-300 flex items-center gap-2">
                                <FileText className="w-7 h-7 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                                {script.name}
                                {import.meta.env.DEV && (
                                    <span className="text-sm font-normal" style={{ opacity: 0.3 }}>
                                        (id: {script.id})
                                    </span>
                                )}
                            </div>
                            {liteVersionDisplay && liteVersionDisplay}
                        </div>
                        {!historyVersion && (
                            <Box
                                className="markdown-editor-container px-3 pb-2"
                                sx={{
                                    "& div[class*='contentEditable']": {
                                        paddingTop: "0 !important",
                                    },
                                    "& .mdxeditor-root-contenteditable": {
                                        backgroundColor: "rgb(209, 213, 219)",
                                        padding: "0px",
                                        borderRadius: "4px",
                                        border: "1px solid rgba(0, 0, 0, 0.1)",
                                        maxHeight: "6em",
                                        overflow: "hidden",
                                        position: "relative",
                                        "&::after": {
                                            content: '""',
                                            position: "absolute",
                                            bottom: 0,
                                            right: 0,
                                            width: "100%",
                                            height: "1.5em",
                                            background:
                                                "linear-gradient(to bottom, transparent, rgb(209, 213, 219))",
                                            pointerEvents: "none",
                                        },
                                    },
                                    ".dark & .mdxeditor-root-contenteditable": {
                                        backgroundColor: "rgba(0, 0, 0, 0.1) !important",
                                        borderColor: "rgba(255, 255, 255, 0.1) !important",
                                        "&::after": {
                                            background:
                                                "linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1)) !important",
                                        },
                                    },
                                    "& .mdxeditor, & .mdxeditor-root-contenteditable, & .mdxeditor-root-contenteditable *":
                                        {
                                            color: "rgb(212, 212, 212) !important",
                                        },
                                    "& .cm-editor, & .cm-content, & .cm-line": {
                                        color: "inherit !important",
                                    },
                                }}
                            ></Box>
                        )}
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="dark:bg-neutral-800 dark:border-neutral-700">
                    <ContextMenuItem
                        onClick={handleViewClick}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer pr-4"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() => {
                            setNewName(script.name);
                            setIsRenameOpen(true);
                        }}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer pr-4"
                    >
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator className="dark:bg-neutral-700" />
                    <MoveToFolderMenu scriptId={script.id!} currentFolderId={parentFolderId} />

                    <ContextMenuItem
                        onClick={() => navigator.clipboard.writeText(`[item#${script.id}]`)}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer pr-4"
                    >
                        <Link className="w-4 h-4 mr-2" />
                        Copy as Markdown Reference
                    </ContextMenuItem>
                    <ContextMenuSeparator className="dark:bg-neutral-700" />
                    <ContextMenuItem
                        onClick={handleDelete}
                        className="text-red-600 dark:text-red-400 dark:focus:bg-neutral-700 cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                >
                    <DialogHeader>
                        <DialogTitle>Rename Markdown</DialogTitle>
                        <DialogDescription>Enter a new name for "{script.name}".</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="markdown-rename">Name</Label>
                            <Input
                                id="markdown-rename"
                                autoFocus
                                className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newName.trim()) {
                                        e.preventDefault();
                                        handleRename();
                                    }
                                }}
                                placeholder="Markdown name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename} disabled={!newName.trim()}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Markdown?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{script.name}"? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
