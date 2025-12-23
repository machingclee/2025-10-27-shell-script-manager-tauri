import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { scriptApi } from "@/store/api/scriptApi";
import { useEffect, useState, useRef, useMemo } from "react";
import { Box } from "@mui/material";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Eye } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";

const LIGHT_WHITE_BG = "rgba(255, 255, 255, 0.2)";

// List spacing constants for alignment calibration
// These values work together: checkbox uses left: -LIST_GUTTER_WIDTH to position in the gutter
const LIST_GUTTER_WIDTH = "2em"; // Width of the bullet/checkbox column (ul/ol paddingLeft)
const LIST_ITEM_PADDING = "0.5em"; // Additional spacing after bullet for regular list items
const CHECKBOX_SPACING = "-1.25em"; // Spacing between checkbox and text
const LIST_ITEM_LINE_HEIGHT = "1.4"; // Line height for list items (default is ~1.6)

export default function MarkdownDialog({
    scriptId,
    open,
    onOpenChange,
}: {
    scriptId: number | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const dispatch = useAppDispatch();
    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: !(scriptId != null),
    });
    const [isDialogEditMode, setIsDialogEditMode] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [edited, setEdited] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    // Track the latest markdown content for checkbox toggles
    const latestContentRef = useRef("");

    const handleEnableEdit = () => {
        setIsDialogEditMode(true);
        setHasChanges(false);
        setEdited(false);
    };

    const handleSaveEdit = async (closeDialog: boolean = true) => {
        if (!script) {
            return;
        }
        await updateMarkdown({
            ...script,
            command: editContent,
        }).unwrap();
        latestContentRef.current = editContent;
        setHasChanges(false);
        setEdited(true);
        setTimeout(() => setEdited(false), 2000); // Show "Saved" for 2 seconds
        if (closeDialog) {
            setIsDialogEditMode(false);
        }
    };

    const handleCancelEdit = () => {
        if (isDialogEditMode) {
            // If in edit mode, just switch back to view mode
            setEditContent(script?.command || "");
            setIsDialogEditMode(false);
            setHasChanges(false);
        } else {
            // If in view mode, close the dialog
            onOpenChange(false);
        }
    };

    const handleCheckboxToggle = async (checkboxIndex: number) => {
        if (!script) return;

        // Use the latest content from ref instead of stale script.command
        const currentContent = latestContentRef.current || script.command;
        const lines = currentContent.split("\n");
        let currentCheckboxIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match task list items: - [ ] or - [x] or - [X]
            const match = line.match(/^(\s*-\s+)\[([ xX])\](.*)$/);
            if (match) {
                if (currentCheckboxIndex === checkboxIndex) {
                    // Toggle the checkbox
                    const isChecked = match[2].toLowerCase() === "x";
                    lines[i] = `${match[1]}[${isChecked ? " " : "x"}]${match[3]}`;
                    break;
                }
                currentCheckboxIndex++;
            }
        }

        const updatedContent = lines.join("\n");
        latestContentRef.current = updatedContent;

        console.log("checkboxIndex toggled:", checkboxIndex);
        console.log("Updated markdown content after checkbox toggle:", updatedContent);

        await updateMarkdown({
            ...script,
            command: updatedContent,
        });
    };

    useEffect(() => {
        setEditContent(script?.command || "");
        latestContentRef.current = script?.command || "";
    }, [script]);

    // Memoize components to prevent re-creation on every render
    const markdownComponents = useMemo(() => {
        return {
            input: ({ node, checked, disabled, ...props }: any) => {
                if (props.type === "checkbox") {
                    return (
                        <input
                            {...props}
                            style={{ cursor: "pointer" }}
                            type="checkbox"
                            defaultChecked={checked}
                            disabled={false}
                            onClick={(e) => {
                                e.stopPropagation();
                                const target = e.target as HTMLInputElement;

                                // Find all checkboxes in the document and count how many come before this one
                                const allCheckboxes =
                                    document.querySelectorAll('input[type="checkbox"]');
                                let index = -1;
                                for (let i = 0; i < allCheckboxes.length; i++) {
                                    if (allCheckboxes[i] === target) {
                                        index = i;
                                        break;
                                    }
                                }

                                console.log("Checkbox clicked, computed index:", index);
                                if (index !== -1) {
                                    handleCheckboxToggle(index);
                                }
                            }}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                            }}
                        />
                    );
                }
                return <input {...props} />;
            },
        };
    }, [script?.command]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-5xl flex flex-col"
                style={{ overflow: "visible" }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isDialogEditMode ? (
                            <Edit className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                        {script?.name}
                    </DialogTitle>
                </DialogHeader>
                <div
                    className="flex-1"
                    style={{
                        minHeight: "500px",
                        maxHeight: "70vh",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    {isDialogEditMode ? (
                        <Editor
                            height="100vh"
                            defaultLanguage="markdown"
                            value={editContent}
                            onChange={(value) => {
                                setEditContent(value || "");
                                setHasChanges(true);
                                setEdited(false);
                            }}
                            onMount={(editor, monaco) => {
                                editor.addCommand(
                                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                                    async () => {
                                        const currentValue = editor.getValue();
                                        if (!script) {
                                            return;
                                        }
                                        await updateMarkdown({
                                            ...script,
                                            command: currentValue,
                                        }).unwrap();
                                        setEditContent(currentValue);
                                        setHasChanges(false);
                                        setEdited(true);
                                        setTimeout(() => setEdited(false), 2000);
                                        dispatch(
                                            scriptApi.util.invalidateTags([
                                                { type: "Script", id: script.id },
                                            ])
                                        );
                                    }
                                );
                            }}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 15,
                                wordWrap: "on",
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 16, bottom: 16 },
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: isDialogEditMode ? "unset" : "auto",
                                backgroundColor: "rgb(209, 213, 219)",
                                borderRadius: "4px",
                                padding: "16px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                ".dark &": {
                                    backgroundColor: "rgba(255, 255, 255, 0.05) !important",
                                    color: "rgb(212, 212, 212) !important",
                                },
                                "& h1": {
                                    fontSize: "2em",
                                    fontWeight: "700",
                                    marginTop: "0.67em",
                                    marginBottom: "0.67em",
                                    borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                                    paddingBottom: "0.3em",
                                    color: "rgb(255, 255, 255)",
                                },
                                "& h2": {
                                    fontSize: "1.75em",
                                    fontWeight: "700",
                                    marginTop: "0.75em",
                                    marginBottom: "0.5em",
                                    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                                    paddingBottom: "0.3em",
                                    color: "rgb(255, 255, 255)",
                                },
                                "& h3": {
                                    fontSize: "1.5em",
                                    fontWeight: "600",
                                    marginTop: "0.75em",
                                    marginBottom: "0.5em",
                                    color: "rgb(245, 245, 245)",
                                },
                                "& h4": {
                                    fontSize: "1.25em",
                                    fontWeight: "600",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                    color: "rgb(245, 245, 245)",
                                },
                                "& h5": {
                                    fontSize: "1.1em",
                                    fontWeight: "600",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                    color: "rgb(230, 230, 230)",
                                },
                                "& h6": {
                                    fontSize: "1em",
                                    fontWeight: "600",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                    color: "rgb(220, 220, 220)",
                                },
                                "& h1:first-child, & h2:first-child, & h3:first-child, & h4:first-child, & h5:first-child, & h6:first-child":
                                    {
                                        marginTop: "0",
                                    },
                                "& ul, & ol": {
                                    paddingLeft: LIST_GUTTER_WIDTH,
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& ul": {
                                    listStyleType: "disc",
                                },
                                "& ol": {
                                    listStyleType: "decimal",
                                },
                                "& li": {
                                    display: "list-item",
                                    paddingLeft: LIST_ITEM_PADDING,
                                    lineHeight: LIST_ITEM_LINE_HEIGHT,
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
                                    fontSize: "0.95em",
                                    backgroundColor: LIGHT_WHITE_BG,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                },
                                "& pre": {
                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                    borderRadius: "4px",
                                    padding: "12px",
                                    overflow: "auto",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& pre code": {
                                    backgroundColor: "transparent",
                                    padding: "0",
                                    fontSize: "0.9em",
                                },
                                "& blockquote": {
                                    borderLeft: "4px solid rgba(255, 255, 255, 0.3)",
                                    paddingLeft: "1em",
                                    marginLeft: "0",
                                    color: "rgba(255, 255, 255, 0.8)",
                                },
                                "& a": {
                                    color: "rgb(96, 165, 250)",
                                    textDecoration: "underline",
                                    "&:hover": {
                                        color: "rgb(147, 197, 253)",
                                    },
                                },
                                "& table": {
                                    borderCollapse: "collapse",
                                    width: "100%",
                                    marginTop: "0.5em",
                                    marginBottom: "0.5em",
                                },
                                "& th, & td": {
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    padding: "8px",
                                },
                                "& th": {
                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                    fontWeight: "600",
                                },
                            }}
                            onDoubleClick={handleEnableEdit}
                        >
                            <ReactMarkdown
                                key={script?.command}
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={markdownComponents}
                            >
                                {script?.command || ""}
                            </ReactMarkdown>
                        </Box>
                    )}
                </div>
                <DialogFooter className="flex items-center justify-end">
                    {isDialogEditMode && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                            {edited ? "Saved" : hasChanges ? "Not Saved" : ""}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                    >
                        {isDialogEditMode ? "Cancel Edit" : "Close"}
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
                            onClick={() => {
                                const closeDialog = true;
                                handleSaveEdit(closeDialog);
                            }}
                            className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            Save Changes
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
