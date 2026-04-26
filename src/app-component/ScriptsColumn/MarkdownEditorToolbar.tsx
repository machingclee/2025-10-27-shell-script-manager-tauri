import React, { useState, useEffect, useCallback } from "react";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { patchTabState, renameTab } from "@/store/slices/appSlice";
import type { MarkdownTabState } from "@/store/slices/appSlice";
import { Button } from "@/components/ui/button";
import { Edit, AlignLeft, Columns2, Globe, Eye } from "lucide-react";
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

    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: !port || port === 0,
    });
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const [imagesDir, setImagesDir] = useState<string | null>(null);
    useEffect(() => {
        invoke<string>("get_images_dir").then(setImagesDir).catch(console.error);
    }, []);

    const isEditMode = ts?.isEditMode ?? false;
    const editViewMode = ts?.editViewMode ?? "mixed";
    const editName = ts?.editName ?? "";
    const hasChanges = ts?.hasChanges ?? false;
    const edited = ts?.edited ?? false;
    const editContent = ts?.editContent ?? "";

    const patch = useCallback(
        (partial: Partial<MarkdownTabState>) => dispatch(patchTabState({ tabId, ...partial })),
        [dispatch, tabId]
    );

    const handleEnableEdit = () => {
        patch({ isEditMode: true, editName: script?.name || "" });
    };

    const handleViewAsHtml = async () => {
        if (!script?.id) return;
        try {
            const html = await generateScriptHtml(script.id, dispatch, imagesDir ?? "");
            await invoke("write_and_open_html", { html });
        } catch (error) {
            console.error("Failed to open as HTML:", error);
        }
    };

    const handleSaveEdit = async (closeEditMode = true) => {
        if (!script) return;
        await updateMarkdown({ ...script, name: editName, command: editContent }).unwrap();
        patch({ hasChanges: false, edited: true });
        dispatch(renameTab({ tabId, scriptName: editName }));
        setTimeout(() => dispatch(patchTabState({ tabId, edited: false })), 2000);
        if (closeEditMode) patch({ isEditMode: false });
        dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));
        await emit("markdown-updated", { scriptId: script.id });
    };

    const handleCancelEdit = () => {
        patch({ isEditMode: false, hasChanges: false });
    };

    return (
        <div className="flex items-center gap-2 flex-1 min-w-0 px-4">
            {/* Title / name input */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {isEditMode ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) =>
                            patch({ editName: e.target.value, hasChanges: true, edited: false })
                        }
                        onMouseDown={(e) => e.stopPropagation()}
                        className="py-1 bg-transparent border border-gray-300 dark:border-neutral-600 focus:outline-none focus:border-blue-500 dark:bg-neutral-700 text-black dark:text-white px-2 rounded flex-1 max-w-sm"
                        placeholder="Markdown name"
                    />
                ) : (
                    <h2
                        className="text-black dark:text-white cursor-pointer truncate"
                        onDoubleClick={handleEnableEdit}
                    >
                        {script?.name}
                    </h2>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {isEditMode && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {edited ? "Saved" : hasChanges ? "Not Saved" : ""}
                    </span>
                )}
                {!isEditMode ? (
                    <>
                        <Button
                            variant="outline"
                            onClick={handleViewAsHtml}
                            className="border-0 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            <Globe className="w-4 h-4" />
                            View as HTML
                        </Button>
                        <Button
                            onClick={handleEnableEdit}
                            className="border-0 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center rounded-lg overflow-hidden border-0">
                            <button
                                onClick={() => patch({ editViewMode: "plain" })}
                                className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none ${
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
                                className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-md ${
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
                                className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none ${
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
                            variant="outline"
                            onClick={handleViewAsHtml}
                            className="border-0 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            <Globe className="w-4 h-4" />
                            View as HTML
                        </Button>
                        <Button
                            onClick={() => handleSaveEdit(true)}
                            disabled={!hasChanges}
                            className="border-0 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            Save Changes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="border-0 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                        >
                            End Edit
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
