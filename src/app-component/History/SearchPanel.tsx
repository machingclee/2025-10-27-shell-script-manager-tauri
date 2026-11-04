import { useEffect, useState } from "react";
import debounce from "lodash/debounce";
import { scriptApi } from "@/store/api/scriptApi";
import { tagApi } from "@/store/api/tagApi";
import SearchResultItem from "./SearchResultItem";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetTagSearch, setRightPanelMode, setSearchPage, setSearchTagIds } from "@/store/slices/appSlice";
import { openHistory } from "@/store/slices/historySlice";
import AssignedTagBadge from "@/lib/AssignedTagBadge";
import clsx from "clsx";

const PAGE_SIZE = 10;

export default function SearchPanel() {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const search = useAppSelector((s) => s.app.rightPanel.search.searchText);
    const searchMode = useAppSelector((s) => s.app.rightPanel.search.mode);
    const tagIds = useAppSelector((s) => s.app.rightPanel.search.tagIds);
    const page = useAppSelector((s) => s.app.rightPanel.search.searchPage);

    const [queryText, setQueryText] = useState("");

    useEffect(() => {
        const update = debounce((value: string) => setQueryText(value.trim()), 400);
        update(search);
        return () => update.cancel();
    }, [search]);

    // A subscribed query, unlike useLazyQuery, stays subscribed after the request
    // settles — so invalidating SearchResults (on script execution) refetches it.
    const { currentData, isFetching: isContentSearching, originalArgs } =
        scriptApi.endpoints.searchScript.useQuery(
            { search: queryText, page, size: PAGE_SIZE },
            { skip: backendPort === 0 || searchMode !== "content" || !queryText }
        );
    const { currentData: tagResults, isFetching: isTagSearching } =
        scriptApi.endpoints.searchScriptsByTags.useQuery(
            { tagIds, page, size: PAGE_SIZE },
            { skip: backendPort === 0 || searchMode !== "tags" || tagIds.length === 0 }
        );
    const { data: tags = [] } = tagApi.endpoints.getAllTags.useQuery(undefined, {
        skip: backendPort === 0 || searchMode !== "tags",
    });

    // Keep showing the settled query's results while the next one is still debouncing.
    const contentResults = originalArgs?.search === queryText ? currentData : undefined;
    const results = searchMode === "tags" ? tagResults : contentResults;
    const isSearching = searchMode === "tags" ? isTagSearching : isContentSearching;
    const selectedTags = tagIds.flatMap((id) => {
        const tag = tags.find((item) => item.id === id);
        return tag ? [tag] : [];
    });

    const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;

    const removeSearchTag = (tagId: number) => {
        const next = tagIds.filter((id) => id !== tagId);
        if (next.length > 0) {
            dispatch(setSearchTagIds(next));
            return;
        }
        dispatch(resetTagSearch());
        dispatch(openHistory());
        dispatch(setRightPanelMode(search.trim() ? "SEARCH" : "HISTORY"));
    };

    const previewContent = (command: string): string => {
        const lines = command.split("\n").slice(0, 3).join("\n");
        return lines.length > 150 ? lines.slice(0, 150) + "…" : lines || "(empty)";
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-neutral-800">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-neutral-700">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-black dark:text-white">Search Results</h2>
                    {searchMode === "tags" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                dispatch(resetTagSearch());
                                dispatch(openHistory());
                                dispatch(setRightPanelMode(search.trim() ? "SEARCH" : "HISTORY"));
                            }}
                        >
                            Reset
                        </Button>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-600 dark:text-neutral-400">
                    {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                    {searchMode === "tags" ? (
                        <>
                            <span className="italic">
                                {isSearching
                                    ? "Searching…"
                                    : results
                                      ? `${results.total} result${results.total !== 1 ? "s" : ""} for any of`
                                      : "Searching by tags…"}
                            </span>
                            {selectedTags.map((tag) => (
                                <AssignedTagBadge
                                    key={tag.id}
                                    name={tag.name}
                                    onRemove={() => removeSearchTag(tag.id)}
                                />
                            ))}
                            {selectedTags.length === 0 && (
                                <span className="italic">{tagIds.length} tags</span>
                            )}
                        </>
                    ) : isSearching ? (
                        <span className="italic">Searching…</span>
                    ) : (
                        <span className="italic">
                            {results
                                ? `${results.total} result${results.total !== 1 ? "s" : ""} for "${search}"`
                                : `Searching for "${search}"`}
                        </span>
                    )}
                </div>
            </div>

            {/* Pagination — shown above results */}
            {results && results.total > 0 && (
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-neutral-700 bg-neutral-700/40">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => dispatch(setSearchPage(page - 1))}
                        className={clsx("dark:text-white dark:hover:bg-neutral-700", {
                            "!opacity-20 cursor-not-allowed": page === 0,
                        })}
                    >
                        <ChevronLeft className="!w-5 !h-5" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-neutral-400">
                        Page {page + 1} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => dispatch(setSearchPage(page + 1))}
                        className={clsx("dark:text-white dark:hover:bg-neutral-700", {
                            "!opacity-20 cursor-not-allowed": page >= totalPages - 1,
                        })}
                    >
                        <ChevronRight className="!w-5 !h-5" />
                    </Button>
                </div>
            )}

            {/* Results list */}
            <div className="flex-1 overflow-y-auto p-4">
                {isSearching && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-neutral-500" />
                    </div>
                )}
                {!isSearching && results?.scripts.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">No results found.</p>
                )}
                <div className="space-y-3" key={page}>
                    {results?.scripts.map((script, index) => (
                        <div
                            key={script.id}
                            className="animate-search-item"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <SearchResultItem
                                script={script}
                                rootFolderId={script.parentFolderId}
                                preview={
                                    <div className="mt-1 border border-black/10 text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded-md dark:text-neutral-300 dark:bg-black/10 dark:border-white/10 max-h-16 overflow-hidden break-all whitespace-pre-wrap w-full">
                                        {previewContent(script.command)}
                                    </div>
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
