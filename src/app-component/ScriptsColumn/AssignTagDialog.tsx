import { useEffect, useMemo, useRef, useState } from "react";
import { Folder, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { tagApi } from "@/store/api/tagApi";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppSelector } from "@/store/hooks";
import type { ScriptAssignedTag } from "@/types/dto";

type FolderSelection = number | "ungrouped";

export default function AssignTagDialog({
    open,
    onOpenChange,
    scriptId,
    scriptName,
    assignedTags = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scriptId: number;
    scriptName: string;
    assignedTags?: ScriptAssignedTag[];
}) {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const [folderId, setFolderId] = useState<FolderSelection>("ungrouped");
    const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
    const { data: tags = [], isLoading: tagsLoading } = tagApi.endpoints.getAllTags.useQuery(
        undefined,
        { skip: !open || !backendPort }
    );
    const { data: folders = [], isLoading: foldersLoading } =
        tagApi.endpoints.getAllTagFolders.useQuery(undefined, { skip: !open || !backendPort });
    const [assignTag, { isLoading: assigning }] =
        scriptApi.endpoints.assignTagToScript.useMutation();
    const initialized = useRef(false);

    const assignedTagIds = useMemo(
        () => new Set(assignedTags.map((tag) => tag.tagId)),
        [assignedTags]
    );

    useEffect(() => {
        if (!open) {
            initialized.current = false;
            return;
        }
        if (initialized.current || foldersLoading) return;
        initialized.current = true;
        setSelectedTagId(null);
        setFolderId(folders[0]?.id ?? "ungrouped");
    }, [open, folders, foldersLoading]);

    const visibleTags = tags.filter((tag) =>
        folderId === "ungrouped" ? tag.tagFolderId == null : tag.tagFolderId === folderId
    );
    const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;
    const selectedAlreadyAssigned = selectedTag != null && assignedTagIds.has(selectedTag.id);
    const loading = tagsLoading || foldersLoading;

    async function confirm() {
        if (selectedTagId == null || selectedAlreadyAssigned || assigning) return;
        try {
            await assignTag({ scriptId, tagId: selectedTagId }).unwrap();
            onOpenChange(false);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>Assign tag to "{scriptName}"</DialogTitle>
                    <DialogDescription>
                        Choose a folder, select a tag, then confirm.
                    </DialogDescription>
                </DialogHeader>
                {loading ? (
                    <p className="text-sm text-neutral-500">Loading...</p>
                ) : tags.length === 0 && folders.length === 0 ? (
                    <p className="text-sm text-neutral-500">No tags yet. Create them from Tags.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 min-h-64">
                        <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-y-auto max-h-80 !p-2 space-y-1">
                            {folders.map((folder) => (
                                <FolderRow
                                    key={folder.id}
                                    label={folder.name}
                                    selected={folderId === folder.id}
                                    onClick={() => setFolderId(folder.id)}
                                />
                            ))}
                            <FolderRow
                                label="Ungrouped"
                                selected={folderId === "ungrouped"}
                                onClick={() => setFolderId("ungrouped")}
                            />
                        </div>
                        <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-y-auto max-h-80">
                            {visibleTags.length === 0 ? (
                                <p className="p-3 text-sm text-neutral-500">
                                    No tags in this folder.
                                </p>
                            ) : (
                                visibleTags.map((tag) => {
                                    const added = assignedTagIds.has(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            disabled={added}
                                            onClick={() => setSelectedTagId(tag.id)}
                                            className={`rounded-none flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 ${
                                                added ? "opacity-50 cursor-default" : "cursor-pointer"
                                            }`}
                                        >
                                            <Tag className="w-4 h-4 flex-shrink-0" />
                                            <span className="flex-1 truncate">{tag.name}</span>
                                            {added && (
                                                <span className="text-xs opacity-80">Added</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
                {selectedTag && (
                    <SelectedTagList
                        tags={[selectedTag]}
                        onRemove={() => setSelectedTagId(null)}
                    />
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirm}
                        disabled={selectedTagId == null || selectedAlreadyAssigned || assigning}
                    >
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SelectedTagList({
    tags,
    onRemove,
}: {
    tags: { id: number; name: string }[];
    onRemove: (id: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
                <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-sm bg-gray-600 px-2 py-1 text-sm text-white dark:bg-neutral-500"
                >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{tag.name}</span>
                    <button
                        type="button"
                        aria-label={`Remove ${tag.name}`}
                        onClick={() => onRemove(tag.id)}
                        className="ml-1 text-white/80 hover:text-white"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </span>
            ))}
        </div>
    );
}

function FolderRow({
    label,
    selected,
    onClick,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer ${
                selected
                    ? "bg-gray-600 text-white dark:bg-neutral-500"
                    : "hover:bg-gray-100 dark:hover:bg-neutral-700"
            }`}
        >
            <Folder className="w-4 h-4 flex-shrink-0" fill="currentColor" />
            <span className="truncate">{label}</span>
        </button>
    );
}
