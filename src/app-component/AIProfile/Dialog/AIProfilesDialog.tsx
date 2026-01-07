import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { AIProfileDTO, ModelConfigDTO, AiScriptedToolDTO } from "@/types/dto";
import { aiApi } from "@/store/api/aiApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import aiSlice from "@/store/slices/aiSlice";
import { useState } from "react";
import dayjs from "dayjs";
import { Edit } from "lucide-react";
import { EditAIProfileDialog } from "./EditAIProfileDialog";
import { EditModelConfigDialog } from "./EditModelConfigDialog";
import { EditScriptedToolDialog } from "./EditScriptedToolDialog";

export const AIProfilesDialog = () => {
    const { data: aiProfiles, isLoading, error } = aiApi.useGetAIProfilesQuery();
    const [updateAIProfile] = aiApi.endpoints.updateAIProfile.useMutation();
    const [updateModelConfig] = aiApi.endpoints.updateModelConfig.useMutation();
    const [updateAiScriptedTool] = aiApi.endpoints.updateAiScriptedTool.useMutation();

    const dispatch = useAppDispatch();
    const open = useAppSelector((s) => s.ai.aiProfile.dialogOpen);
    const setOpen = (_open: boolean) => {
        dispatch(aiSlice.actions.setAiProfileDialogOpen(_open));
    };

    const [selectedProfile, setSelectedProfile] = useState<AIProfileDTO | null>(null);
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<AIProfileDTO | null>(null);
    const [editConfigOpen, setEditConfigOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ModelConfigDTO | null>(null);
    const [editToolOpen, setEditToolOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<AiScriptedToolDTO | null>(null);

    const { data: correspondingModelConfigs } = aiApi.endpoints.getModelConfigs.useQuery(
        { aiProfileId: selectedProfile?.id! },
        { skip: !selectedProfile }
    );
    const selectedModelConfig = correspondingModelConfigs?.find(
        (config) => config.id === selectedProfile?.selectedModelConfigId
    );
    const { data: correspondingAiScriptedTools } = aiApi.endpoints.getAIScriptedTools.useQuery(
        { aiProfileId: selectedProfile?.id! },
        { skip: !selectedProfile }
    );

    const handleEditProfile = (profile: AIProfileDTO) => {
        setEditingProfile(profile);
        setEditProfileOpen(true);
    };

    const handleSaveProfile = async (profile: AIProfileDTO) => {
        await updateAIProfile(profile);
    };

    const handleEditConfig = (config: ModelConfigDTO) => {
        setEditingConfig(config);
        setEditConfigOpen(true);
    };

    const handleSaveConfig = async (config: ModelConfigDTO) => {
        await updateModelConfig(config);
    };

    const handleEditTool = (tool: AiScriptedToolDTO) => {
        setEditingTool(tool);
        setEditToolOpen(true);
    };

    const handleSaveTool = async (tool: AiScriptedToolDTO) => {
        await updateAiScriptedTool(tool);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-7xl"
                >
                    <DialogHeader>
                        <DialogTitle>AI Profiles</DialogTitle>
                        <DialogDescription>
                            View and manage your AI profiles below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                Loading profiles...
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-8 text-red-500">
                                Failed to load profiles. Please try again.
                            </div>
                        )}

                        {!isLoading && !error && aiProfiles && aiProfiles.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No AI profiles found. Create one to get started.
                            </div>
                        )}

                        {!isLoading && !error && aiProfiles && aiProfiles.length > 0 && (
                            <div className="grid grid-cols-3 gap-4 h-[60vh]">
                                {/* Column 1: Profile Names */}
                                <div className="border-r border-gray-200 dark:border-neutral-600 pr-4 overflow-y-auto">
                                    <h3 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400">
                                        PROFILES
                                    </h3>
                                    <div className="space-y-2">
                                        {aiProfiles.map((profile: AIProfileDTO) => (
                                            <ContextMenu key={profile.id}>
                                                <ContextMenuTrigger asChild>
                                                    <div
                                                        onClick={() => setSelectedProfile(profile)}
                                                        onContextMenu={(e) => e.stopPropagation()}
                                                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                                            selectedProfile?.id === profile.id
                                                                ? "bg-blue-100 border-blue-300 dark:bg-neutral-600 dark:border-neutral-500"
                                                                : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-neutral-700/50 dark:border-neutral-600 dark:hover:bg-neutral-700"
                                                        }`}
                                                    >
                                                        <div className="font-medium truncate">
                                                            {profile.name}
                                                        </div>
                                                        {profile.description && (
                                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                                {profile.description}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-2">
                                                            {profile.createdAt && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                                    {dayjs(
                                                                        profile.createdAt
                                                                    ).format("YYYY-MM-DD")}
                                                                </div>
                                                            )}
                                                            {profile.selectedModelConfigId ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                    Model Config Selected
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                    No Model Config
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[9999]">
                                                    <ContextMenuItem
                                                        onClick={() => handleEditProfile(profile)}
                                                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit Profile
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        ))}
                                    </div>
                                </div>

                                {/* Column 2: Model Configs List */}
                                <div className="border-r border-gray-200 dark:border-neutral-600 pr-4 overflow-y-auto">
                                    <h3 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400">
                                        MODEL CONFIGS
                                    </h3>
                                    {selectedProfile ? (
                                        correspondingModelConfigs &&
                                        correspondingModelConfigs.length > 0 ? (
                                            <div className="space-y-2">
                                                {correspondingModelConfigs.map((config) => (
                                                    <ContextMenu key={config.id}>
                                                        <ContextMenuTrigger asChild>
                                                            <div
                                                                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                                                    config.id ===
                                                                    selectedProfile.selectedModelConfigId
                                                                        ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700"
                                                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-neutral-700/50 dark:border-neutral-600 dark:hover:bg-neutral-700"
                                                                }`}
                                                            >
                                                                <div className="font-medium text-sm truncate">
                                                                    {config.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    {config.modelSource}
                                                                </div>
                                                                {config.createdAt && (
                                                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                        {dayjs(
                                                                            config.createdAt
                                                                        ).format("YYYY-MM-DD")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[9999]">
                                                            <ContextMenuItem
                                                                onClick={() =>
                                                                    handleEditConfig(config)
                                                                }
                                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                                                            >
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit Config
                                                            </ContextMenuItem>
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                ))}
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

                                {/* Column 3: AI Scripted Tools */}
                                <div className="overflow-y-auto">
                                    <h3 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400">
                                        AI SCRIPTED TOOLS
                                    </h3>
                                    {selectedProfile ? (
                                        correspondingAiScriptedTools &&
                                        correspondingAiScriptedTools.length > 0 ? (
                                            <div className="space-y-2">
                                                {correspondingAiScriptedTools.map((tool) => (
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
                                                                        {dayjs(
                                                                            tool.createdAt
                                                                        ).format("YYYY-MM-DD")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[9999]">
                                                            <ContextMenuItem
                                                                onClick={() => handleEditTool(tool)}
                                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                                                            >
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit Tool
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
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <EditAIProfileDialog
                isOpen={editProfileOpen}
                setIsOpen={setEditProfileOpen}
                profile={editingProfile}
                onSave={handleSaveProfile}
            />

            <EditModelConfigDialog
                isOpen={editConfigOpen}
                setIsOpen={setEditConfigOpen}
                modelConfig={editingConfig}
                onSave={handleSaveConfig}
            />

            <EditScriptedToolDialog
                isOpen={editToolOpen}
                setIsOpen={setEditToolOpen}
                scriptedTool={editingTool}
                onSave={handleSaveTool}
            />
        </>
    );
};
