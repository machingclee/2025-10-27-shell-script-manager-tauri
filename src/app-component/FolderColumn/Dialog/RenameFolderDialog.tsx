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

import { ScriptsFolderResponse } from "@/types/dto";

export const RenameFolderDialog = (props: {
    isRenameOpen: boolean;
    setIsRenameOpen: (open: boolean) => void;
    folder: ScriptsFolderResponse;
    newName: string;
    setNewName: (name: string) => void;
    handleRename: () => void;
}) => {
    const { isRenameOpen, setIsRenameOpen, folder, newName, setNewName, handleRename } = props;

    return (
        <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
            <DialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
            >
                <DialogHeader>
                    <DialogTitle>Rename Folder</DialogTitle>
                    <DialogDescription>Enter a new name for "{folder.name}".</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="folder-name">Folder Name</Label>
                        <Input
                            id="folder-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Folder name"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleRename} disabled={!newName}>
                        Rename
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
