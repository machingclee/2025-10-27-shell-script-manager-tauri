import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    title: string;
    description: string;
    itemName: string;
    onConfirm: () => void;
    isDeleting?: boolean;
}

export const DeleteConfirmationDialog = ({
    isOpen,
    setIsOpen,
    title,
    description,
    itemName,
    onConfirm,
    isDeleting = false,
}: DeleteConfirmationDialogProps) => {
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                overlayClassName="bg-black/60 z-[10001]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-md z-[10002]"
            >
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-lg">{title}</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription className="pt-3">
                        {description}
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-neutral-700/50 rounded text-sm font-medium">
                            {itemName}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isDeleting}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
