import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeHistory, openHistory } from "@/store/slices/historySlice";
import { scriptApi } from "@/store/api/scriptApi";
import ScriptItem from "../ScriptsColumn/ScriptItem";

export default function HistoryButton() {
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector((state) => state.history.isOpen);
    const { data: history } = scriptApi.endpoints.getScriptHistory.useQuery(undefined, {
        skip: !isOpen,
    });
    // Placeholder history data

    return (
        <>
            {/* History button */}
            <Button
                variant="ghost"
                size="sm"
                className="ml-4 bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    dispatch(openHistory());
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }}
                title="View history"
            >
                <History className="w-4 h-4" />
                History
            </Button>

            {/* History Dialog */}
            <Dialog
                open={isOpen}
                onOpenChange={(open) => dispatch(open ? openHistory() : closeHistory())}
            >
                <DialogContent className="max-w-4xl min-h-[70vh] max-h-[80vh] bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                    <DialogHeader>
                        <DialogTitle>Command & Event History</DialogTitle>
                        <DialogDescription>
                            View latest commands and events that have been executed
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto min-h-[55vh] max-h-[60vh]">
                        <div className="space-y-2">
                            {history?.map((item) => (
                                <div key={item.history.id}>
                                    <ScriptItem
                                        script={item.shellScript}
                                        parentFolderId={0}
                                        liteVersionDisplay={<></>}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
