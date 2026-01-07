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

export const AddScriptDialog = (props: {
    isAddScriptOpen: boolean;
    setIsAddScriptOpen: (open: boolean) => void;
    folder: ScriptsFolderResponse;
    scriptName: string;
    setScriptName: (name: string) => void;
    scriptCommand: string;
    setScriptCommand: (command: string) => void;
    handleAddScript: () => void;
}) => {
    const {
        isAddScriptOpen,
        setIsAddScriptOpen,
        folder,
        scriptName,
        setScriptName,
        scriptCommand,
        setScriptCommand,
        handleAddScript,
    } = props;

    return (
        <Dialog open={isAddScriptOpen} onOpenChange={setIsAddScriptOpen}>
            <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Add Script to "{folder.name}"</DialogTitle>
                    <DialogDescription>Create a new script inside this folder.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="script-name">Name</Label>
                        <Input
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                            id="script-name"
                            value={scriptName}
                            onChange={(e) => setScriptName(e.target.value)}
                            placeholder="Script name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="script-command">Command</Label>
                        <Textarea
                            id="script-command"
                            value={scriptCommand}
                            onChange={(e) => setScriptCommand(e.target.value)}
                            placeholder="Command to execute"
                            rows={18}
                            className="font-mono text-sm bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddScriptOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddScript}
                        disabled={!scriptName.trim() || !scriptCommand.trim()}
                    >
                        Create Script
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
