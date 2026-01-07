import { useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import aiSlice from "@/store/slices/aiSlice";

const AIProfileButton = () => {
    const dispatch = useAppDispatch();
    const openAiPrfilesDialog = () => {
        dispatch(aiSlice.actions.setAiProfileDialogOpen(true));
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            className="bg-white p-1 px-3 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                openAiPrfilesDialog();
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            // title={isOpen ? "Hide history" : "View history"}
        >
            AI Profile
        </Button>
    );
};

export default AIProfileButton;
