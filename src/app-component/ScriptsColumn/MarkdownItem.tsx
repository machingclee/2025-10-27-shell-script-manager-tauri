import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeMathjax from "rehype-mathjax";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import "highlight.js/styles/github-dark.css";
import { ScriptsFolderResponse, ShellScriptDTO } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { workspaceApi } from "@/store/api/workspaceApi";
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
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
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
import { Trash2, FileText, Edit, FolderInput, Folder } from "lucide-react";

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
    const [moveScriptIntoFolder] = scriptApi.endpoints.moveScriptIntoFolder.useMutation();
    const { data: workspaces = [] } = workspaceApi.endpoints.getAllWorkspaces.useQuery(undefined);

    const containsFolder = (folder: ScriptsFolderResponse, targetId: number): boolean => {
        if (folder.id === targetId) return true;
        return folder.subfolders.some((sub) => containsFolder(sub, targetId));
    };

    const renderFolderItem = (folder: ScriptsFolderResponse, rootFolderId: number) => {
        const isCurrent = containsFolder(folder, parentFolderId);
        const disabledClass = "opacity-40 cursor-default dark:text-neutral-500";
        const enabledClass = "cursor-pointer dark:hover:bg-neutral-700 dark:text-neutral-200";

        if (folder.subfolders.length > 0) {
            return (
                <ContextMenuSub key={folder.id}>
                    <ContextMenuSubTrigger className={isCurrent ? disabledClass : enabledClass}>
                        <Folder className="w-4 h-4 mr-2" />
                        {folder.name}
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                        <ContextMenuItem
                            disabled={isCurrent}
                            className={isCurrent ? disabledClass : enabledClass}
                            onClick={() =>
                                !isCurrent &&
                                moveScriptIntoFolder({
                                    scriptId: script.id!,
                                    folderId: folder.id,
                                    rootFolderId,
                                })
                            }
                        >
                            Move here
                        </ContextMenuItem>
                        <ContextMenuSeparator className="dark:bg-neutral-700" />
                        {folder.subfolders.map((sub) => renderFolderItem(sub, rootFolderId))}
                    </ContextMenuSubContent>
                </ContextMenuSub>
            );
        }

        return (
            <ContextMenuItem
                key={folder.id}
                disabled={isCurrent}
                className={isCurrent ? disabledClass : enabledClass}
                onClick={() =>
                    !isCurrent &&
                    moveScriptIntoFolder({
                        scriptId: script.id!,
                        folderId: folder.id,
                        rootFolderId,
                    })
                }
            >
                <Folder className="w-4 h-4 mr-2" />
                {folder.name}
            </ContextMenuItem>
        );
    };

    const imagesDirRef = useRef<string | null>(null);
    const [isSelected, setIsSelected] = useState(false);

    useEffect(() => {
        invoke<string>("get_images_dir").then((dir) => {
            imagesDirRef.current = dir;
        });
    }, []);

    const handleEditClick = async () => {
        try {
            if (!script.id) {
                console.error("Script ID is undefined. Cannot open markdown window.");
                return;
            }
            const url = getSubwindowPaths.markdown(script.id, true);

            const webview = new WebviewWindow(`markdown-${script.id}`, {
                url,
                title: `Edit: ${script.name}`,
                width: 1000,
                height: 700,
                minWidth: 800,
                minHeight: 600,
                skipTaskbar: false,
                alwaysOnTop: false,
                focus: true,
                devtools: true, // Enable dev tools to see console errors
            });

            webview.once("tauri://error", (e) => {
                console.error("Error creating markdown window:", e);
            });
        } catch (error) {
            console.error("Failed to create webview window:", error);
        }
    };

    const handleViewAsHtml = async () => {
        try {
            const imagesDir = imagesDirRef.current ?? "";

            // Replace images/filename?width=N with the absolute path so the browser can open them
            const resolvedMarkdown = (script.command || "").replace(
                /!\[([^\]]*)\]\(images\/([^)]+)\)/g,
                (_match, altText, rest) => {
                    const filename = rest.replace(/\?width=\d+$/, "");
                    const widthMatch = rest.match(/\?width=(\d+)/);
                    const widthAttr = widthMatch ? ` width="${widthMatch[1]}"` : "";
                    const src = `file://${imagesDir}/${filename}`;
                    return `<a href="${src}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="${altText}"${widthAttr} style="max-width:100%" /></a>`;
                }
            );

            const file = await unified()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkMath)
                .use(remarkRehype, { allowDangerousHtml: true })
                .use(rehypeHighlight)
                .use(rehypeMathjax)
                .use(rehypeStringify, { allowDangerousHtml: true })
                .process(resolvedMarkdown);

            const rawBodyHtml = String(file);
            // Make all links pointing to image files open in a new tab
            const bodyHtml = rawBodyHtml.replace(
                /<a\s+(href="[^"]+\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|avif)(\?[^"]*)?")(\s[^>]*)?>([^<]*)<\/a>/gi,
                '<a $1 target="_blank" rel="noopener noreferrer">$5</a>'
            );
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${script.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; background: #ffffff; color: #1f2328; line-height: 1.7; }
    h1 { font-size: 2em; font-weight: 700; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; margin-top: 0.67em; margin-bottom: 0.67em; }
    h2 { font-size: 1.75em; font-weight: 700; border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; margin-top: 0.75em; margin-bottom: 0.5em; }
    h3 { font-size: 1.5em; font-weight: 600; margin-top: 0.75em; margin-bottom: 0.5em; }
    h4 { font-size: 1.25em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    h5 { font-size: 1.1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    h6 { font-size: 1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    p { margin-top: 0.5em; margin-bottom: 0.5em; }
    a { color: #0969da; text-decoration: underline; }
    ul, ol { padding-left: 2em; margin-top: 0.5em; margin-bottom: 0.5em; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { display: list-item; padding-left: 0.5em; line-height: 1.4; }
    ul.contains-task-list { padding-left: 2em; }
    li.task-list-item { list-style: none; padding-left: 0; }
    input[type="checkbox"] {
      appearance: none; -webkit-appearance: none;
      width: 16px; height: 16px;
      margin-top: -2px; margin-right: -1.25em; margin-left: 0;
      cursor: pointer;
      border: 2px solid #999; border-radius: 3px;
      background-color: transparent;
      position: relative; left: -2em;
      display: inline-flex; align-items: center; justify-content: center;
      vertical-align: middle; flex-shrink: 0;
    }
    input[type="checkbox"]:checked { background-color: rgb(59,130,246); border-color: rgb(59,130,246); }
    input[type="checkbox"]:checked::after { content: "✓"; color: white; font-size: 12px; font-weight: bold; line-height: 1; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); }
    code:not(pre code) { background: #f6f8fa; border: 1px solid #d0d7de; padding: 2px 6px; border-radius: 4px; font-size: 0.95em; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow: auto; margin-top: 0.5em; margin-bottom: 0.5em; }
    pre code.hljs { background: transparent; padding: 0; font-size: 0.9em; }
    blockquote { border-left: 4px solid #d0d7de; margin-left: 0; padding-left: 1em; color: #57606a; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5em; margin-bottom: 0.5em; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; font-weight: 600; }
    mjx-container { display: inline-block; vertical-align: middle; }
    mjx-container[display="true"] { display: block; text-align: center; margin: 1em 0; }
  </style>
</head>
<body>
  <h1 style="margin-top:0">${script.name}</h1>
  ${bodyHtml}
</body>
</html>`;
            await invoke("write_and_open_html", { html });
        } catch (error) {
            console.error("Failed to open as HTML:", error);
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
                        onDoubleClick={handleViewAsHtml}
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
                <ContextMenuContent className="w-48 dark:bg-neutral-800 dark:border-neutral-700">
                    <ContextMenuItem
                        onClick={handleEditClick}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </ContextMenuItem>
                    <ContextMenuSub>
                        <ContextMenuSubTrigger className="cursor-pointer dark:hover:bg-neutral-700 dark:focus:bg-neutral-700 dark:text-neutral-200">
                            <FolderInput className="w-4 h-4 mr-2" />
                            Move to Folder
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                            {workspaces.map((workspace) => (
                                <ContextMenuSub key={workspace.id}>
                                    <ContextMenuSubTrigger className="cursor-pointer dark:hover:bg-neutral-700 dark:text-neutral-200">
                                        {workspace.name}
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                                        {workspace.folders.map((folder) =>
                                            renderFolderItem(folder, folder.id)
                                        )}
                                        {workspace.folders.length === 0 && (
                                            <ContextMenuItem
                                                disabled
                                                className="dark:text-neutral-500"
                                            >
                                                No folders
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                            ))}
                        </ContextMenuSubContent>
                    </ContextMenuSub>
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
