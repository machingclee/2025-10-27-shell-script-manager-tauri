import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    linkPlugin,
    linkDialogPlugin,
    imagePlugin,
    tablePlugin,
    codeBlockPlugin,
    codeMirrorPlugin,
    diffSourcePlugin,
    frontmatterPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { ShellScriptDTO } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { useState, useEffect } from "react";
import { Box } from "@mui/material";
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Eye } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function MarkdownItem({
    script,
    parentFolderId,
    parentFolderPath = "",
    readOnly = true,
}: {
    script: ShellScriptDTO;
    parentFolderId: number;
    parentFolderPath?: string;
    readOnly?: boolean;
}) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDialogEditMode, setIsDialogEditMode] = useState(false);
    const [editContent, setEditContent] = useState(script.command || "");
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();
    const [deleteScript] = scriptApi.endpoints.deleteScript.useMutation();
    const [markdown, setMarkdown] = useState(script.command || "");

    // Sync markdown state with script.command changes
    useEffect(() => {
        setMarkdown(script.command || "");
    }, [script.command]);

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditContent(script.command || "");
        setIsDialogEditMode(false);
        setIsEditOpen(true);
    };

    const handleEnableEdit = () => {
        setIsDialogEditMode(true);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        await deleteScript({ id: script.id!, folderId: parentFolderId });
        setIsDeleteOpen(false);
    };

    const handleSaveEdit = async () => {
        await updateMarkdown({
            ...script,
            command: editContent,
        });
        setMarkdown(editContent);
        setIsDialogEditMode(false);
    };

    const handleCancelEdit = () => {
        if (isDialogEditMode) {
            // If in edit mode, just switch back to view mode
            setEditContent(script.command || "");
            setIsDialogEditMode(false);
        } else {
            // If in view mode, close the dialog
            setIsEditOpen(false);
        }
    };

    const handleChange = (value: string) => {
        if (!readOnly) {
            setMarkdown(value);
        }
    };

    const handleBlur = async () => {
        // Auto-save on blur (only when not readOnly)
        if (!readOnly && markdown !== script.command) {
            await updateMarkdown({
                ...script,
                command: markdown,
            });
        }
    };

    const plugins = [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
        codeMirrorPlugin({
            codeBlockLanguages: {
                "": "Plain Text",
                text: "Plain Text",
                plaintext: "Plain Text",
                txt: "Plain Text",
                js: "JavaScript",
                javascript: "JavaScript",
                ts: "TypeScript",
                typescript: "TypeScript",
                tsx: "TypeScript (React)",
                jsx: "JavaScript (React)",
                css: "CSS",
                python: "Python",
                py: "Python",
                bash: "Bash",
                sh: "Bash",
                shell: "Bash",
                json: "JSON",
                yaml: "YAML",
                yml: "YAML",
                md: "Markdown",
                markdown: "Markdown",
                html: "HTML",
                xml: "XML",
                sql: "SQL",
                rust: "Rust",
                go: "Go",
                java: "Java",
                c: "C",
                cpp: "C++",
                "c++": "C++",
            },
        }),
        diffSourcePlugin({ viewMode: "rich-text" }),
        frontmatterPlugin(),
    ];

    // Only add interactive plugins when not in readOnly mode
    if (!readOnly) {
        plugins.push(markdownShortcutPlugin(), linkDialogPlugin());
    }

    const editPlugins = [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
        codeMirrorPlugin({
            codeBlockLanguages: {
                "": "Plain Text",
                text: "Plain Text",
                plaintext: "Plain Text",
                txt: "Plain Text",
                js: "JavaScript",
                javascript: "JavaScript",
                ts: "TypeScript",
                typescript: "TypeScript",
                tsx: "TypeScript (React)",
                jsx: "JavaScript (React)",
                css: "CSS",
                python: "Python",
                py: "Python",
                bash: "Bash",
                sh: "Bash",
                shell: "Bash",
                json: "JSON",
                yaml: "YAML",
                yml: "YAML",
                md: "Markdown",
                markdown: "Markdown",
                html: "HTML",
                xml: "XML",
                sql: "SQL",
                rust: "Rust",
                go: "Go",
                java: "Java",
                c: "C",
                cpp: "C++",
                "c++": "C++",
            },
        }),
        diffSourcePlugin({ viewMode: "source", diffMarkdown: "" }),
        frontmatterPlugin(),
        markdownShortcutPlugin(),
        linkDialogPlugin(),
    ];

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className="rounded-md border border-gray-200 dark:border-neutral-600 bg-white dark:bg-[rgba(255,255,255,0.05)]"
                        onDoubleClick={handleEditClick}
                    >
                        {parentFolderPath && (
                            <div className="px-3 pt-2 text-xs text-gray-600 dark:text-[rgba(255,255,255,0.23)]">
                                {parentFolderPath}
                            </div>
                        )}
                        <div className="px-3 py-2">
                            <div className="font-bold text-lg mb-2 select-none text-gray-900 dark:text-neutral-300">
                                {script.name}
                            </div>
                        </div>
                        <Box
                            className="markdown-editor-container px-3 pb-2"
                            onBlur={readOnly ? undefined : handleBlur}
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
                        >
                            <MDXEditor
                                key={script.command}
                                markdown={markdown}
                                onChange={handleChange}
                                readOnly={readOnly}
                                plugins={plugins}
                            />
                        </Box>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48 bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <ContextMenuItem onClick={handleEditClick}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Markdown
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={handleDelete}
                        className="text-red-600 dark:text-red-400"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Markdown
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

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent
                    className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-5xl flex flex-col"
                    style={{ overflow: "visible" }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {isDialogEditMode ? "Edit" : "View"} Markdown - {script.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div
                        className="flex-1"
                        style={{
                            minHeight: "500px",
                            maxHeight: "70vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "visible",
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                minHeight: 0,
                                "& .mdxeditor": {
                                    height: "100vh !important",
                                    display: "flex",
                                    flexDirection: "column",

                                    minHeight: 0,
                                },
                                "& .mdxeditor-toolbar": {
                                    backgroundColor: "rgba(0, 0, 0, 0.05) !important",
                                    flexShrink: 0,
                                    position: "relative",
                                    zIndex: 10,
                                },
                                "& .mdxeditor-toolbar button[role='combobox']": {
                                    overflow: "visible !important",
                                },
                                "& .mdxeditor-toolbar button[role='combobox'] span": {
                                    overflow: "visible !important",
                                },
                                "& .mdxeditor-toolbar [data-radix-popper-content-wrapper]": {
                                    zIndex: 9999,
                                },
                                "& .mdxeditor-root-contenteditable": {
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: "auto !important",
                                },
                                "& .editable.markdown, & .mdxeditor-diff-source-wrapper": {
                                    flex: 1,
                                    marginTop: "10px",
                                    overflowY: "auto !important",
                                    minHeight: 0,
                                    backgroundColor: "rgb(209, 213, 219)",
                                    borderRadius: "4px",
                                    padding: "8px",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                },
                                ".dark & .editable.markdown, .dark & .mdxeditor-diff-source-wrapper":
                                    {
                                        backgroundColor: "rgba(50, 50, 50, 0.8) !important",
                                    },
                                "& .mdxeditor ul": {
                                    listStyleType: "disc !important",
                                    paddingLeft: "1.5em !important",
                                    marginTop: "0.5em !important",
                                    marginBottom: "0.5em !important",
                                },
                                "& .mdxeditor ol": {
                                    listStyleType: "decimal !important",
                                    paddingLeft: "1.5em !important",
                                    marginTop: "0.5em !important",
                                    marginBottom: "0.5em !important",
                                },
                                "& .mdxeditor li": {
                                    display: "list-item !important",
                                },
                                "& .mdxeditor li[role='checkbox']": {
                                    transform: "translateY(-0px)",
                                },
                                "& .mdxeditor li[role='checkbox'] *[data-lexical-text='true']": {
                                    position: "relative",
                                    top: "-5px",
                                    display: "inline-block",
                                },
                                ".dark & .mdxeditor-toolbar": {
                                    backgroundColor: "rgba(0, 0, 0, 0.2) !important",
                                },
                                ".dark & .mdxeditor-toolbar button, .dark & .mdxeditor-toolbar svg, .dark & .mdxeditor-toolbar select, .dark & .mdxeditor-toolbar label":
                                    {
                                        color: "rgb(212, 212, 212) !important",
                                        fill: "rgb(212, 212, 212) !important",
                                    },
                                ".dark & .mdxeditor-toolbar button:hover": {
                                    backgroundColor: "rgba(255, 255, 255, 0.1) !important",
                                },
                                ".dark & .mdxeditor-toolbar select": {
                                    backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                                    borderColor: "rgba(255, 255, 255, 0.2) !important",
                                },
                                ".dark & [role='option']": {
                                    backgroundColor: "rgb(38, 38, 38) !important",
                                    color: "rgb(212, 212, 212) !important",
                                },
                                ".dark & [role='option']:hover": {
                                    backgroundColor: "rgb(55, 55, 55) !important",
                                },
                                ".dark & [role='listbox']": {
                                    backgroundColor: "rgb(38, 38, 38) !important",
                                    borderColor: "rgba(255, 255, 255, 0.2) !important",
                                },
                                ".dark & .mdxeditor-popup-container": {
                                    backgroundColor: "rgb(38, 38, 38) !important",
                                    borderColor: "rgba(255, 255, 255, 0.2) !important",
                                },
                                ".dark & .mdxeditor, .dark & .mdxeditor-root-contenteditable, .dark & .mdxeditor-root-contenteditable *":
                                    {
                                        color: "rgb(212, 212, 212) !important",
                                    },
                                ".dark & h1": {
                                    fontSize: "2em !important",
                                    fontWeight: "700 !important",
                                    marginTop: "0.67em !important",
                                    marginBottom: "0.67em !important",
                                    color: "rgb(255, 255, 255) !important",
                                    borderBottom: "2px solid rgba(255, 255, 255, 0.2) !important",
                                    paddingBottom: "0.3em !important",
                                },
                                ".dark & h2": {
                                    fontSize: "1.75em !important",
                                    fontWeight: "700 !important",
                                    marginTop: "0.75em !important",
                                    marginBottom: "0.5em !important",
                                    color: "rgb(255, 255, 255) !important",
                                    borderBottom: "1px solid rgba(255, 255, 255, 0.15) !important",
                                    paddingBottom: "0.3em !important",
                                },
                                ".dark & h3": {
                                    fontSize: "1.5em !important",
                                    fontWeight: "600 !important",
                                    marginTop: "0.75em !important",
                                    marginBottom: "0.5em !important",
                                    color: "rgb(245, 245, 245) !important",
                                },
                                ".dark & h4": {
                                    fontSize: "1.25em !important",
                                    fontWeight: "600 !important",
                                    marginTop: "0.5em !important",
                                    marginBottom: "0.5em !important",
                                    color: "rgb(245, 245, 245) !important",
                                },
                                ".dark & h5": {
                                    fontSize: "1.1em !important",
                                    fontWeight: "600 !important",
                                    marginTop: "0.5em !important",
                                    marginBottom: "0.5em !important",
                                    color: "rgb(230, 230, 230) !important",
                                },
                                ".dark & h6": {
                                    fontSize: "1em !important",
                                    fontWeight: "600 !important",
                                    marginTop: "0.5em !important",
                                    marginBottom: "0.5em !important",
                                    color: "rgb(220, 220, 220) !important",
                                },
                                ".dark & .cm-editor": {
                                    backgroundColor: "transparent !important",
                                    color: "rgb(212, 212, 212) !important",
                                    border: "none !important",
                                    outline: "none !important",
                                },
                                ".dark & .cm-scroller": {
                                    color: "rgb(212, 212, 212) !important",
                                    border: "none !important",
                                    outline: "none !important",
                                },
                                ".dark & div[class*='codeMirrorWrapper']": {
                                    backgroundColor: "transparent !important",
                                    border: "none !important",
                                    outline: "none !important",
                                },
                                ".dark & div[class*='codeMirrorToolbar']": {
                                    display: "none !important",
                                },
                                ".dark & .cm-content, .dark & .cm-line": {
                                    color: "rgb(212, 212, 212) !important",
                                    fontSize: "16px !important",
                                },
                                ".dark & .cm-gutters": {
                                    backgroundColor: "rgba(0, 0, 0, 0.2) !important",
                                    color: "rgb(156, 163, 175) !important",
                                    borderRight: "none !important",
                                    border: "none !important",
                                },
                                ".dark & .cm-activeLineGutter": {
                                    backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                                },
                                ".dark & .cm-activeLine": {
                                    backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                                },
                                ".dark & .cm-cursor": {
                                    borderLeftColor: "rgb(212, 212, 212) !important",
                                },
                            }}
                        >
                            <MDXEditor
                                key={isDialogEditMode ? "edit" : "view"}
                                markdown={editContent}
                                onChange={setEditContent}
                                readOnly={!isDialogEditMode}
                                plugins={isDialogEditMode ? editPlugins : plugins}
                            />
                        </Box>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            {isDialogEditMode ? "Cancel" : "Close"}
                        </Button>
                        {!isDialogEditMode ? (
                            <Button
                                onClick={handleEnableEdit}
                                className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSaveEdit}
                                className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                            >
                                Save Changes
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
