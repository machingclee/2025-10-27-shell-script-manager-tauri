import { useState } from "react";
import { Folder, FolderInput, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tagApi, type TagDTO } from "@/store/api/tagApi";
import { useAppSelector } from "@/store/hooks";
import { matchesTagFilter } from "@/lib/tagFilter";
import { useTagSelection } from "./tagSelection";

const inputClass =
    "bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white";

export default function TagsColumn() {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { selectedId, tagFilter } = useTagSelection();
    const searchingAll = tagFilter.trim().length > 0;
    const { data: tags = [], isLoading } = tagApi.endpoints.getAllTags.useQuery(undefined, {
        skip: !backendPort,
    });
    const { data: folders = [] } = tagApi.endpoints.getAllTagFolders.useQuery(undefined, {
        skip: !backendPort,
    });
    const [createTag] = tagApi.endpoints.createTag.useMutation();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [tagName, setTagName] = useState("");

    const folderId = typeof selectedId === "number" ? selectedId : null;
    const folderName =
        selectedId == null
            ? ""
            : selectedId === "ungrouped"
              ? "Ungrouped"
              : (folders.find((folder) => folder.id === selectedId)?.name ?? "Folder");
    const folderTags = searchingAll
        ? tags
        : selectedId == null
          ? []
          : tags.filter((tag) =>
                folderId == null ? tag.tagFolderId == null : tag.tagFolderId === folderId
            );
    const visibleTags = folderTags.filter((tag) => matchesTagFilter(tag.name, tagFilter));

    async function handleCreate() {
        const name = tagName.trim();
        if (!name) return;
        try {
            await createTag({ name, tagFolderId: folderId }).unwrap();
            setTagName("");
            setIsAddOpen(false);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden dark:text-white">
            <div className="flex flex-shrink-0 items-center justify-end border-b border-gray-200 px-2 py-1.5 dark:border-neutral-700">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-md border-0 bg-white p-1 !shadow-none hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                    onClick={() => {
                        setTagName("");
                        setIsAddOpen(true);
                    }}
                    title={`Add a tag to ${folderName}`}
                >
                    <Plus className="h-4 w-4" />
                    Tag
                </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading && <p className="p-3 text-sm text-neutral-500">Loading...</p>}
                {!isLoading && visibleTags.length === 0 && (
                    <p className="p-3 text-sm text-neutral-500">
                        {searchingAll ? "No matching tags." : `No tags in ${folderName}.`}
                    </p>
                )}
                {visibleTags.map((tag) => (
                    <TagCard key={tag.id} tag={tag} />
                ))}
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Add Tag to "{folderName}"</DialogTitle>
                        <DialogDescription>Create a new tag inside this folder.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-tag-name">Name</Label>
                            <Input
                                id="new-tag-name"
                                className={inputClass}
                                value={tagName}
                                onChange={(e) => setTagName(e.target.value)}
                                placeholder="Tag name"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && tagName.trim()) handleCreate();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={!tagName.trim()}>
                            Create Tag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TagCard({ tag }: { tag: TagDTO }) {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { data: folders = [] } = tagApi.endpoints.getAllTagFolders.useQuery(undefined, {
        skip: !backendPort,
    });
    const [updateTag] = tagApi.endpoints.updateTag.useMutation();
    const [deleteTag] = tagApi.endpoints.deleteTag.useMutation();
    const [pressed, setPressed] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [name, setName] = useState(tag.name);

    async function saveName() {
        const next = name.trim();
        if (!next) return;
        try {
            await updateTag({ id: tag.id, name: next, tagFolderId: tag.tagFolderId }).unwrap();
            setIsRenameOpen(false);
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    function moveTo(tagFolderId: number | null) {
        if (tagFolderId === tag.tagFolderId) return;
        updateTag({ id: tag.id, name: tag.name, tagFolderId });
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-none px-3 py-2 text-left text-sm select-none ${
                        pressed
                            ? "bg-gray-200 dark:bg-neutral-600"
                            : "hover:bg-gray-100 dark:hover:bg-neutral-700"
                    }`}
                    onMouseDown={() => setPressed(true)}
                    onMouseUp={() => setPressed(false)}
                    onMouseLeave={() => setPressed(false)}
                    onDoubleClick={() => {
                        setName(tag.name);
                        setIsRenameOpen(true);
                    }}
                >
                    <Tag className="h-4 w-4 flex-shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                <ContextMenuItem
                    onClick={() => {
                        setName(tag.name);
                        setIsRenameOpen(true);
                    }}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                </ContextMenuItem>
                <ContextMenuSub>
                    <ContextMenuSubTrigger className="cursor-pointer dark:hover:bg-neutral-700 dark:focus:bg-neutral-700">
                        <FolderInput className="w-4 h-4 mr-2" />
                        Move to folder
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                        <ContextMenuItem
                            disabled={tag.tagFolderId == null}
                            onClick={() => moveTo(null)}
                            className="cursor-pointer dark:hover:bg-neutral-700"
                        >
                            <Tag className="w-4 h-4 mr-2" />
                            Ungrouped
                        </ContextMenuItem>
                        {folders.length > 0 && <ContextMenuSeparator className="dark:bg-neutral-700" />}
                        {folders.map((folder) => (
                            <ContextMenuItem
                                key={folder.id}
                                disabled={tag.tagFolderId === folder.id}
                                onClick={() => moveTo(folder.id)}
                                className="cursor-pointer dark:hover:bg-neutral-700"
                            >
                                <Folder className="w-4 h-4 mr-2" />
                                {folder.name}
                            </ContextMenuItem>
                        ))}
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator className="dark:bg-neutral-700" />
                <ContextMenuItem
                    onClick={() => setIsDeleteOpen(true)}
                    className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Rename Tag</DialogTitle>
                        <DialogDescription>Enter a new name for "{tag.name}".</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor={`tag-name-${tag.id}`}>Name</Label>
                            <Input
                                id={`tag-name-${tag.id}`}
                                className={inputClass}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && name.trim()) saveName();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveName} disabled={!name.trim()}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{tag.name}"? It is removed from every
                            script. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTag(tag.id)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ContextMenu>
    );
}
