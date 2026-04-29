import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useAppSelector } from "@/store/hooks";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function UnsavedChangesDialog() {
    const [open, setOpen] = useState(false);
    const [unsavedNames, setUnsavedNames] = useState<string[]>([]);

    const tabs = useAppSelector((s) => s.app.tab.tabs);
    const tabStates = useAppSelector((s) => s.app.tab.tabStates);

    useEffect(() => {
        const unlisten = listen("check-unsaved-changes", () => {
            const unsaved = tabs
                .filter((t) => t.type === "markdown" && tabStates[t.scriptId]?.hasChanges === true)
                .map((t) => (t.type === "markdown" ? t.scriptName : ""));

            if (unsaved.length === 0) {
                // Nothing unsaved — proceed immediately
                invoke("confirm_close").catch(console.error);
            } else {
                setUnsavedNames(unsaved);
                setOpen(true);
            }
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [tabs, tabStates]);

    const handleCloseAnyway = () => {
        setOpen(false);
        invoke("confirm_close").catch(console.error);
    };

    const handleStay = () => {
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent
                className="dark:bg-neutral-800 dark:border-neutral-700"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="dark:text-white">Unsaved Changes</DialogTitle>
                    <DialogDescription className="dark:text-neutral-400">
                        The following tabs have unsaved changes and will be lost:
                    </DialogDescription>
                </DialogHeader>

                <ul className="my-2 space-y-1 max-h-60 overflow-y-auto">
                    {unsavedNames.map((name, i) => (
                        <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200"
                        >
                            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                            {name}
                        </li>
                    ))}
                </ul>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleStay}
                        className="dark:border-neutral-500 dark:text-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                    >
                        Stay
                    </Button>
                    <Button
                        onClick={handleCloseAnyway}
                        className="bg-red-400/50 text-white hover:bg-red-400/70"
                    >
                        Close Anyway
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
