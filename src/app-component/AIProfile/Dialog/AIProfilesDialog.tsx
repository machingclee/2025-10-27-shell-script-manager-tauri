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
import { UpsertAIProfileDialog } from "./UpsertAIProfileDialog";
import { UpsertModelConfigDialog } from "./UpsertModelConfigDialog";
import { UpsertScriptedToolDialog } from "./UpsertScriptedToolDialog";
import { ProfilesColumn } from "./ProfilesColumn";
import { ModelConfigsColumn } from "./ModelConfigsColumn";
import { AIScriptedToolsColumn } from "./AIScriptedToolsColumn";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { appStateApi } from "@/store/api/appStateApi";

export const AIProfilesDialog = () => {
    const { data: aiProfiles, isLoading, error } = aiApi.endpoints.getAIProfiles.useQuery();
    const [createAIProfile] = aiApi.endpoints.createAIProfile.useMutation();
    const [updateAIProfile] = aiApi.endpoints.updateAIProfile.useMutation();
    const [deleteAIProfile] = aiApi.endpoints.deleteAIProfile.useMutation();
    const [createModelConfig] = aiApi.endpoints.createModelConfig.useMutation();
    const [updateModelConfig] = aiApi.endpoints.updateModelConfig.useMutation();
    const [deleteModelConfig] = aiApi.endpoints.deleteModelConfig.useMutation();
    const [createAiScriptedTool] = aiApi.endpoints.createAiScriptedTool.useMutation();
    const [updateAiScriptedTool] = aiApi.endpoints.updateAiScriptedTool.useMutation();
    const [deleteAiScriptedTool] = aiApi.endpoints.deleteAiScriptedTool.useMutation();

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

    // Delete confirmation dialog state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<{
        type: "profile" | "config" | "tool";
        id: number;
        name: string;
        aiProfileId?: number;
    } | null>(null);

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

    const handleCreateProfile = () => {
        setEditingProfile(null);
        setEditProfileOpen(true);
    };

    const handleSaveProfile = async (profile: AIProfileDTO) => {
        if (editingProfile?.id) {
            // Update existing profile
            await updateAIProfile({ aiProfileDTO: profile });
        } else {
            // Create new profile
            await createAIProfile({
                name: profile.name,
                description: profile.description,
            });
        }
    };

    const onStartEditConfig = (config: ModelConfigResponse) => {
        setEditingConfig(config);
        setEditConfigOpen(true);
    };

    const handleCreateConfig = () => {
        setEditingConfig(null);
        setEditConfigOpen(true);
    };

    const handleSaveConfig = async (
        config: ModelConfigDTO,
        openAiConfig?: OpenAiModelConfigDTO,
        azureConfig?: AzureModelConfigDTO
    ) => {
        if (editingConfig?.modelConfigDTO?.id) {
            // Update existing config
            await updateModelConfig({
                modelConfigDTO: config,
                openAiModelConfigDTO: openAiConfig,
                azureModelConfigDTO: azureConfig,
            });
        } else {
            // Create new config - need to associate with selected profile
            await createModelConfig({
                name: config.name,
                modelSource: config.modelSource,
                aiprofileId: selectedProfile?.id!,
            });
        }
    };

    const handleEditTool = (tool: AiScriptedToolDTO) => {
        setEditingTool(tool);
        setEditToolOpen(true);
    };

    const handleCreateTool = () => {
        setEditingTool(null);
        setEditToolOpen(true);
    };

    const handleSaveTool = async (tool: AiScriptedToolDTO) => {
        if (editingTool?.id) {
            // Update existing tool
            await updateAiScriptedTool({ aiScriptedToolDTO: tool });
        } else {
            // Create new tool - need to associate with selected profile
            // Note: scriptId should be provided by the edit dialog
            await createAiScriptedTool({
                aiprofileId: selectedProfile?.id!,
                scriptId: tool.shellScriptId,
                name: tool.name,
                isEnabled: tool.isEnabled,
                toolDescription: tool.toolDescription,
            });
        }
    };
    // Delete handlers
    const handleDeleteProfile = (profile: AIProfileDTO) => {
        setDeletingItem({
            type: "profile",
            id: profile.id,
            name: profile.name,
        });
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfig = (config: ModelConfigResponse) => {
        setDeletingItem({
            type: "config",
            id: config.modelConfigDTO.id,
            name: config.modelConfigDTO.name,
            aiProfileId: selectedProfile?.id,
        });
        setDeleteConfirmOpen(true);
    };

    const handleDeleteTool = (tool: AiScriptedToolDTO) => {
        setDeletingItem({
            type: "tool",
            id: tool.id,
            name: tool.name,
            aiProfileId: selectedProfile?.id,
        });
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;

        try {
            if (deletingItem.type === "profile") {
                await deleteAIProfile({ id: deletingItem.id });
                if (selectedProfile?.id === deletingItem.id) {
                    setSelectedProfile(null);
                }
            } else if (deletingItem.type === "config") {
                await deleteModelConfig({
                    id: deletingItem.id,
                    aiProfileId: deletingItem.aiProfileId!,
                });
            } else if (deletingItem.type === "tool") {
                await deleteAiScriptedTool({
                    id: deletingItem.id,
                    aiProfileId: deletingItem.aiProfileId!,
                });
            }
        } finally {
            setDeletingItem(null);
            setDeleteConfirmOpen(false);
        }
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
                                    onCreateProfile={handleCreateProfile}
                                    onDeleteProfile={handleDeleteProfile}
                                />

                                <ModelConfigsColumn
                                    selectedProfile={selectedProfile}
                                    modelConfigs={correspondingModelConfigs}
                                    onStartEditConfig={onStartEditConfig}
                                    onCreateConfig={handleCreateConfig}
                                    onDeleteConfig={handleDeleteConfig}
                                />

                                <AIScriptedToolsColumn
                                    selectedProfile={selectedProfile}
                                    scriptedTools={correspondingAiScriptedTools}
                                    onEditTool={handleEditTool}
                                    onCreateTool={handleCreateTool}
                                    onDeleteTool={handleDeleteTool}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <UpsertAIProfileDialog
                isOpen={editProfileOpen}
                setIsOpen={setEditProfileOpen}
                profile={editingProfile}
                onSave={handleSaveProfile}
            />

            <UpsertModelConfigDialog
                key={!!editingConfig ? "exists" : "not-exists"}
                isOpen={editConfigOpen}
                setIsOpen={setEditConfigOpen}
                modelConfig={editingConfig}
                onSave={handleSaveConfig}
            />

            <UpsertScriptedToolDialog
                isOpen={editToolOpen}
                setIsOpen={setEditToolOpen}
                scriptedTool={editingTool}
                onSave={handleSaveTool}
            />

            <DeleteConfirmationDialog
                isOpen={deleteConfirmOpen}
                setIsOpen={setDeleteConfirmOpen}
                title={`Delete ${deletingItem?.type === "profile" ? "AI Profile" : deletingItem?.type === "config" ? "Model Config" : "AI Scripted Tool"}`}
                description={`Are you sure you want to delete this ${deletingItem?.type === "profile" ? "AI profile" : deletingItem?.type === "config" ? "model configuration" : "AI scripted tool"}? This action cannot be undone.`}
                itemName={deletingItem?.name || ""}
                onConfirm={confirmDelete}
            />
        </>
    );
};
