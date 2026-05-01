import { useEffect, useRef } from "react";
import debounce from "lodash/debounce";
import { scriptApi } from "@/store/api/scriptApi";
import GenericScriptItem from "../ScriptsColumn/GenericScriptItem";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchPage } from "@/store/slices/appSlice";
import clsx from "clsx";

const PAGE_SIZE = 10;

export default function SearchPanel() {
    const dispatch = useAppDispatch();
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const search = useAppSelector((s) => s.app.rightPanel.search.searchText);
    const page = useAppSelector((s) => s.app.rightPanel.search.searchPage);

    const [triggerSearch, { data: results, isFetching: isSearching }] =
        scriptApi.endpoints.searchScript.useLazyQuery();

    const debouncedSearch = useRef(
        debounce((params: { search: string; page: number; size: number }) => {
            triggerSearch(params);
        }, 400)
    ).current;

    useEffect(() => {
        return () => debouncedSearch.cancel();
    }, [debouncedSearch]);

    useEffect(() => {
        if (backendPort === 0) return;
        if (!search.trim()) return;
        debouncedSearch({ search, page, size: PAGE_SIZE });
    }, [search, page, backendPort]);

    const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;

    const previewContent = (command: string): string => {
        const lines = command.split("\n").slice(0, 3).join("\n");
        return lines.length > 150 ? lines.slice(0, 150) + "…" : lines || "(empty)";
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-neutral-800 border-l border-gray-200 dark:border-neutral-700">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-neutral-700">
                <h2 className="text-lg font-semibold text-black dark:text-white">Search Results</h2>
                <p className="text-sm text-gray-600 dark:text-neutral-400 italic mt-1 flex items-center gap-1.5">
                    {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                    {isSearching
                        ? "Searching…"
                        : results
                          ? `${results.total} result${results.total !== 1 ? "s" : ""} for "${search}"`
                          : `Searching for "${search}"`}
                </p>
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
                            <GenericScriptItem
                                script={script}
                                parentFolderId={0}
                                historyVersion={true}
                                liteVersionDisplay={
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
