import { Terminal } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExecuteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scriptName: string;
    scriptCommand: string;
    onConfirm: () => void;
}

export default function ExecuteConfirmDialog({
    open,
    onOpenChange,
    scriptName,
    scriptCommand,
    onConfirm,
}: ExecuteConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="dark bg-neutral-900 border-neutral-700 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-neutral-100 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-neutral-400" />
                        Execute script: {scriptName}
                    </DialogTitle>
                </DialogHeader>
                <div className="rounded border border-neutral-700 bg-neutral-950 p-3 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-300">
                        {scriptCommand}
                    </pre>
                </div>
                <p className="text-sm text-neutral-400">
                    Are you sure you want to execute this script?
                </p>
                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                        Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
