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
import dayjs from "dayjs";

export default function HistoryButton() {
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector((state) => state.history.isOpen);
    const { data: histories } = scriptApi.endpoints.getScriptHistories.useQuery(undefined, {
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
                <DialogContent
                    className="max-w-4xl min-h-[70vh] max-h-[80vh] bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
                    onMouseDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Script Execution History
                        </DialogTitle>
                        <DialogDescription className="italic">
                            Latest shell scripts that have been executed in descending order
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto min-h-[55vh] max-h-[60vh]">
                        <div className="space-y-2">
                            {histories?.map((item) => (
                                <div key={item.history.id}>
                                    <ScriptItem
                                        parentFolderPath={item.parentFolderPath}
                                        script={item.shellScript}
                                        parentFolderId={0}
                                        liteVersionDisplay={
                                            <div className="flex text-xs text-neutral-500 dark:text-neutral-400 italic items-center gap-2">
                                                <div>Executed at</div>
                                                <div className="font-medium bg-gray-100 dark:bg-[rgba(255,255,255,0.1)] p-1 rounded-md text-black dark:text-neutral-200">
                                                    {dayjs(item.history.executionTime).format(
                                                        "YYYY-MM-DD HH:mm:ss"
                                                    )}
                                                </div>
                                            </div>
                                        }
                                        historyVersion={true}
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
