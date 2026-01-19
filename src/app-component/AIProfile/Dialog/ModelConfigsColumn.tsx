import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { AIProfileDTO, ModelConfigResponse } from "@/types/dto";
import dayjs from "dayjs";
import { Check, Edit, Plus, Trash2 } from "lucide-react";

interface ModelConfigsColumnProps {
    selectedProfile: AIProfileDTO | null;
    modelConfigs: ModelConfigResponse[] | undefined;
    onStartEditConfig: (config: ModelConfigResponse) => void;
    onCreateConfig: () => void;
    onDeleteConfig: (config: ModelConfigResponse) => void;
    onSelectAsDefault: (config: ModelConfigResponse) => void;
}

export const ModelConfigsColumn = ({
    selectedProfile,
    modelConfigs,
    onStartEditConfig,
    onCreateConfig,
    onDeleteConfig,
    onSelectAsDefault,
}: ModelConfigsColumnProps) => {
    return (
        <div className="border-r border-gray-200 dark:border-neutral-600 pr-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    MODEL CONFIGS
                </h3>
                <Button
                    size="sm"
                    onClick={onCreateConfig}
                    disabled={!selectedProfile}
                    className="h-7 px-2 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                </Button>
            </div>
            {selectedProfile ? (
                modelConfigs && modelConfigs.length > 0 ? (
                    <div className="space-y-2">
                        {modelConfigs.map((config) => {
                            return (
                                <ContextMenu key={config.modelConfigDTO.id}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                                config.modelConfigDTO.id ===
                                                selectedProfile.selectedModelConfigId
                                                    ? "bg-blue-100 border-blue-300 dark:bg-neutral-600 dark:border-neutral-500"
                                                    : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-neutral-700/50 dark:border-neutral-600 dark:hover:bg-neutral-700"
                                            }`}
                                        >
                                            <div className="font-medium text-sm truncate">
                                                {config.modelConfigDTO.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {config.modelConfigDTO.modelSource}
                                            </div>
                                            {config.modelConfigDTO.createdAt && (
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {dayjs(config.modelConfigDTO.createdAt).format(
                                                        "YYYY-MM-DD h:mm A"
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="bg-gray-100 border-gray-300 dark:bg-neutral-700 dark:text-white dark:border-neutral-500 z-[9999]">
                                        <ContextMenuItem
                                            onClick={() => onStartEditConfig(config)}
                                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Config
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                            onClick={() => {
                                                console.log("Config ID:", config.modelConfigDTO.id);
                                                console.log(
                                                    "Selected ID:",
                                                    selectedProfile.selectedModelConfigId
                                                );
                                                onSelectAsDefault(config);
                                            }}
                                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                                            disabled={
                                                config.modelConfigDTO.id ===
                                                selectedProfile.selectedModelConfigId
                                            }
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            {config.modelConfigDTO.id ===
                                            selectedProfile.selectedModelConfigId
                                                ? "Default Config"
                                                : "Select as Default"}
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                            onClick={() => onDeleteConfig(config)}
                                            className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Config
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        No model configs found
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
