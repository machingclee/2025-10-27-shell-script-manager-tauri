import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tagApi } from "@/store/api/tagApi";
import SortableTagFolderList, {
    TagFolderPickerRow,
} from "@/app-component/Tag/SortableTagFolderList";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setOpenPopover } from "@/store/slices/appSlice";
import { matchesTagFilter } from "@/lib/tagFilter";
import { fadePopoverClass, useFadePresence } from "@/lib/useFadePresence";

type FolderSelection = number | "ungrouped";

export default function SearchByTagsDropdown({
    anchorRef,
    initialTagIds,
    onConfirm,
}: {
    anchorRef: React.RefObject<HTMLElement | null>;
    initialTagIds: number[];
    onConfirm: (tagIds: number[]) => void;
}) {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const open = useAppSelector((s) => s.app.openPopover === "search-by-tags");
    const { mounted, visible } = useFadePresence(open);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelBox, setPanelBox] = useState({ top: 0, right: 0 });
    const [folderId, setFolderId] = useState<FolderSelection>("ungrouped");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [tagFilter, setTagFilter] = useState("");
    const { data: tags = [], isLoading: tagsLoading } = tagApi.endpoints.getAllTags.useQuery(
        undefined,
        { skip: !open || !backendPort }
    );
    const { data: folders = [], isLoading: foldersLoading } =
        tagApi.endpoints.getAllTagFolders.useQuery(undefined, { skip: !open || !backendPort });

    const prepared = useRef(false);
    useEffect(() => {
        if (!open) {
            prepared.current = false;
            setTagFilter("");
            return;
        }
        if (foldersLoading || prepared.current) return;
        prepared.current = true;
        setSelectedIds(initialTagIds);
        setFolderId(folders[0]?.id ?? "ungrouped");
    }, [open, foldersLoading, folders, initialTagIds]);

    useLayoutEffect(() => {
        if (!open) return;
        function place() {
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPanelBox({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
        }
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
    }, [open, anchorRef]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: MouseEvent) {
            const target = event.target as Node;
            if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            dispatch(setOpenPopover(null));
        }
        document.addEventListener("mousedown", onPointerDown, true);
        return () => document.removeEventListener("mousedown", onPointerDown, true);
    }, [open, dispatch, anchorRef]);

    const searchingAll = tagFilter.trim().length > 0;
    const folderTags = searchingAll
        ? tags
        : tags.filter((tag) =>
              folderId === "ungrouped" ? tag.tagFolderId == null : tag.tagFolderId === folderId
          );
    const visibleTags = folderTags.filter((tag) => matchesTagFilter(tag.name, tagFilter));
    const loading = tagsLoading || foldersLoading;
    const selectedTags = selectedIds.flatMap((id) => {
        const tag = tags.find((item) => item.id === id);
        return tag ? [tag] : [];
    });

    function selectFolder(id: FolderSelection) {
        setTagFilter("");
        setFolderId(id);
    }

    function addTag(tagId: number) {
        setSelectedIds([tagId]);
    }

    function removeTag(tagId: number) {
        setSelectedIds((current) => current.filter((id) => id !== tagId));
    }

    if (!mounted) return null;

    return createPortal(
                    <div
                        ref={panelRef}
                        className={`fixed z-[10000] flex w-[36rem] max-h-[70vh] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-black shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-white ${fadePopoverClass(visible)}`}
                        style={{ top: panelBox.top, right: panelBox.right }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 dark:border-neutral-700">
                            <p className="text-sm font-semibold">Search by Tags</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                                Choose a folder and select one tag, then confirm.
                            </p>
                            <div className="relative mt-3">
                                <Input
                                    className="h-8 bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] pr-7 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
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
                        </div>
                        {loading ? (
                            <p className="p-4 text-sm text-neutral-500">Loading...</p>
                        ) : tags.length === 0 && folders.length === 0 ? (
                            <p className="p-4 text-sm text-neutral-500">
                                No tags yet. Create them from Tags.
                            </p>
                        ) : (
                            <div className="grid h-80 grid-cols-2 overflow-hidden">
                                <div className="min-h-0 space-y-1 overflow-y-auto border-r border-gray-200 p-2 dark:border-neutral-700">
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
                                <div className="min-h-0 overflow-y-auto">
                                    {visibleTags.length === 0 ? (
                                        <p className="p-3 text-sm text-neutral-500">
                                            {searchingAll
                                                ? "No matching tags."
                                                : "No tags in this folder."}
                                        </p>
                                    ) : (
                                            visibleTags.map((tag) => {
                                                const selected = selectedIds.includes(tag.id);
                                                return (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => addTag(tag.id)}
                                                    className={`flex w-full cursor-pointer items-center gap-2 rounded-none px-3 py-2 text-left text-sm ${
                                                        selected
                                                            ? "bg-gray-200 dark:bg-neutral-600"
                                                            : "hover:bg-gray-100 dark:hover:bg-neutral-700"
                                                    }`}
                                                >
                                                    <Tag className="h-4 w-4 flex-shrink-0" />
                                                    <span className="flex-1 truncate">{tag.name}</span>
                                                </button>
                                                );
                                            })
                                        )}
                                </div>
                            </div>
                        )}
                        {selectedTags.length > 0 && (
                            <div className="flex flex-shrink-0 flex-wrap gap-1.5 border-t border-gray-200 p-3 dark:border-neutral-700">
                                {selectedTags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center gap-1 rounded-sm bg-gray-600 px-2 py-1 text-sm text-white dark:bg-neutral-500"
                                    >
                                        <Tag className="h-3.5 w-3.5" />
                                        <span>{tag.name}</span>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${tag.name}`}
                                            onClick={() => removeTag(tag.id)}
                                            className="ml-1 text-white/80 hover:text-white"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 p-3 dark:border-neutral-700">
                            <Button variant="outline" onClick={() => dispatch(setOpenPopover(null))}>
                                Cancel
                            </Button>
                            <Button
                                disabled={selectedIds.length === 0}
                                onClick={() => {
                                    onConfirm(selectedIds);
                                    dispatch(setOpenPopover(null));
                                }}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>,
        document.body
    );
}
