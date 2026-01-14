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
import { Switch } from "@/components/ui/switch";
import { AiScriptedToolDTO } from "@/types/dto";
import { useState, useEffect } from "react";

export const EditScriptedToolDialog = (props: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    scriptedTool: AiScriptedToolDTO | null;
    onSave: (tool: AiScriptedToolDTO) => void;
}) => {
    const { isOpen, setIsOpen, scriptedTool, onSave } = props;

    const [name, setName] = useState("");
    const [toolDescription, setToolDescription] = useState("");
    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        if (scriptedTool) {
            setName(scriptedTool.name);
            setToolDescription(scriptedTool.toolDescription);
            setIsEnabled(scriptedTool.isEnabled);
        }
    }, [scriptedTool]);

    const handleSave = () => {
        if (scriptedTool) {
            onSave({
                ...scriptedTool,
                name,
                toolDescription,
                isEnabled,
            });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen} key={isOpen ? "open" : "closed"}>
            <DialogContent
                overlayClassName="bg-black/50 z-[9999]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-2xl z-[10000]"
            >
                <DialogHeader>
                    <DialogTitle>Edit AI Scripted Tool</DialogTitle>
                    <DialogDescription>Update the scripted tool configuration.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tool-name">Name</Label>
                        <Input
                            id="tool-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tool name"
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tool-description">Description</Label>
                        <Textarea
                            id="tool-description"
                            value={toolDescription}
                            onChange={(e) => setToolDescription(e.target.value)}
                            placeholder="Tool description"
                            rows={6}
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="tool-enabled">Enabled</Label>
                        <Switch
                            id="tool-enabled"
                            checked={isEnabled}
                            onCheckedChange={setIsEnabled}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim() || !toolDescription.trim()}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
