import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { ShellScriptDTO } from "@/types/dto";
import { scriptApi } from "@/store/api/scriptApi";
import { useState, useRef, useMemo } from "react";
import { Box, Popover } from "@mui/material";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getSubwindowPaths } from "@/lib/subwindowPaths";
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
import { Button } from "@/components/ui/button";
import { Trash2, Eye, FileText, Edit } from "lucide-react";

const LIGHT_WHITE_BG = "rgba(255, 255, 255, 0.2)";

// List spacing constants for alignment calibration
// These values work together: checkbox uses left: -LIST_GUTTER_WIDTH to position in the gutter
const LIST_GUTTER_WIDTH = "2em"; // Width of the bullet/checkbox column (ul/ol paddingLeft)
const LIST_ITEM_PADDING = "0em"; // Additional spacing after bullet for regular list items
const CHECKBOX_SPACING = "-1.25em"; // Spacing between checkbox and text
const LIST_ITEM_LINE_HEIGHT = "1.2"; // Line height for list items (default is ~1.6)
const LIST_ITEM_MARGIN = "0.3em 0"; // Vertical margin between list items

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
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const [isSelected, setIsSelected] = useState(false);
    const [previewAnchor, setPreviewAnchor] = useState<HTMLElement | null>(null);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

    const latestContentRef = useRef("");

    const handleViewClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

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

    const handleEditClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

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

    const handleCheckboxToggle = async (checkboxIndex: number) => {
        const content = latestContentRef.current || script.command;
        const lines = content.split("\n");

        let checkboxCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(\s*-\s+)\[([ xX])\](.*)$/);
            if (match) {
                if (checkboxCount === checkboxIndex) {
                    const isChecked = match[2].toLowerCase() === "x";
                    lines[i] = `${match[1]}[${isChecked ? " " : "x"}]${match[3]}`;
                    break;
                }
                checkboxCount++;
            }
        }

        const newContent = lines.join("\n");
        latestContentRef.current = newContent;

        await updateMarkdown({
            ...script,
            command: newContent,
        }).unwrap();
    };

    const markdownComponents = useMemo(
        () => ({
            input: ({ node, checked, disabled, ...props }: any) => {
                if (props.type === "checkbox") {
                    return (
                        <input
                            {...props}
                            defaultChecked={checked}
                            disabled={false}
                            onClick={(e) => {
                                e.stopPropagation();
                                const target = e.target as HTMLInputElement;
                                const allCheckboxes =
                                    document.querySelectorAll('input[type="checkbox"]');
                                let index = -1;
                                for (let i = 0; i < allCheckboxes.length; i++) {
                                    if (allCheckboxes[i] === target) {
                                        index = i;
                                        break;
                                    }
                                }
                                if (index !== -1) {
                                    handleCheckboxToggle(index);
                                }
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                        />
                    );
                }
                return <input {...props} />;
            },
        }),
        [script?.command]
    );

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        await deleteScript({ id: script.id!, folderId: parentFolderId });
        setIsDeleteOpen(false);
    };

    return (
        <>
            <div
                className={`rounded-md border transition-colors cursor-pointer pt-4 ${
                    isSelected
                        ? "bg-gray-200 border-gray-400 dark:bg-[rgba(0,0,0,0.2)] dark:border-neutral-500"
                        : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] dark:border-neutral-600 dark:hover:bg-[rgba(255,255,255,0.2)]"
                }`}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={() => setIsSelected(true)}
                onMouseUp={() => setIsSelected(false)}
                onMouseEnter={(e) => {
                    const target = e.currentTarget;
                    const timeout = setTimeout(() => {
                        setPreviewAnchor(target);
                    }, 300);
                    setHoverTimeout(timeout);
                }}
                onMouseLeave={() => {
                    setIsSelected(false);
                    // Only cancel the show timeout if popover hasn't appeared yet
                    if (hoverTimeout) {
                        clearTimeout(hoverTimeout);
                        setHoverTimeout(null);
                    }
                    // Don't close the popover here - let the popover's onMouseLeave handle it
                }}
                // onDoubleClick={handleEditClick}
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

            <Popover
                open={Boolean(previewAnchor)}
                anchorEl={previewAnchor}
                onClose={() => setPreviewAnchor(null)}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "left",
                }}
                slotProps={{
                    paper: {
                        onMouseEnter: () => {
                            // Prevent closing when entering the popover
                        },
                        onMouseLeave: () => {
                            setPreviewAnchor(null);
                        },
                        sx: {
                            position: "relative",
                            maxWidth: "500px",
                            maxHeight: "600px",
                            overflow: "auto",
                            backgroundColor: "rgb(38, 38, 38)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                            borderRadius: "8px",
                        },
                    },
                }}
            >
                <Box
                    sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        backgroundColor: "rgb(45, 45, 45)",
                        display: "flex",
                        gap: "8px",
                        padding: "6px 16px 8px 16px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        justifyContent: "flex-end",
                    }}
                >
                    <Button
                        size="sm"
                        onClick={(e) => {
                            setPreviewAnchor(null);
                            handleViewClick(e);
                        }}
                        className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                    </Button>
                    <Button
                        size="sm"
                        onClick={(e) => {
                            setPreviewAnchor(null);
                            handleEditClick(e);
                        }}
                        className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        // variant="destructive"
                        onClick={(e) => {
                            setPreviewAnchor(null);
                            handleDelete(e);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                </Box>
                <Box
                    sx={{
                        padding: "16px",
                        color: "rgb(212, 212, 212)",
                        "& h1": {
                            fontSize: "1.5em",
                            fontWeight: "700",
                            marginTop: "0.5em",
                            marginBottom: "0.5em",
                            borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                            paddingBottom: "0.3em",
                            color: "rgb(255, 255, 255)",
                        },
                        "& h2": {
                            fontSize: "1.3em",
                            fontWeight: "700",
                            marginTop: "0.5em",
                            marginBottom: "0.4em",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                            paddingBottom: "0.3em",
                            color: "rgb(255, 255, 255)",
                        },
                        "& h3": {
                            fontSize: "1.15em",
                            fontWeight: "600",
                            marginTop: "0.5em",
                            marginBottom: "0.4em",
                            color: "rgb(245, 245, 245)",
                        },
                        "& h1:first-child, & h2:first-child, & h3:first-child": {
                            marginTop: "0",
                        },
                        "& ul, & ol": {
                            paddingLeft: LIST_GUTTER_WIDTH,
                            marginTop: "0.5em",
                            marginBottom: "0.5em",
                        },
                        "& ul": {
                            listStyleType: "disc",
                            listStylePosition: "outside",
                        },
                        "& ol": {
                            listStyleType: "decimal",
                            listStylePosition: "outside",
                        },
                        "& li": {
                            display: "list-item",
                            paddingLeft: LIST_ITEM_PADDING,
                            lineHeight: LIST_ITEM_LINE_HEIGHT,
                            margin: LIST_ITEM_MARGIN,
                        },
                        "& li.task-list-item": {
                            listStyleType: "none",
                            paddingLeft: "0",
                        },
                        "& input[type='checkbox']": {
                            appearance: "none",
                            width: "16px",
                            height: "16px",
                            marginTop: "-2px",
                            marginRight: CHECKBOX_SPACING,
                            marginLeft: "0",
                            cursor: "pointer",
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            borderRadius: "3px",
                            backgroundColor: "transparent",
                            position: "relative",
                            left: `-${LIST_GUTTER_WIDTH}`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            verticalAlign: "middle",
                            flexShrink: 0,
                            "&:checked": {
                                backgroundColor: "rgb(59, 130, 246)",
                                borderColor: "rgb(59, 130, 246)",
                                "&::after": {
                                    content: '"✓"',
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    lineHeight: "1",
                                },
                            },
                        },
                        "& p": {
                            marginTop: "0.5em",
                            marginBottom: "0.5em",
                        },
                        "& code:not(pre code)": {
                            fontSize: "0.9em",
                            backgroundColor: LIGHT_WHITE_BG,
                            padding: "2px 6px",
                            borderRadius: "3px",
                        },
                        "& pre": {
                            backgroundColor: "rgba(0, 0, 0, 0.3)",
                            borderRadius: "4px",
                            padding: "8px",
                            overflow: "auto",
                            fontSize: "0.85em",
                        },
                        "& pre code": {
                            backgroundColor: "transparent",
                            padding: "0",
                        },
                    }}
                >
                    <div>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                        >
                            {script.command || ""}
                        </ReactMarkdown>
                    </div>
                </Box>
            </Popover>
        </>
    );
}
