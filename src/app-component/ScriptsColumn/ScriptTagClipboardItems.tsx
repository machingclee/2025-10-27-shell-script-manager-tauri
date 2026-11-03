import { ClipboardCopy, ClipboardPaste } from "lucide-react";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCopiedTagIds } from "@/store/slices/appSlice";
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
    const copiedTagIds = useAppSelector((state) => state.app.copiedTagIds);
    const [assignTag] = scriptApi.endpoints.assignTagToScript.useMutation();
    const currentIds = assignedTags.map((tag) => tag.tagId);
    const tagsToPaste = copiedTagIds.filter((id) => !currentIds.includes(id));

    return (
        <>
            <ContextMenuItem
                disabled={currentIds.length === 0}
                onClick={() => dispatch(setCopiedTagIds(currentIds))}
                className={itemClass}
            >
                <ClipboardCopy className="w-4 h-4 mr-2" />
                Copy Tags
            </ContextMenuItem>
            <ContextMenuItem
                disabled={tagsToPaste.length === 0}
                onClick={() => {
                    assignTag({ scriptId, tagIds: tagsToPaste });
                }}
                className={itemClass}
            >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Paste Tags
            </ContextMenuItem>
        </>
    );
}
