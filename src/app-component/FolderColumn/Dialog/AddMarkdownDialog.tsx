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
import SimpleEditor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-tomorrow.css";
import { useMarkdownShortcuts } from "@/hooks/useMarkdownShortcuts";
import { useMarkdownWrap } from "@/hooks/useMarkdownWrap";

import { ScriptsFolderResponse } from "@/types/dto";

export const AddMarkdownDialog = (props: {
    isAddMarkdownOpen: boolean;
    setIsAddMarkdownOpen: (open: boolean) => void;
    folder: ScriptsFolderResponse;
    markdownName: string;
    setMarkdownName: (name: string) => void;
    markdownContent: string;
    setMarkdownContent: (content: string) => void;
    handleAddMarkdown: () => void;
}) => {
    const {
        isAddMarkdownOpen,
        setIsAddMarkdownOpen,
        folder,
        markdownName,
        setMarkdownName,
        markdownContent,
        setMarkdownContent,
        handleAddMarkdown,
    } = props;

    const handleEditorKeyDown = useMarkdownWrap(
        markdownContent,
        (newContent) => setMarkdownContent(newContent)
    );

    // Shared keyboard shortcuts
    useMarkdownShortcuts({
        enabled: isAddMarkdownOpen,
        onSave: () => {
            if (markdownName.trim()) handleAddMarkdown();
        },
        onSubmit: () => {
            if (markdownName.trim()) handleAddMarkdown();
        },
    });

    return (
        <Dialog open={isAddMarkdownOpen} onOpenChange={setIsAddMarkdownOpen}>
            <DialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-5xl"
            >
                <DialogHeader>
                    <DialogTitle>Add Markdown to "{folder.name}"</DialogTitle>
                    <DialogDescription>
                        Create a new markdown document inside this folder.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="markdown-name">Name</Label>
                        <Input
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                            id="markdown-name"
                            autoFocus
                            value={markdownName}
                            onChange={(e) => setMarkdownName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && markdownName.trim()) {
                                 e.preventDefault();
                                  handleAddMarkdown(); 
                                }
                            }}
                            placeholder="Markdown name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="markdown-content">Content</Label>
                        <div className="rounded-md overflow-auto bg-[#1e1e1e]" style={{ minHeight: "300px", maxHeight: "400px" }}>
                            <SimpleEditor
                                value={markdownContent}
                                onValueChange={setMarkdownContent}
                                highlight={(code) =>
                                    highlight(code, languages.markdown, "markdown")
                                }
                                padding={16}
                                style={{
                                    fontFamily:
                                        '"Fira code", "Fira Mono", Consolas, Menlo, Courier, monospace',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    minHeight: "300px",
                                    backgroundColor: "#1e1e1e",
                                    color: "#d4d4d4",
                                }}
                                textareaClassName="focus:outline-none"
                                onKeyDown={handleEditorKeyDown}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMarkdownOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddMarkdown}
                        disabled={!markdownName.trim()}
                    >
                        Create Markdown
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
