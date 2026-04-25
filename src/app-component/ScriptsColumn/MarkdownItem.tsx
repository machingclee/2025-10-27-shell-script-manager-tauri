import "highlight.js/styles/github-dark.css";
import { ShellScriptDTO } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { getSubwindowPaths } from "@/lib/subwindowPaths";
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
import { Trash2, FileText, Edit, Link } from "lucide-react";
import MoveToFolderMenu from "./MoveToFolderMenu";

export default function MarkdownItem({
    script,
    parentFolderId,
    parentFolderPath = "",
}: {
    script: ShellScriptDTO;
    parentFolderId: number;
    parentFolderPath?: string;
    readOnly?: boolean;
}) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();

    const imagesDirRef = useRef<string | null>(null);
    const [isSelected, setIsSelected] = useState(false);

    useEffect(() => {
        invoke<string>("get_images_dir").then((dir) => {
            imagesDirRef.current = dir;
        });
    }, []);

    const handleViewClick = async () => {
        try {
            if (!script.id) {
                console.error("Script ID is undefined. Cannot open markdown window.");
                return;
            }

            const windowLabel = `markdown-${script.id}`;

            const existing = await WebviewWindow.getByLabel(windowLabel);
            if (existing) {
                await existing.setFocus();
                return;
            }

            const url = getSubwindowPaths.markdown(script.id, false);

            const webview = new WebviewWindow(windowLabel, {
                url,
                title: script.name,
                width: 1000,
                height: 700,
                minWidth: 800,
                minHeight: 600,
                skipTaskbar: false,
                alwaysOnTop: false,
                focus: true,
                devtools: true,
                decorations: false,
                hiddenTitle: true,
                transparent: true,
            });

            webview.once("tauri://error", (e) => {
                console.error("Error creating markdown window:", e);
            });
        } catch (error) {
            console.error("Failed to create webview window:", error);
        }
    };

    const handleEditClick = async () => {
        try {
            if (!script.id) {
                console.error("Script ID is undefined. Cannot open markdown window.");
                return;
            }

            const windowLabel = `markdown-${script.id}`;

            // If the window is already open, just bring it to the front.
            const existing = await WebviewWindow.getByLabel(windowLabel);
            if (existing) {
                await existing.setFocus();
                return;
            }

            const url = getSubwindowPaths.markdown(script.id, true);

            const webview = new WebviewWindow(windowLabel, {
                url,
                title: `Edit: ${script.name}`,
                width: 1000,
                height: 700,
                minWidth: 800,
                minHeight: 600,
                skipTaskbar: false,
                alwaysOnTop: false,
                focus: true,
                devtools: true,
                decorations: false,
                hiddenTitle: true,
                transparent: true,
            });

            webview.once("tauri://error", (e) => {
                console.error("Error creating markdown window:", e);
            });
        } catch (error) {
            console.error("Failed to create webview window:", error);
        }
    };

    const handleDelete = async () => {
        setIsDeleteOpen(true);
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
                        className={`rounded-md border transition-colors cursor-pointer pt-4 ${
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
                            </div>
                        </div>
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
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="dark:bg-neutral-800 dark:border-neutral-700">
                    <ContextMenuItem
                        onClick={handleEditClick}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </ContextMenuItem>

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
