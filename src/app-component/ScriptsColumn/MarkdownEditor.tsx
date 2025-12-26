import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { scriptApi } from "@/store/api/scriptApi";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Edit, Eye } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import SimpleEditor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-tomorrow.css";

const LIGHT_WHITE_BG = "rgba(255, 255, 255, 0.2)";

// List spacing constants for alignment calibration
const LIST_GUTTER_WIDTH = "2em";
const LIST_ITEM_PADDING = "0.5em";
const CHECKBOX_SPACING = "-1.25em";
const LIST_ITEM_LINE_HEIGHT = "1.4";

export default function MarkdownEditor({ scriptId }: { scriptId: number | undefined }) {
    const dispatch = useAppDispatch();

    const { data: script, isLoading: scriptIsLoading } = scriptApi.endpoints.getScriptById.useQuery(
        scriptId,
        {
            skip: !(scriptId != null),
        }
    );

    // Read editMode from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const editModeFromUrl = urlParams.get("editMode") === "true";

    const [isEditMode, setIsEditMode] = useState(editModeFromUrl);
    const [editContent, setEditContent] = useState("");
    const [editName, setEditName] = useState("");
    const [edited, setEdited] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const latestContentRef = useRef("");
    const handleSaveEditRef = useRef<((closeEditMode?: boolean) => Promise<void>) | null>(null);

    const handleEnableEdit = () => {
        setIsEditMode(true);
        setEditName(script?.name || "");
    };

    // Initialize editName when script loads if starting in edit mode
    useEffect(() => {
        if (editModeFromUrl && script) {
            setEditName(script.name || "");
        }
    }, [script, editModeFromUrl]);

    const handleSaveEdit = useCallback(
        async (closeEditMode: boolean = true) => {
            if (!script) {
                return;
            }

            await updateMarkdown({
                ...script,
                name: editName,
                command: editContent,
            }).unwrap();

            setHasChanges(false);
            setEdited(true);
            setTimeout(() => setEdited(false), 2000);

            if (closeEditMode) {
                setIsEditMode(false);
            }

            dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));

            // Notify main window to refresh its data
            await emit("markdown-updated", { scriptId: script.id });
        },
        [script, editName, editContent, updateMarkdown, dispatch]
    );

    // Keep ref updated with latest handleSaveEdit
    useEffect(() => {
        handleSaveEditRef.current = handleSaveEdit;
    }, [handleSaveEdit]);

    // Global Cmd+S handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (isEditMode) {
                    handleSaveEdit(false);
                }
            }

            // Cmd+W to close window
            if ((e.metaKey || e.ctrlKey) && e.key === "w") {
                e.preventDefault();
                getCurrentWindow().close();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, handleSaveEdit]);

    const handleCancelEdit = () => {
        setEditContent(script?.command || "");
        setIsEditMode(false);
    };

    // const handleClose = () => {
    //     // Close the window
    //     getCurrentWindow().close();
    // };

    const endEditButton = () => {
        return (
            <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
            >
                End Edit
            </Button>
        );
    };

    // const closeButton = () => {
    //     return (
    //         <Button
    //             variant="outline"
    //             onClick={handleClose}
    //             className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
    //         >
    //             Close
    //         </Button>
    //     );
    // };

    const handleCheckboxToggle = async (checkboxIndex: number) => {
        const content = latestContentRef.current || script?.command || "";
        const lines = content.split("\n");

        let currentCheckboxIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(\s*-\s+)\[([ xX])\](.*)$/);
            if (match) {
                if (currentCheckboxIndex === checkboxIndex) {
                    const isChecked = match[2].toLowerCase() === "x";
                    lines[i] = `${match[1]}[${isChecked ? " " : "x"}]${match[3]}`;
                    break;
                }
                currentCheckboxIndex++;
            }
        }

        const updatedContent = lines.join("\n");
        latestContentRef.current = updatedContent;

        if (script) {
            await updateMarkdown({
                ...script,
                command: updatedContent,
            });
        }
    };

    useEffect(() => {
        setEditContent(script?.command || "");
        latestContentRef.current = script?.command || "";
    }, [script]);

    // Add Cmd+S keyboard shortcut for saving
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (isEditMode && script) {
                    await handleSaveEdit(false);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditMode, script, editName, editContent]);

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
        };
    }, [script?.command]);

    return (
        <div className="h-screen w-screen bg-white dark:bg-neutral-800 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                        {isEditMode ? (
                            <Edit className="w-5 h-5 text-black dark:text-white" />
                        ) : (
                            <Eye className="w-5 h-5 text-black dark:text-white" />
                        )}
                        {isEditMode ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => {
                                    setEditName(e.target.value);
                                    setHasChanges(true);
                                    setEdited(false);
                                }}
                                className="text-lg font-semibold bg-transparent border border-gray-300 dark:border-neutral-600 focus:outline-none focus:border-blue-500 text-black dark:text-white px-2 py-1 rounded flex-1 max-w-md"
                                placeholder="Markdown name"
                            />
                        ) : (
                            <h2
                                className="text-lg font-semibold text-black dark:text-white cursor-pointer"
                                onDoubleClick={handleEnableEdit}
                            >
                                {script?.name}
                            </h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditMode && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {edited ? "Saved" : hasChanges ? "Not Saved" : ""}
                            </span>
                        )}
                        {!isEditMode ? (
                            <>
                                <Button
                                    onClick={handleEnableEdit}
                                    className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                                {}
                                {/* {closeButton()} */}
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={() => handleSaveEdit(true)}
                                    disabled={!hasChanges}
                                    className="dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                                >
                                    Save Changes
                                </Button>
                                {endEditButton()}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {scriptIsLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500 dark:text-gray-400">
                            Loading script data...
                        </div>
                    </div>
                ) : isEditMode ? (
                    <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
                        <SimpleEditor
                            value={editContent}
                            onValueChange={(code) => {
                                setEditContent(code);
                                setHasChanges(true);
                                setEdited(false);
                            }}
                            highlight={(code) => highlight(code, languages.markdown, "markdown")}
                            padding={16}
                            style={{
                                fontFamily:
                                    '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                fontSize: 15,
                                lineHeight: 1.5,
                                minHeight: "100%",
                                backgroundColor: "#1e1e1e",
                                color: "#d4d4d4",
                            }}
                            textareaClassName="focus:outline-none"
                        />
                    </div>
                ) : (
                    <Box
                        className="markdown-preview"
                        sx={{
                            height: "100%",
                            userSelect: "text",
                            cursor: "text",
                            overflowY: "auto",
                            backgroundColor: "rgb(209, 213, 219)",
                            padding: "24px",
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
                                appearance: "none !important",
                                WebkitAppearance: "none !important",
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
        </div>
    );
}
