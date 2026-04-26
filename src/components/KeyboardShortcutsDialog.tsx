import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShortcutRow {
    keys: string[];
    description: string;
}

interface ShortcutSection {
    title: string;
    rows: ShortcutRow[];
}

const SECTIONS: ShortcutSection[] = [
    {
        title: "Global",
        rows: [
            { keys: ["⌘", "⌥", "I"], description: "Open DevTools" },
        ],
    },
    {
        title: "Markdown Editor",
        rows: [
            { keys: ["⌘", "S"], description: "Save" },
            { keys: ["⌘", "W"], description: "Close / Dismiss" },
            { keys: ["⌘", "F"], description: "Find in document" },
            { keys: ["⌘", "B"], description: "Toggle Mixed / Preview mode" },
            { keys: ["⌘", "D"], description: "Edit all occurrences of selection" },
            { keys: ["⌘", "="], description: "Zoom In" },
            { keys: ["⌘", "−"], description: "Zoom Out" },
            { keys: ["⌘", "0"], description: "Reset Zoom" },
            { keys: ["⌘", "Z"], description: "Undo" },
            { keys: ["⌘", "⇧", "Z"], description: "Redo" },
            { keys: ["⌘", "]"], description: "Indent line" },
            { keys: ["⌘", "["], description: "Dedent line" },
            { keys: ["⌥", "←"], description: "Back (cursor history)" },
            { keys: ["⌥", "→"], description: "Forward (cursor history)" },
        ],
    },
    {
        title: "Presentation Mode",
        rows: [
            { keys: ["Enter"], description: "Advance to next section" },
            { keys: ["Esc"], description: "Exit presentation mode" },
        ],
    },
];

function KeyBadge({ label }: { label: string }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-xs font-mono font-medium rounded border border-neutral-500 bg-neutral-700 text-neutral-200 shadow-sm">
            {label}
        </kbd>
    );
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsDialog({ open, onClose }: Props) {
    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) onClose();
            }}
        >
            <DialogContent className="max-w-lg bg-neutral-900 text-white border-neutral-700">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg">Keyboard Shortcuts</DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                    {SECTIONS.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
                                {section.title}
                            </h3>
                            <div className="divide-y divide-neutral-800 rounded-md overflow-hidden border border-neutral-800">
                                {section.rows.map((row) => (
                                    <div
                                        key={row.description}
                                        className="flex items-center justify-between px-3 py-2 text-sm"
                                    >
                                        <span className="text-neutral-200">{row.description}</span>
                                        <span className="flex items-center gap-0.5 ml-4 flex-shrink-0">
                                            {row.keys.map((k, i) => (
                                                <KeyBadge key={i} label={k} />
                                            ))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
