import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { tagApi } from "@/store/api/tagApi";
import SortableTagFolderList, {
    TagFolderPickerRow,
} from "@/app-component/Tag/SortableTagFolderList";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppSelector } from "@/store/hooks";
import { matchesTagFilter } from "@/lib/tagFilter";
import type { ScriptAssignedTag } from "@/types/dto";

type FolderSelection = number | "ungrouped";

const inputClass =
    "h-8 bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white";

const addButtonClass =
    "bg-white p-1 !h-8 rounded-md border-0 !shadow-none hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600";

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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [folderDraft, setFolderDraft] = useState("");
    const [tagDraft, setTagDraft] = useState("");
    const [folderFormOpen, setFolderFormOpen] = useState(false);
    const [tagFormOpen, setTagFormOpen] = useState(false);
    const [tagFilter, setTagFilter] = useState("");
    const { data: tags = [], isLoading: tagsLoading } = tagApi.endpoints.getAllTags.useQuery(
        undefined,
        { skip: !open || !backendPort }
    );
    const { data: folders = [], isLoading: foldersLoading } =
        tagApi.endpoints.getAllTagFolders.useQuery(undefined, { skip: !open || !backendPort });
    const [assignTag, { isLoading: assigning }] =
        scriptApi.endpoints.assignTagToScript.useMutation();
    const [unassignTag, { isLoading: unassigning }] =
        scriptApi.endpoints.unassignTagFromScript.useMutation();
    const [createTagFolder, { isLoading: creatingFolder }] =
        tagApi.endpoints.createTagFolder.useMutation();
    const [createTag, { isLoading: creatingTag }] = tagApi.endpoints.createTag.useMutation();
    const initialized = useRef(false);

    const assignedTagIds = useMemo(
        () => new Set(assignedTags.map((tag) => tag.tagId)),
        [assignedTags]
    );

    useEffect(() => {
        if (!open) {
            initialized.current = false;
            setFolderFormOpen(false);
            setTagFormOpen(false);
            setFolderDraft("");
            setTagDraft("");
            setTagFilter("");
            return;
        }
        if (initialized.current || foldersLoading) return;
        initialized.current = true;
        setSelectedIds(assignedTags.map((tag) => tag.tagId));
        setFolderId(folders[0]?.id ?? "ungrouped");
    }, [open, folders, foldersLoading]);

    const searchingAll = tagFilter.trim().length > 0;
    const folderTags = searchingAll
        ? tags
        : tags.filter((tag) =>
              folderId === "ungrouped" ? tag.tagFolderId == null : tag.tagFolderId === folderId
          );
    const visibleTags = folderTags.filter((tag) => matchesTagFilter(tag.name, tagFilter));
    const loading = tagsLoading || foldersLoading;

    function selectFolder(id: FolderSelection) {
        setTagFilter("");
        setFolderId(id);
    }

    function addTag(tagId: number) {
        setSelectedIds((current) => (current.includes(tagId) ? current : [...current, tagId]));
    }

    function removeTag(tagId: number) {
        setSelectedIds((current) => current.filter((id) => id !== tagId));
    }

    const selectedTags = selectedIds.flatMap((id) => {
        const tag = tags.find((item) => item.id === id);
        if (tag) return [tag];
        const assigned = assignedTags.find((item) => item.tagId === id);
        return assigned ? [{ id: assigned.tagId, name: assigned.name }] : [];
    });
    const tagsToAdd = selectedIds.filter((id) => !assignedTagIds.has(id));
    const tagsToRemove = assignedTags
        .map((tag) => tag.tagId)
        .filter((id) => !selectedIds.includes(id));
    const selectionChanged = tagsToAdd.length > 0 || tagsToRemove.length > 0;
    const selectedFolderName =
        folderId === "ungrouped"
            ? "Ungrouped"
            : (folders.find((folder) => folder.id === folderId)?.name ?? "Ungrouped");

    async function handleCreateFolder() {
        const name = folderDraft.trim();
        if (!name || creatingFolder) return;
        try {
            const created = await createTagFolder({ name }).unwrap();
            setFolderDraft("");
            setFolderFormOpen(false);
            selectFolder(created.id);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    async function handleCreateTag() {
        const name = tagDraft.trim();
        if (!name || creatingTag) return;
        try {
            const created = await createTag({
                name,
                tagFolderId: folderId === "ungrouped" ? null : folderId,
            }).unwrap();
            setTagDraft("");
            setTagFormOpen(false);
            addTag(created.id);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    async function confirm() {
        if (!selectionChanged || assigning || unassigning) return;
        try {
            if (tagsToRemove.length > 0) {
                await unassignTag({ scriptId, tagIds: tagsToRemove }).unwrap();
            }
            if (tagsToAdd.length > 0) {
                await assignTag({ scriptId, tagIds: tagsToAdd }).unwrap();
            }
            onOpenChange(false);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                noTransform
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onEscapeKeyDown={(event) => {
                    if (!tagFormOpen) return;
                    event.preventDefault();
                    setTagDraft("");
                    setTagFormOpen(false);
                }}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>Tag Assignment for "{scriptName}"</DialogTitle>
                    <DialogDescription>
                        Choose a folder and select tags. The cross removes a tag from this script.
                    </DialogDescription>
                    <div className="relative mt-3">
                        <Input
                            className={`${inputClass} pr-7`}
                            value={tagFilter}
                            onChange={(event) => setTagFilter(event.target.value)}
                            placeholder="Search tags"
                            aria-label="Search tags"
                        />
                        {tagFilter && (
                            <button
                                type="button"
                                aria-label="Clear tag search"
                                onClick={() => setTagFilter("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-neutral-200"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </DialogHeader>
                {loading ? (
                    <p className="text-sm text-neutral-500">Loading...</p>
                ) : (
                    <div className="grid grid-cols-2 gap-3 min-h-64">
                        <div className="flex min-h-64 max-h-80 flex-col overflow-hidden rounded-md border border-gray-200 dark:border-neutral-700">
                            <div className="flex items-center justify-end border-b border-gray-200 px-2 py-1.5 dark:border-neutral-700">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={addButtonClass}
                                    onClick={() => {
                                        setFolderDraft("");
                                        setFolderFormOpen((current) => !current);
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Tag Folder
                                </Button>
                            </div>
                            {folderFormOpen && (
                                <form
                                    className="flex gap-1 border-b border-gray-200 p-2 dark:border-neutral-700"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleCreateFolder();
                                    }}
                                >
                                    <Input
                                        className={inputClass}
                                        value={folderDraft}
                                        onChange={(event) => setFolderDraft(event.target.value)}
                                        placeholder="Folder name"
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!folderDraft.trim() || creatingFolder}
                                    >
                                        Add
                                    </Button>
                                </form>
                            )}
                            <div className="flex-1 space-y-1 overflow-y-auto !p-2">
                                <SortableTagFolderList
                                    folders={folders}
                                    selectedId={searchingAll ? null : folderId}
                                    onSelect={selectFolder}
                                />
                                <TagFolderPickerRow
                                    label="Ungrouped"
                                    selected={!searchingAll && folderId === "ungrouped"}
                                    onClick={() => selectFolder("ungrouped")}
                                />
                            </div>
                        </div>
                        <div className="flex min-h-64 max-h-80 flex-col overflow-hidden rounded-md border border-gray-200 dark:border-neutral-700">
                            <div className="flex items-center justify-end border-b border-gray-200 px-2 py-1.5 dark:border-neutral-700">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={`${addButtonClass} shrink-0`}
                                    title={`Add a tag to ${selectedFolderName}`}
                                    onClick={() => {
                                        setTagDraft("");
                                        setTagFormOpen((current) => !current);
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Tag
                                </Button>
                            </div>
                            {tagFormOpen && (
                                <form
                                    className="flex gap-1 border-b border-gray-200 p-2 dark:border-neutral-700"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleCreateTag();
                                    }}
                                >
                                    <Input
                                        className={inputClass}
                                        value={tagDraft}
                                        onChange={(event) => setTagDraft(event.target.value)}
                                        placeholder={`Tag in ${selectedFolderName}`}
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!tagDraft.trim() || creatingTag}
                                    >
                                        Add
                                    </Button>
                                </form>
                            )}
                            <div className="flex-1 overflow-y-auto">
                                {visibleTags.length === 0 ? (
                                    <p className="p-3 text-sm text-neutral-500">
                                        {searchingAll
                                            ? "No matching tags."
                                            : "No tags in this folder."}
                                    </p>
                                ) : (
                                    visibleTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => addTag(tag.id)}
                                                className="rounded-none flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                                            >
                                                <Tag className="w-4 h-4 flex-shrink-0" />
                                                <span className="flex-1 truncate">{tag.name}</span>
                                            </button>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {selectedTags.length > 0 && (
                    <SelectedTagList tags={selectedTags} onRemove={removeTag} />
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirm}
                        disabled={!selectionChanged || assigning || unassigning}
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

