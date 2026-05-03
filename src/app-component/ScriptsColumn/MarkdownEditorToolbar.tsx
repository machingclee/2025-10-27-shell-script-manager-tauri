import { useState, useEffect, useCallback } from "react";
import { scriptApi } from "@/store/api/scriptApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { patchTabState } from "@/store/slices/appSlice";
import type { MarkdownTabState } from "@/store/slices/appSlice";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlignLeft, Columns2, Globe, Eye, Save } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { generateScriptHtml } from "@/lib/generateScriptHtml";

interface Props {
    scriptId: number;
    port: number | null;
}

const MIN_INPUT_WIDTH = 50;
const MAX_INPUT_WIDTH = 450;
const MIN_WINDOW_WIDTH = 500;
const MAX_WINDOW_WIDTH = 1920;
const INPUT_HORIZONTAL_PADDING = 32;

function getResponsiveInputWidth(windowWidth: number) {
    const progress = Math.max(
        0,
        Math.min(1, (windowWidth - MIN_WINDOW_WIDTH) / (MAX_WINDOW_WIDTH - MIN_WINDOW_WIDTH))
    );

    return MIN_INPUT_WIDTH + progress * (MAX_INPUT_WIDTH - MIN_INPUT_WIDTH);
}

export default function MarkdownEditorToolbar({ scriptId, port }: Props) {
    const tabId = scriptId;
    const dispatch = useAppDispatch();

    const tabState = useAppSelector((s) => s.app.tab.tabStates[tabId]);
    const editorState = useAppSelector((s) => s.app.tab.editor[String(tabId)]);

    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(scriptId, {
        skip: !port || port === 0,
    });
    const [updateMarkdown] = scriptApi.endpoints.updateMarkdownScript.useMutation();

    const [imagesDir, setImagesDir] = useState<string | null>(null);
    const windowWidth = useWindowWidth();

    useEffect(() => {
        invoke<string>("get_images_dir").then(setImagesDir).catch(console.error);
    }, []);

    const editViewMode = tabState?.editViewMode ?? "mixed";
    const editName = tabState?.editName ?? script?.name ?? "";
    const hasChanges = tabState?.hasChanges ?? false;
    const edited = tabState?.edited ?? false;
    const editContent = editorState?.editContent ?? "";
    const maxAvailableInputWidth = Math.max(0, windowWidth - INPUT_HORIZONTAL_PADDING);
    const inputWidth = Math.min(getResponsiveInputWidth(windowWidth), maxAvailableInputWidth);

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
        if (tabState?.isDraftNew) {
            patch({ saveDialogRequested: true });
            return;
        }
        await updateMarkdown({ ...script, name: editName, command: editContent }).unwrap();
        patch({ hasChanges: false, edited: true });
        setTimeout(() => dispatch(patchTabState({ tabId, edited: false })), 2000);
        dispatch(scriptApi.util.invalidateTags([{ type: "Script", id: script.id }]));
        await emit("markdown-updated", { scriptId: script.id });
    };

    return (
        <div className="relative flex items-center gap-2 flex-1 min-w-0 px-4 py-1 justify-between">
            <div className="relative z-10 flex items-center rounded-lg overflow-hidden border-0">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => patch({ editViewMode: "plain" })}
                            className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none outline-none focus-visible:outline-none focus-visible:ring-0 ${
                                editViewMode === "plain"
                                    ? "bg-neutral-600 text-white"
                                    : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                            }`}
                        >
                            <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Plain Text</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => patch({ editViewMode: "mixed" })}
                            className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-md outline-none focus-visible:outline-none focus-visible:ring-0 ${
                                editViewMode === "mixed"
                                    ? "bg-neutral-600 text-white"
                                    : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                            }`}
                        >
                            <Columns2 className="w-3.5 h-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Mixed</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => patch({ editViewMode: "preview" })}
                            className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors rounded-none outline-none focus-visible:outline-none focus-visible:ring-0 ${
                                editViewMode === "preview"
                                    ? "bg-neutral-600 text-white"
                                    : "bg-transparent text-gray-400 hover:text-white hover:bg-neutral-700"
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Preview</TooltipContent>
                </Tooltip>
            </div>
            {/* Title / name input */}
            <div
                className="absolute top-1/2 left-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center px-4"
                style={{ width: inputWidth + INPUT_HORIZONTAL_PADDING }}
            >
                <input
                    type="text"
                    value={editName}
                    onChange={(e) =>
                        patch({ editName: e.target.value, hasChanges: true, edited: false })
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    className="rounded-md bg-transparent px-3 py-1 text-black focus:outline-none dark:bg-[#303030] dark:border-neutral-700 dark:text-white"
                    style={{ width: inputWidth }}
                    placeholder="Markdown name"
                />
            </div>
            {/* Action buttons */}
            <div className="relative z-10 flex items-center gap-2 flex-shrink-0 dark:bg-neutral-800 pl-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {edited ? "Saved" : hasChanges ? "Not Saved" : ""}
                </span>

                <Button
                    variant="ghost"
                    onClick={handleViewAsHtml}
                    className="border-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                >
                    <Globe className="w-4 h-4" />
                    HTML
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => handleSaveEdit()}
                    disabled={!hasChanges}
                    className="border-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                >
                    <Save className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
