import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { AiScriptedToolDTO, AIProfileDTO } from "@/types/dto";
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
                        {scriptedTools.map((tool) => (
                            <ContextMenu key={tool.id}>
                                <ContextMenuTrigger asChild>
                                    <div className="p-3 rounded-lg border bg-gray-50 border-gray-200 dark:bg-neutral-700/50 dark:border-neutral-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700">
                                        <div className="flex items-start justify-between">
                                            <div className="font-medium text-sm flex-1 min-w-0">
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
                                                {tool.toolDescription}
                                            </div>
                                        )}
                                        {tool.createdAt && (
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {dayjs(tool.createdAt).format("YYYY-MM-DD")}
                                            </div>
                                        )}
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[9999]">
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
                        ))}
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
