import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setOpenPopover, toggleOpenPopover } from "@/store/slices/appSlice";
import TagFolderColumn from "./TagFolderColumn";
import TagsColumn from "./TagsColumn";
import { useTagSelection } from "./tagSelection";

export default function TagButton() {
    const dispatch = useAppDispatch();
    const open = useAppSelector((s) => s.app.openPopover === "tags");
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelBox, setPanelBox] = useState({ top: 0, right: 0 });
    const { tagFilter, setTagFilter } = useTagSelection();

    useEffect(() => {
        if (!open) setTagFilter("");
    }, [open, setTagFilter]);

    useLayoutEffect(() => {
        if (!open) return;
        function place() {
            const rect = rootRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPanelBox({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
        }
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            if (
                target.closest(
                    "[role='menu'], [role='menuitem'], [role='dialog'], [role='alertdialog']"
                )
            ) {
                return;
            }
            if (
                document.querySelector(
                    "[role='dialog'][data-state='open'], [role='alertdialog'][data-state='open']"
                )
            ) {
                return;
            }
            dispatch(setOpenPopover(null));
        }
        document.addEventListener("mousedown", onPointerDown, true);
        return () => document.removeEventListener("mousedown", onPointerDown, true);
    }, [open, dispatch]);

    return (
        <div
            ref={rootRef}
            className="relative"
            style={{ opacity: open ? 1 : 0.3, transition: "opacity 0.2s ease" }}
            onMouseDown={(event) => event.stopPropagation()}
        >
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 bg-white p-1 rounded-md border-0 !shadow-none hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                onClick={() => dispatch(toggleOpenPopover("tags"))}
                title="Manage tags"
            >
                <Tag className="w-4 h-4" />
                Tags
            </Button>
            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        className="fixed z-[10000] flex w-[36rem] max-h-[70vh] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-black shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                        style={{ top: panelBox.top, right: panelBox.right }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 dark:border-neutral-700">
                            <p className="text-sm font-semibold">Tags</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                                Choose a folder, or search every tag.
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
                        <div className="grid h-80 grid-cols-2 overflow-hidden">
                            <div className="min-h-0 overflow-hidden border-r border-gray-200 dark:border-neutral-700">
                                <TagFolderColumn />
                            </div>
                            <div className="min-h-0 overflow-hidden">
                                <TagsColumn />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
