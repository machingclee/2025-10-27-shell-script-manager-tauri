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
import { useTagSelection } from "./tagSelection";

const inputClass =
    "bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white";

export default function TagsColumn() {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { selectedId } = useTagSelection();
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
    const visibleTags =
        selectedId == null
            ? []
            : tags.filter((tag) =>
                  folderId == null ? tag.tagFolderId == null : tag.tagFolderId === folderId
              );

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
        <div className="flex flex-col h-full dark:text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 p-4" />
                <div className="flex items-center gap-2 mr-4">
                    <Button
                        variant="ghost"
                        className="bg-white p-1 mt-[6px] mb-[7px] h-8 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                        onClick={() => {
                            setTagName("");
                            setIsAddOpen(true);
                        }}
                        title={`Add a tag to ${folderName}`}
                    >
                        <Plus className="!w-3 !h-3" /> Tag
                    </Button>
                </div>
            </div>
            <div className="h-[3px] bg-gray-400 dark:bg-neutral-700/70" />
            <div className="space-y-2 p-4 overflow-y-auto flex-1 min-h-[400px] bg-gray-50 dark:bg-neutral-800">
                {isLoading && <div>Loading...</div>}
                {!isLoading && visibleTags.length === 0 && (
                    <div className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">
                        No tags in {folderName}.
                    </div>
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
                    className={`px-3 py-2 rounded-md border transition-colors cursor-pointer w-full overflow-hidden select-none ${
                        pressed
                            ? "bg-gray-200 border-gray-400 dark:bg-[rgba(0,0,0,0.2)] dark:border-neutral-500"
                            : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] dark:border-neutral-600 dark:hover:bg-[rgba(255,255,255,0.2)]"
                    }`}
                    onMouseDown={() => setPressed(true)}
                    onMouseUp={() => setPressed(false)}
                    onMouseLeave={() => setPressed(false)}
                    onDoubleClick={() => {
                        setName(tag.name);
                        setIsRenameOpen(true);
                    }}
                >
                    <div className="flex items-center gap-2 min-w-0 py-2">
                        <Tag className="w-7 h-7 flex-shrink-0 text-green-500 dark:text-green-400" />
                        <div className="font-bold text-lg break-words min-w-0">{tag.name}</div>
                    </div>
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
