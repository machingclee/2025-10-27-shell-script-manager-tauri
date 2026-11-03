import { X } from "lucide-react";

export default function AssignedTagBadge({
    name,
    onRemove,
}: {
    name: string;
    onRemove?: () => void;
}) {
    return (
        <span className="inline-flex items-stretch overflow-hidden rounded-sm border border-black/15 bg-gray-600 text-xs font-mono font-medium text-white dark:border-white/15 dark:bg-neutral-600">
            <span className="flex items-center bg-black/25 px-1.5 dark:bg-black/30">
                <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-neutral-950 ring-1 ring-white/40"
                />
            </span>
            <span className="flex items-center px-2 py-1.5 [word-spacing:-0.15em]">{name}</span>
            {onRemove && (
                <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={onRemove}
                    className="flex items-center border-0 bg-transparent px-1.5 text-white/80 shadow-none hover:bg-black/20 hover:text-white"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </span>
    );
}
