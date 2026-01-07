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
import { Textarea } from "@/components/ui/textarea";

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
                            value={markdownName}
                            onChange={(e) => setMarkdownName(e.target.value)}
                            placeholder="Markdown name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="markdown-content">Content</Label>
                        <Textarea
                            id="markdown-content"
                            value={markdownContent}
                            onChange={(e) => setMarkdownContent(e.target.value)}
                            placeholder="Markdown content"
                            rows={18}
                            className="font-mono text-sm bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMarkdownOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddMarkdown}
                        disabled={!markdownName.trim() || !markdownContent.trim()}
                    >
                        Create Markdown
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
