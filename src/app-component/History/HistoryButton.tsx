import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeHistory, openHistory } from "@/store/slices/historySlice";

export default function HistoryButton() {
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector((state) => state.history.isOpen);

    return (
        <Button
            variant="ghost"
            size="sm"
            className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                dispatch(isOpen ? closeHistory() : openHistory());
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            title={isOpen ? "Hide history" : "View history"}
        >
            <History className="w-4 h-4" />
            History
        </Button>
    );
}
