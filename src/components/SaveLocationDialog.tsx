import { useState } from "react";
import { Building2, ChevronLeft, Folder } from "lucide-react";
import { workspaceApi } from "@/store/api/workspaceApi";
import { useAppSelector } from "@/store/hooks";
import type { ScriptsFolderResponse } from "@/types/dto";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SelectedFolder {
    folderId: number;
    rootFolderId: number;
    label: string;
}

function FolderTreeItem({
    folder,
    rootFolderId,
    onSelect,
}: {
    folder: ScriptsFolderResponse;
    rootFolderId: number;
    onSelect: (folderId: number, rootFolderId: number, label: string) => void;
}) {
    if (folder.subfolders.length > 0) {
        return (
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700">
                    <Folder className="w-4 h-4 mr-2 shrink-0" />
                    {folder.name}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent className="z-[9999] dark:bg-neutral-800 dark:border-neutral-700">
                        <DropdownMenuItem
                            className="cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700 text-xs italic"
                            onSelect={() => onSelect(folder.id, rootFolderId, folder.name)}
                        >
                            Move here
                        </DropdownMenuItem>
                        {folder.subfolders.map((sub) => (
                            <FolderTreeItem
                                key={sub.id}
                                folder={sub}
                                rootFolderId={rootFolderId}
                                onSelect={onSelect}
                            />
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
        );
    }
    return (
        <DropdownMenuItem
            className="cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
            onSelect={() => onSelect(folder.id, rootFolderId, folder.name)}
        >
            <Folder className="w-4 h-4 mr-2 shrink-0" />
            {folder.name}
        </DropdownMenuItem>
    );
}

export interface SaveLocationDialogProps {
    open: boolean;
    onSaveAsDraft: () => void;
    onSaveInFolder: (folderId: number, rootFolderId: number) => void;
    onCancel: () => void;
}

export default function SaveLocationDialog({
    open,
    onSaveAsDraft,
    onSaveInFolder,
    onCancel,
}: SaveLocationDialogProps) {
    const port = useAppSelector((s) => s.config.backendPort);
    const { data: workspaces } = workspaceApi.endpoints.getAllWorkspaces.useQuery(undefined, {
        skip: !port,
    });

    const [page, setPage] = useState<"choose" | "folder">("choose");
    const [selected, setSelected] = useState<SelectedFolder | null>(null);

    const reset = () => {
        setPage("choose");
        setSelected(null);
    };

    const handleCancel = () => {
        reset();
        onCancel();
    };

    const handleSaveAsDraft = () => {
        reset();
        onSaveAsDraft();
    };

    const handleSaveInFolder = () => {
        if (!selected) return;
        const { folderId, rootFolderId } = selected;
        reset();
        onSaveInFolder(folderId, rootFolderId);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) handleCancel();
            }}
        >
            <DialogContent className="dark:bg-neutral-800 dark:border-neutral-700 max-w-sm">
                {page === "choose" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="dark:text-white">Save Markdown</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Where do you want to save this markdown?
                        </p>
                        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                            <Button
                                variant="outline"
                                onClick={handleSaveAsDraft}
                                className="dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
                            >
                                Save as Draft
                            </Button>
                            <Button onClick={() => setPage("folder")}>Save in a Folder →</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <button
                                onClick={() => setPage("choose")}
                                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 mb-1 w-fit"
                            >
                                <ChevronLeft className="w-3 h-3" />
                                Back
                            </button>
                            <DialogTitle className="dark:text-white">Select Folder</DialogTitle>
                        </DialogHeader>
                        <div className="py-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:bg-neutral-700 truncate"
                                    >
                                        <Folder className="w-4 h-4 mr-2 shrink-0" />
                                        <span className="truncate">
                                            {selected ? selected.label : "Select a folder…"}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="z-[9999] dark:bg-neutral-800 dark:border-neutral-700 w-64 max-h-72 overflow-y-auto">
                                    {(workspaces ?? []).length === 0 ? (
                                        <DropdownMenuItem
                                            disabled
                                            className="dark:text-neutral-500"
                                        >
                                            No workspaces
                                        </DropdownMenuItem>
                                    ) : (
                                        (workspaces ?? []).map((workspace) => (
                                            <DropdownMenuSub key={workspace.id}>
                                                <DropdownMenuSubTrigger className="cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700">
                                                    <Building2 className="w-4 h-4 mr-2 shrink-0" />
                                                    {workspace.name}
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent className="z-[9999] dark:bg-neutral-800 dark:border-neutral-700 max-h-72 overflow-y-auto">
                                                        {workspace.folders.length === 0 ? (
                                                            <DropdownMenuItem
                                                                disabled
                                                                className="dark:text-neutral-500"
                                                            >
                                                                No folders
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            workspace.folders.map((folder) => (
                                                                <FolderTreeItem
                                                                    key={folder.id}
                                                                    folder={folder}
                                                                    rootFolderId={folder.id}
                                                                    onSelect={(fId, rId, label) =>
                                                                        setSelected({
                                                                            folderId: fId,
                                                                            rootFolderId: rId,
                                                                            label,
                                                                        })
                                                                    }
                                                                />
                                                            ))
                                                        )}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                        ))
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setPage("choose")}
                                className="dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
                            >
                                Back
                            </Button>
                            <Button onClick={handleSaveInFolder} disabled={!selected}>
                                Save Here
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
