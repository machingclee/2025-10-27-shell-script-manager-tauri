import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tag } from "lucide-react";
import { tagApi } from "@/store/api/tagApi";
import { useAppSelector } from "@/store/hooks";
import { matchesTagFilter } from "@/lib/tagFilter";

export const TAGS_COMMAND = "/tags";

/** True while the draft is a prefix of the /tags command, including "/tags" itself. */
export function isTagsCommandPrefix(value: string): boolean {
    const query = value.trim().toLowerCase();
    return query.startsWith("/") && TAGS_COMMAND.startsWith(query);
}

export type SearchTagSuggestionsHandle = {
    /** Highlight the next option. Focus stays in the text field. */
    selectNext: () => boolean;
    /** Highlight the previous option, or clear the highlight on the first one. */
    selectPrevious: () => boolean;
    /** Move the highlight up, starting at the last option when nothing is highlighted. */
    selectUp: () => boolean;
    /** Activate the highlighted option. Returns false when nothing is highlighted. */
    chooseActive: () => boolean;
    contains: (node: Node | null) => boolean;
    hasOption: () => boolean;
};

type SuggestionOption = { kind: "command" } | { kind: "tag"; id: number };

const optionClass =
    "flex w-full items-center gap-2 rounded-none px-3 py-2 text-left text-sm outline-none hover:bg-gray-100 dark:hover:bg-neutral-700";

const SearchTagSuggestions = forwardRef<
    SearchTagSuggestionsHandle,
    {
        anchorRef: React.RefObject<HTMLElement | null>;
        query: string;
        open: boolean;
        onPickTag: (tagId: number) => void;
        onPickCommand: () => void;
        onClose: () => void;
    }
>(function SearchTagSuggestions({ anchorRef, query, open, onPickTag, onPickCommand, onClose }, ref) {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const panelRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ top: 0, left: 0, width: 0 });
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    // The imperative handle is created once. Tab updates this ref immediately,
    // so Enter reads the highlighted row even before the next render.
    const activeIndexRef = useRef<number | null>(null);
    const optionsRef = useRef<SuggestionOption[]>([]);
    const onPickTagRef = useRef(onPickTag);
    const onPickCommandRef = useRef(onPickCommand);
    const { data: tags = [] } = tagApi.endpoints.getAllTags.useQuery(undefined, {
        skip: !open || !backendPort,
    });
    const showCommand = isTagsCommandPrefix(query);
    const matches = tags.filter((tag) => matchesTagFilter(tag.name, query));
    const options: SuggestionOption[] = [
        ...(showCommand ? [{ kind: "command" as const }] : []),
        ...matches.map((tag) => ({ kind: "tag" as const, id: tag.id })),
    ];
    optionsRef.current = options;
    onPickTagRef.current = onPickTag;
    onPickCommandRef.current = onPickCommand;

    const [trackedQuery, setTrackedQuery] = useState(query);
    const [trackedOpen, setTrackedOpen] = useState(open);
    if (trackedQuery !== query || trackedOpen !== open) {
        setTrackedQuery(query);
        setTrackedOpen(open);
        activeIndexRef.current = null;
        if (activeIndex !== null) setActiveIndex(null);
    } else {
        activeIndexRef.current = activeIndex;
    }

    useEffect(() => {
        if (activeIndex == null) return;
        panelRef.current
            ?.querySelector(`[data-option-index="${activeIndex}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    useImperativeHandle(
        ref,
        () => ({
            selectNext() {
                const count = optionsRef.current.length;
                if (count === 0) return false;
                const current = activeIndexRef.current;
                const next = current == null ? 0 : Math.min(current + 1, count - 1);
                activeIndexRef.current = next;
                setActiveIndex(next);
                return true;
            },
            selectPrevious() {
                const current = activeIndexRef.current;
                if (current == null) return false;
                const next = current === 0 ? null : current - 1;
                activeIndexRef.current = next;
                setActiveIndex(next);
                return true;
            },
            selectUp() {
                const count = optionsRef.current.length;
                if (count === 0) return false;
                const current = activeIndexRef.current;
                const next = current == null ? count - 1 : Math.max(current - 1, 0);
                activeIndexRef.current = next;
                setActiveIndex(next);
                return true;
            },
            chooseActive() {
                const index = activeIndexRef.current;
                if (index == null) return false;
                const option = optionsRef.current[index];
                if (!option) return false;
                if (option.kind === "command") onPickCommandRef.current();
                else onPickTagRef.current(option.id);
                return true;
            },
            contains(node) {
                return !!node && !!panelRef.current?.contains(node);
            },
            hasOption() {
                return optionsRef.current.length > 0;
            },
        }),
        []
    );

    function optionClassName(index: number, extra = "") {
        return `${optionClass} ${extra} ${
            index === activeIndex ? "bg-gray-100 dark:bg-neutral-700" : ""
        }`;
    }

    useLayoutEffect(() => {
        if (!open) return;
        function place() {
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;
            setBox({ top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 288) });
        }
        place();
        const anchor = anchorRef.current;
        const observer = anchor ? new ResizeObserver(place) : null;
        if (anchor) observer?.observe(anchor);
        window.addEventListener("resize", place);
        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", place);
        };
    }, [open, anchorRef, query]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: MouseEvent) {
            const target = event.target as Node;
            if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            onClose();
        }
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, anchorRef, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            ref={panelRef}
            className="fixed z-[10000] flex max-h-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-black shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            style={{ top: box.top, left: box.left, width: box.width }}
            onMouseDown={(event) => event.preventDefault()}
        >
            {showCommand && (
                <button
                    type="button"
                    tabIndex={-1}
                    data-option-index={0}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        onPickCommand();
                    }}
                    className={optionClassName(0, "border-b border-gray-200 dark:border-neutral-700")}
                >
                    <span className="font-medium">
                        {TAGS_COMMAND.slice(0, query.trim().length)}
                        <span className="text-neutral-400">
                            {TAGS_COMMAND.slice(query.trim().length)}
                        </span>
                    </span>
                    <span className="truncate text-neutral-500 dark:text-neutral-400">
                        More refined tag search
                    </span>
                </button>
            )}
            <div className="min-h-0 overflow-y-auto">
                {matches.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-neutral-500">No matching tags.</p>
                ) : (
                    matches.map((tag, index) => {
                        const optionIndex = (showCommand ? 1 : 0) + index;
                        return (
                        <button
                            key={tag.id}
                            type="button"
                            tabIndex={-1}
                            data-option-index={optionIndex}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                onPickTag(tag.id);
                            }}
                            className={optionClassName(optionIndex)}
                        >
                            <Tag className="h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                        </button>
                        );
                    })
                )}
            </div>
        </div>,
        document.body
    );
});

export default SearchTagSuggestions;
