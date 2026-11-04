import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AssignedTagBadge from "@/lib/AssignedTagBadge";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPendingTagPaste } from "@/store/slices/appSlice";

/** Confirms replacing a script's tags. Stays mounted outside any context menu. */
export default function PasteTagReplaceDialog() {
    const dispatch = useAppDispatch();
    const pending = useAppSelector((state) => state.app.pendingTagPaste);
    const copiedTags = useAppSelector((state) => state.app.copiedTags);
    const [assignTag] = scriptApi.endpoints.assignTagToScript.useMutation();
    const [unassignTag] = scriptApi.endpoints.unassignTagFromScript.useMutation();

    async function replaceTags() {
        if (!pending) return;
        const currentIds = pending.existingTags.map((tag) => tag.tagId);
        const copiedIds = copiedTags.map((tag) => tag.tagId);
        const removeIds = currentIds.filter((id) => !copiedIds.includes(id));
        const addIds = copiedIds.filter((id) => !currentIds.includes(id));
        try {
            if (removeIds.length > 0) {
                await unassignTag({ scriptId: pending.scriptId, tagIds: removeIds }).unwrap();
            }
            if (addIds.length > 0) {
                await assignTag({ scriptId: pending.scriptId, tagIds: addIds }).unwrap();
            }
            dispatch(setPendingTagPaste(null));
        } catch {
            // The request layer already surfaces the server message.
        }
    }

    return (
        <AlertDialog
            open={pending != null}
            onOpenChange={(open) => {
                if (!open) dispatch(setPendingTagPaste(null));
            }}
        >
            <AlertDialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                <AlertDialogHeader>
                    <AlertDialogTitle>Replace tags?</AlertDialogTitle>
                    <AlertDialogDescription className="flex flex-wrap items-center gap-1.5 text-gray-600 dark:text-neutral-300">
                        <span>The following tags</span>
                        {pending?.existingTags.map((tag) => (
                            <AssignedTagBadge key={tag.tagId} name={tag.name} />
                        ))}
                        <span>will be replaced by</span>
                        {copiedTags.map((tag) => (
                            <AssignedTagBadge key={tag.tagId} name={tag.name} />
                        ))}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(event) => {
                            event.preventDefault();
                            replaceTags();
                        }}
                    >
                        Replace
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
