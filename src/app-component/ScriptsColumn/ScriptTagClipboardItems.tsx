import { ClipboardCopy, ClipboardPaste } from "lucide-react";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCopiedTags, setPendingTagPaste } from "@/store/slices/appSlice";
import type { ScriptAssignedTag } from "@/types/dto";

const itemClass =
    "cursor-pointer hover:bg-gray-100 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700";

/** Copy this script's tags into the store, or paste the stored tags onto this script. */
export default function ScriptTagClipboardItems({
    scriptId,
    assignedTags = [],
}: {
    scriptId: number;
    assignedTags?: ScriptAssignedTag[];
}) {
    const dispatch = useAppDispatch();
    const copiedTags = useAppSelector((state) => state.app.copiedTags);
    const [assignTag] = scriptApi.endpoints.assignTagToScript.useMutation();

    return (
        <>
            <ContextMenuItem
                disabled={assignedTags.length === 0}
                onSelect={() =>
                    dispatch(
                        setCopiedTags(
                            assignedTags.map((tag) => ({ tagId: tag.tagId, name: tag.name }))
                        )
                    )
                }
                className={itemClass}
            >
                <ClipboardCopy className="w-4 h-4 mr-2" />
                Copy Tags
            </ContextMenuItem>
            <ContextMenuItem
                disabled={copiedTags.length === 0}
                onSelect={() => {
                    if (assignedTags.length > 0) {
                        dispatch(
                            setPendingTagPaste({
                                scriptId,
                                existingTags: assignedTags.map((tag) => ({
                                    tagId: tag.tagId,
                                    name: tag.name,
                                })),
                            })
                        );
                        return;
                    }
                    assignTag({
                        scriptId,
                        tagIds: copiedTags.map((tag) => tag.tagId),
                    });
                }}
                className={itemClass}
            >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Paste Tags
            </ContextMenuItem>
        </>
    );
}
