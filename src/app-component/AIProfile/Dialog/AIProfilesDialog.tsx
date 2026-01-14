import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AIProfileDTO,
    ModelConfigDTO,
    AiScriptedToolDTO,
    OpenAiModelConfigDTO,
    AzureModelConfigDTO,
    ModelConfigResponse,
} from "@/types/dto";
import { aiApi } from "@/store/api/aiApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import aiSlice from "@/store/slices/aiSlice";
import { useEffect, useState } from "react";
import { EditAIProfileDialog } from "./EditAIProfileDialog";
import { EditModelConfigDialog } from "./EditModelConfigDialog";
import { EditScriptedToolDialog } from "./EditScriptedToolDialog";
import { ProfilesColumn } from "./ProfilesColumn";
import { ModelConfigsColumn } from "./ModelConfigsColumn";
import { AIScriptedToolsColumn } from "./AIScriptedToolsColumn";
import { appStateApi } from "@/store/api/appStateApi";

export const AIProfilesDialog = () => {
    const { data: aiProfiles, isLoading, error } = aiApi.endpoints.getAIProfiles.useQuery();
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
    const [editingConfig, setEditingConfig] = useState<ModelConfigResponse | null>(null);
    const [editToolOpen, setEditToolOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<AiScriptedToolDTO | null>(null);

    const { data: correspondingModelConfigs } = aiApi.endpoints.getModelConfigs.useQuery(
        { aiProfileId: selectedProfile?.id! },
        { skip: !selectedProfile }
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
        await updateAIProfile({ aiProfileDTO: profile });
    };

    const onStartEditConfig = (config: ModelConfigResponse) => {
        setEditingConfig(config);
        setEditConfigOpen(true);
    };

    const handleSaveConfig = async (
        config: ModelConfigDTO,
        openAiConfig?: OpenAiModelConfigDTO,
        azureConfig?: AzureModelConfigDTO
    ) => {
        await updateModelConfig({
            modelConfigDTO: config,
            openAiModelConfigDTO: openAiConfig,
            azureModelConfigDTO: azureConfig,
        });
    };

    const handleEditTool = (tool: AiScriptedToolDTO) => {
        setEditingTool(tool);
        setEditToolOpen(true);
    };

    const handleSaveTool = async (tool: AiScriptedToolDTO) => {
        await updateAiScriptedTool({ aiScriptedToolDTO: tool });
    };

    const appState = appStateApi.endpoints.getAppState.useQueryState()?.data;
    const defaultSelectedProfileId = appState?.selectedAiprofileId;

    // console.log("defaultSelectedProfileId", defaultSelectedProfileId);

    useEffect(() => {
        if (open && aiProfiles && aiProfiles.length > 0) {
            const defaultProfile = aiProfiles.find(
                (profile) => profile.id === defaultSelectedProfileId
            );
            console.log("defaultProfile", defaultProfile);
            if (defaultProfile) {
                setSelectedProfile(defaultProfile);
            } else {
                // setSelectedProfile(aiProfiles[0]);
            }
        }
    }, [defaultSelectedProfileId, open]);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    overlayClassName="bg-black/30 z-[9997]"
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-7xl z-[9998]"
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
                                <ProfilesColumn
                                    profiles={aiProfiles}
                                    selectedProfile={selectedProfile}
                                    onSelectProfile={setSelectedProfile}
                                    onEditProfile={handleEditProfile}
                                />

                                <ModelConfigsColumn
                                    selectedProfile={selectedProfile}
                                    modelConfigs={correspondingModelConfigs}
                                    onStartEditConfig={onStartEditConfig}
                                />

                                <AIScriptedToolsColumn
                                    selectedProfile={selectedProfile}
                                    scriptedTools={correspondingAiScriptedTools}
                                    onEditTool={handleEditTool}
                                />
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
                key={!!editingConfig ? "exists" : "not-exists"}
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
