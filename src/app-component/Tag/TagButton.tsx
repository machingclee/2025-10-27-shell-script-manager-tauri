import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { closeHistory } from "@/store/slices/historySlice";
import { HOME_TAB_ID, setActiveTab, setRightPanelMode } from "@/store/slices/appSlice";

export default function TagButton() {
    const dispatch = useAppDispatch();

    return (
        <Button
            variant="ghost"
            size="sm"
            className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                dispatch(setActiveTab(HOME_TAB_ID));
                dispatch(setRightPanelMode("TAG"));
                dispatch(closeHistory());
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Manage tags"
        >
            <Tag className="w-4 h-4" />
            Tags
        </Button>
    );
}
