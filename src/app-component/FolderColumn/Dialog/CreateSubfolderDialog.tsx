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

export const CreateSubfolderDialog = (props: {
    isCreateSubfolderOpen: boolean;
    setIsCreateSubfolderOpen: (open: boolean) => void;
    folder: ScriptsFolderResponse;
    subfolderName: string;
    setSubfolderName: (name: string) => void;
    handleCreateSubfolder: () => void;
}) => {
    const {
        isCreateSubfolderOpen,
        setIsCreateSubfolderOpen,
        folder,
        subfolderName,
        setSubfolderName,
        handleCreateSubfolder,
    } = props;

    return (
        <Dialog open={isCreateSubfolderOpen} onOpenChange={setIsCreateSubfolderOpen}>
            <DialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
            >
                <DialogHeader>
                    <DialogTitle>Create Subfolder</DialogTitle>
                    <DialogDescription>
                        Create a new subfolder inside "{folder.name}".
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="subfolder-name">Subfolder Name</Label>
                        <Input
                            id="subfolder-name"
                            value={subfolderName}
                            onChange={(e) => setSubfolderName(e.target.value)}
                            placeholder="Subfolder name"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && subfolderName.trim()) {
                                    handleCreateSubfolder();
                                }
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateSubfolderOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateSubfolder} disabled={!subfolderName.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
