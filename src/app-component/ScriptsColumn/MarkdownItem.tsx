import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeMathjax from "rehype-mathjax";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
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
import { Trash2, Eye, FileText, Edit, Globe } from "lucide-react";

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

    const [isSelected, setIsSelected] = useState(false);
    const imagesDirRef = useRef<string | null>(null);

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
            const url = getSubwindowPaths.markdown(script.id, false);

            const webview = new WebviewWindow(`markdown-${script.id}`, {
                url,
                title: `View: ${script.name}`,
                width: 1000,
                height: 700,
                minWidth: 800,
                minHeight: 600,
                skipTaskbar: false,
                alwaysOnTop: false,
                focus: true,
            });

            webview.once("tauri://error", function (e) {
                console.error("Error creating markdown window:", e);
            });
        } catch (error) {
            console.error("Error opening markdown window:", error);
        }
    };

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
                    return `<img src="file://${imagesDir}/${filename}" alt="${altText}"${widthAttr} style="max-width:100%" />`;
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

            const bodyHtml = String(file);
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${script.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; background: #ffffff; color: #1f2328; line-height: 1.7; }
    h1, h2, h3, h4, h5, h6 { color: #1f2328; margin-top: 1.5em; }
    h1 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; }
    a { color: #0969da; }
    code:not(pre code) { background: #f6f8fa; border: 1px solid #d0d7de; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow: auto; }
    blockquote { border-left: 4px solid #d0d7de; margin-left: 0; padding-left: 1em; color: #57606a; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; }
    input[type="checkbox"] { margin-right: 6px; }
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
                <ContextMenuContent className="w-48 dark:bg-neutral-800 dark:border-neutral-700">
                    <ContextMenuItem
                        onClick={handleViewClick}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={handleViewAsHtml}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer"
                    >
                        <Globe className="w-4 h-4 mr-2" />
                        View as HTML
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={handleEditClick}
                        className="dark:text-neutral-200 dark:focus:bg-neutral-700 cursor-pointer"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
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
