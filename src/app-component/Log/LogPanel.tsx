import { useEffect, useState, type ReactNode } from "react";
import dayjs from "dayjs";
import { ChevronRight, Hash, Mail, RefreshCw, Tag, X, Workflow } from "lucide-react";
import { eventApi } from "@/store/api/eventApi";
import { useAppSelector } from "@/store/hooks";
import { toast } from "@/hooks/use-toast";
import { openExternalLink } from "@/lib/openExternalLink";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LIMIT = 20;

function formatPayload(raw: string | null | undefined): string {
    if (!raw) return "—";
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
}

export default function LogPanel() {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const [page, setPage] = useState(1);
    const [requestId, setRequestId] = useState("");
    const [requestUserEmail, setRequestUserEmail] = useState("");
    const [eventType, setEventType] = useState("");
    const [successFilter, setSuccessFilter] = useState<boolean | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
    const [selectedPayload, setSelectedPayload] = useState<string | null>(null);
    const [selectedFailureReason, setSelectedFailureReason] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const { data, isLoading, isFetching, refetch } = eventApi.endpoints.getEvents.useQuery(
        {
            page: page - 1,
            limit: LIMIT,
            requestId: requestId || undefined,
            success: successFilter,
            requestUserEmail: requestUserEmail || undefined,
            eventType: eventType || undefined,
            sortOrder,
        },
        { skip: backendPort === 0 }
    );

    const sortedEvents = [...(data?.events ?? [])].sort((a, b) => {
        if (!sortOrder) return 0;
        return sortOrder === "asc" ? a.eventOrder - b.eventOrder : b.eventOrder - a.eventOrder;
    });

    const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

    useEffect(() => {
        setPage(1);
    }, [requestId, successFilter, requestUserEmail, eventType]);

    useEffect(() => {
        if (data && page > totalPages) {
            setPage(1);
        }
    }, [data, page, totalPages]);

    function toggleSort() {
        setSortOrder((prev) => {
            if (prev === undefined) return "asc";
            if (prev === "asc") return "desc";
            return undefined;
        });
    }

    const hasActiveFilters =
        requestId !== "" ||
        requestUserEmail !== "" ||
        eventType !== "" ||
        successFilter !== undefined;

    function clearFilters() {
        setRequestId("");
        setRequestUserEmail("");
        setEventType("");
        setSuccessFilter(undefined);
    }

    function copy(text: string) {
        navigator.clipboard
            .writeText(text)
            .then(() => toast({ variant: "success", title: "Copied", duration: 1500 }));
    }

    function openEventStorming() {
        if (!backendPort) return;
        const url = `http://localhost:${backendPort}/command-visualization/index.html?url=/docs/commands`;
        openExternalLink(url).catch(() =>
            toast({ variant: "destructive", title: "Could not open the chart" })
        );
    }

    function toggleExpanded(id: number) {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const sortLabel = sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "";

    return (
        <div className="h-full flex flex-col bg-white dark:bg-neutral-800 border-l border-gray-200 dark:border-neutral-700">
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-neutral-700 flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-black dark:text-white">Event Log</h2>
                    <p className="text-sm text-gray-600 dark:text-neutral-400 italic mt-1">
                        Commands and events recorded by the application
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching || !backendPort}
                    title="Refresh events"
                    aria-label="Refresh events"
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-neutral-600 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer disabled:cursor-default bg-transparent"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="flex-shrink-0 px-3 py-3 border-b border-gray-200 dark:border-neutral-700 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-md border border-gray-300 dark:border-neutral-600 p-0.5">
                        {(
                            [
                                { label: "All", value: undefined },
                                { label: "Success", value: true },
                                { label: "Failed", value: false },
                            ] as const
                        ).map(({ label, value }) => {
                            const active = successFilter === value;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setSuccessFilter(value)}
                                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                        active
                                            ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                                            : "text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={openEventStorming}
                        disabled={!backendPort}
                        title="Open the event-storming chart"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-neutral-600 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer disabled:cursor-default whitespace-nowrap"
                    >
                        <Workflow className="w-3.5 h-3.5" />
                        Event-Storming
                    </button>
                </div>

                <FilterField
                    icon={<Hash className="w-3.5 h-3.5" />}
                    placeholder="Request ID"
                    value={requestId}
                    onChange={setRequestId}
                />
                <FilterField
                    icon={<Mail className="w-3.5 h-3.5" />}
                    placeholder="User"
                    value={requestUserEmail}
                    onChange={setRequestUserEmail}
                />
                <FilterField
                    icon={<Tag className="w-3.5 h-3.5" />}
                    placeholder="Event type"
                    value={eventType}
                    onChange={setEventType}
                />

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1 self-start px-2 py-1 text-xs text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100 cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear filters
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <p className="p-4 text-sm text-gray-500 dark:text-neutral-400">Loading...</p>
                ) : sortedEvents.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 dark:text-neutral-400">
                        No events recorded yet.
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-neutral-700">
                        {sortedEvents.map((event) => {
                            const expanded = expandedIds.has(event.id);
                            return (
                                <div key={event.id} className="px-3 py-2 flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpanded(event.id)}
                                        title={expanded ? "Collapse" : "Expand"}
                                        className="flex items-center gap-1.5 w-full text-left cursor-pointer bg-transparent hover:bg-transparent active:bg-transparent shadow-none"
                                    >
                                        <ChevronRight
                                            className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-neutral-500 transition-transform ${
                                                expanded ? "rotate-90" : ""
                                            }`}
                                        />
                                        <code className="font-mono text-xs text-gray-800 dark:text-neutral-100 bg-gray-100 dark:bg-neutral-700/70 border border-gray-200 dark:border-neutral-600 rounded px-1.5 py-0.5 truncate">
                                            {event.eventType}
                                        </code>
                                        <span
                                            className={`ml-auto flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                                event.success
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                            }`}
                                        >
                                            {event.success ? "Success" : "Failed"}
                                        </span>
                                    </button>

                                    {expanded && (
                                        <div className="pl-5 flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-neutral-400">
                                                <button
                                                    type="button"
                                                    onClick={toggleSort}
                                                    title="Sort this page by order"
                                                    className="tabular-nums hover:text-gray-800 dark:hover:text-neutral-100 cursor-pointer"
                                                >
                                                    #{event.eventOrder}
                                                    {sortLabel}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => copy(event.requestId)}
                                                    title="Click to copy request ID"
                                                    className="font-mono truncate hover:text-gray-800 dark:hover:text-neutral-100 cursor-pointer"
                                                >
                                                    {event.requestId}
                                                </button>
                                                <span className="ml-auto flex-shrink-0 whitespace-nowrap">
                                                    {event.createdAt
                                                        ? dayjs(event.createdAt).format(
                                                              "MM-DD HH:mm:ss"
                                                          )
                                                        : event.createdAtHk || "—"}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => copy(event.eventType)}
                                                title="Click to copy"
                                                className="text-left font-mono text-[11px] text-gray-500 dark:text-neutral-400 truncate hover:text-gray-800 dark:hover:text-neutral-100 cursor-pointer"
                                            >
                                                {event.eventType}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedPayload(event.payload)}
                                                title="View payload"
                                                className="text-left font-mono text-[11px] text-gray-500 dark:text-neutral-400 truncate hover:text-gray-800 dark:hover:text-neutral-100 cursor-pointer"
                                            >
                                                {event.payload || "—"}
                                            </button>

                                            {(event.requestUserEmail || event.failureReason) && (
                                                <div className="flex items-center gap-2 text-[11px]">
                                                    {event.requestUserEmail && (
                                                        <span className="text-gray-500 dark:text-neutral-400 truncate">
                                                            {event.requestUserEmail}
                                                        </span>
                                                    )}
                                                    {event.failureReason && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedFailureReason(
                                                                    event.failureReason
                                                                )
                                                            }
                                                            className="text-red-600 dark:text-red-400 truncate hover:underline cursor-pointer"
                                                        >
                                                            {event.failureReason}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {isFetching && !isLoading && (
                    <p className="px-3 py-1 text-[11px] text-gray-400 dark:text-neutral-500">
                        Refreshing...
                    </p>
                )}
            </div>

            <div className="flex-shrink-0 px-3 py-2 border-t border-gray-200 dark:border-neutral-700 flex items-center justify-between text-xs text-gray-600 dark:text-neutral-300">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
                >
                    Prev
                </button>
                <span className="tabular-nums">
                    {page} / {totalPages}
                    {data ? ` · ${data.total}` : ""}
                </span>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
                >
                    Next
                </button>
            </div>

            <TextDialog
                title="Payload"
                value={selectedPayload}
                onClose={() => setSelectedPayload(null)}
            />
            <TextDialog
                title="Failure reason"
                value={selectedFailureReason}
                onClose={() => setSelectedFailureReason(null)}
            />
        </div>
    );
}

function FilterField({
    icon,
    placeholder,
    value,
    onChange,
}: {
    icon: ReactNode;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="relative flex items-center">
            <span className="absolute left-2 text-gray-400 dark:text-neutral-500 pointer-events-none">
                {icon}
            </span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-7 w-full rounded-md border border-gray-300 bg-white pl-7 pr-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-400"
            />
        </div>
    );
}

function TextDialog({
    title,
    value,
    onClose,
}: {
    title: string;
    value: string | null;
    onClose: () => void;
}) {
    return (
        <Dialog open={value !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl dark:bg-neutral-800 dark:border-neutral-700">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{title}</DialogTitle>
                </DialogHeader>
                <pre className="text-xs font-mono text-gray-800 dark:text-neutral-100 bg-gray-50 dark:bg-neutral-900 p-4 rounded-md overflow-auto max-h-[65vh] whitespace-pre-wrap break-all border border-gray-200 dark:border-neutral-700">
                    {formatPayload(value)}
                </pre>
            </DialogContent>
        </Dialog>
    );
}
