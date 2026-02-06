import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { AiScriptedToolDTO, AIProfileDTO } from "@/types/dto";
import { workspaceApi } from "@/store/api/workspaceApi";
import dayjs from "dayjs";
import { Edit, Plus, Trash2 } from "lucide-react";

interface AIScriptedToolsColumnProps {
    selectedProfile: AIProfileDTO | null;
    scriptedTools: AiScriptedToolDTO[] | undefined;
    onEditTool: (tool: AiScriptedToolDTO) => void;
    onCreateTool: () => void;
    onDeleteTool: (tool: AiScriptedToolDTO) => void;
}

export const AIScriptedToolsColumn = ({
    selectedProfile,
    scriptedTools,
    onEditTool,
    onCreateTool,
    onDeleteTool,
}: AIScriptedToolsColumnProps) => {
    const { data: workspaces } = workspaceApi.endpoints.getAllWorkspaces.useQuery();

    const findScriptDetails = (scriptId: number) => {
        if (!workspaces) return null;

        for (const workspace of workspaces) {
            const searchInFolders = (folders: any[], path: string[] = []): any => {
                for (const folder of folders) {
                    const currentPath = [...path, folder.name];
                    const script = folder.shellScripts.find((s: any) => s.id === scriptId);
                    if (script) {
                        return {
                            script,
                            workspaceName: workspace.name,
                            folderPath: currentPath.join(" > "),
                        };
                    }
                    const result = searchInFolders(folder.subfolders, currentPath);
                    if (result) return result;
                }
                return null;
            };
            const result = searchInFolders(workspace.folders);
            if (result) return result;
        }
        return null;
    };

    return (
        <div className="overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    AI SCRIPTED TOOLS
                </h3>
                <Button
                    size="sm"
                    onClick={onCreateTool}
                    disabled={!selectedProfile}
                    className="h-7 px-2 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                </Button>
            </div>
            {selectedProfile ? (
                scriptedTools && scriptedTools.length > 0 ? (
                    <div className="space-y-2">
                        {scriptedTools.map((tool) => {
                            const scriptDetails = findScriptDetails(tool.shellScriptId);
                            return (
                                <ContextMenu key={tool.id}>
                                    <ContextMenuTrigger asChild>
                                        <div className="p-3 rounded-lg border bg-gray-50 border-gray-200 dark:bg-neutral-700/50 dark:border-neutral-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700">
                                            <div className="flex items-start justify-between">
                                                <div className="font-medium text-sm flex-1 min-w-0">
                                                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                                                        Name:{" "}
                                                    </span>
                                                    {tool.name}
                                                </div>
                                                {tool.isEnabled ? (
                                                    <span className="ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                        Enabled
                                                    </span>
                                                ) : (
                                                    <span className="ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                                                        Disabled
                                                    </span>
                                                )}
                                            </div>
                                            {tool.toolDescription && (
                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                    <span className="text-gray-500 dark:text-gray-500 font-medium">
                                                        Description:{" "}
                                                    </span>
                                                    {tool.toolDescription}
                                                </div>
                                            )}
                                            {scriptDetails && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-neutral-600">
                                                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium mb-1">
                                                        Original Script:
                                                    </div>
                                                    <div className="pl-2 border-l-2 border-gray-300 dark:border-neutral-600">
                                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            {scriptDetails.script.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                                            {scriptDetails.workspaceName} &gt;{" "}
                                                            {scriptDetails.folderPath}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                    Script ID: {tool.shellScriptId}
                                                </div>
                                                {tool.createdAt && (
                                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                                        {dayjs(tool.createdAt).format("YYYY-MM-DD")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="bg-gray-100 border-gray-300 dark:bg-neutral-700 dark:text-white dark:border-neutral-500 z-[9999]">
                                        <ContextMenuItem
                                            onClick={() => onEditTool(tool)}
                                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Tool
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                            onClick={() => onDeleteTool(tool)}
                                            className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Tool
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        No AI scripted tools found
                    </div>
                )
            ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Select a profile first
                </div>
            )}
        </div>
    );
};
