import { useState, useEffect, useCallback } from "react";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { patchTabState } from "@/store/slices/appSlice";
import type { MarkdownTabState } from "@/store/slices/appSlice";
import { Button } from "@/components/ui/button";
import { AlignLeft, Columns2, Globe, Eye } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { generateScriptHtml } from "@/lib/generateScriptHtml";

interface Props {
    scriptId: number;
    port: number | null;
}

export default function MarkdownEditorToolbar({ scriptId, port }: Props) {
    const tabId = scriptId;
    const dispatch = useAppDispatch();
    const ts = useAppSelector((s) => s.app.tab.tabStates[tabId]);
    const editorState = useAppSelector((s) => s.app.tab.editor[String(tabId)]);

    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: !port || port === 0,
    });
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const [imagesDir, setImagesDir] = useState<string | null>(null);
    useEffect(() => {
        invoke<string>("get_images_dir").then(setImagesDir).catch(console.error);
    }, []);

    const editViewMode = ts?.editViewMode ?? "mixed";
    const editName = ts?.editName ?? "";
    const hasChanges = ts?.hasChanges ?? false;
    const edited = ts?.edited ?? false;
    const editContent = editorState?.editContent ?? "";

    const patch = useCallback(
        (partial: Partial<MarkdownTabState>) => dispatch(patchTabState({ tabId, ...partial })),
        [dispatch, tabId]
    );

    const handleViewAsHtml = async () => {
        if (!script?.id) return;
        try {
            const html = await generateScriptHtml(script.id, dispatch, imagesDir ?? "");
            await invoke("write_and_open_html", { html });
        } catch (error) {
            console.error("Failed to open as HTML:", error);
        }
    };

    const handleSaveEdit = async () => {
        if (!script) return;
        await updateMarkdown({ ...script, name: editName, command: editContent }).unwrap();
        patch({ hasChanges: false, edited: true });
        setTimeout(() => dispatch(patchTabState({ tabId, edited: false })), 2000);
        dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));
        await emit("markdown-updated", { scriptId: script.id });
    };

    return (
        <div className="flex items-center gap-2 flex-1 min-w-0 px-4">
            {/* Title / name input */}
            <div className="flex items-center gap-2 flex-1 min-w-0"></div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {edited ? "Saved" : hasChanges ? "Not Saved" : ""}
                </span>

                <input
                    type="text"
                    value={editName}
                    onChange={(e) =>
                        patch({ editName: e.target.value, hasChanges: true, edited: false })
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    className="py-[5px] bg-transparent focus:outline-none dark:bg-neutral-700 text-black dark:border-neutral-600 dark:text-white px-3 rounded-md w-full max-w-[200px]"
                    placeholder="Markdown name"
                />

                <div className="flex items-center rounded-lg overflow-hidden border-0">
                    <button
                        onClick={() => patch({ editViewMode: "plain" })}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none outline-none focus-visible:outline-none focus-visible:ring-0 ${
                            editViewMode === "plain"
                                ? "bg-neutral-600 text-white"
                                : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                        }`}
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                        Plain Text
                    </button>
                    <button
                        onClick={() => patch({ editViewMode: "mixed" })}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-md outline-none focus-visible:outline-none focus-visible:ring-0 ${
                            editViewMode === "mixed"
                                ? "bg-neutral-600 text-white"
                                : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                        }`}
                    >
                        <Columns2 className="w-3.5 h-3.5" />
                        Mixed
                    </button>
                    <button
                        onClick={() => patch({ editViewMode: "preview" })}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none outline-none focus-visible:outline-none focus-visible:ring-0 ${
                            editViewMode === "preview"
                                ? "bg-neutral-600 text-white"
                                : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                    </button>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleViewAsHtml}
                    className="border-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                >
                    <Globe className="w-4 h-4" />
                    View as HTML
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => handleSaveEdit()}
                    disabled={!hasChanges}
                    className="border-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                >
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
