import { AIProfileDTO, AiScriptedToolDTO, ModelConfigDTO } from "@/types/dto";
import { baseApi } from "./baseApi";

export const aiApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAIProfiles: builder.query<AIProfileDTO[], void>({
            query: () => ({
                url: "/ai/ai-profiles",
                method: "GET",
            }),
            providesTags: ["AIProfileList"],
        }),
        createAIProfile: builder.mutation<AIProfileDTO, { name: string; description: string }>({
            query: (request) => ({
                url: "/ai/ai-profile",
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["AIProfileList"],
        }),
        createModelConfig: builder.mutation<
            ModelConfigDTO,
            { name: string; modelSourceType: string; aiprofileId: number }
        >({
            query: (request) => ({
                url: "/ai/model-config",
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["ModelConfigList"],
        }),
        createAiScriptedTool: builder.mutation<
            AiScriptedToolDTO,
            {
                aiprofileId: number;
                scriptId: number;
                name: string;
                isEnabled: boolean;
                toolDescription: string;
            }
        >({
            query: ({ aiprofileId, scriptId, ...request }) => ({
                url: `/ai/aiprofiles/${aiprofileId}/scripts/${scriptId}/ai-scripted-tool`,
                method: "POST",
                body: request,
            }),
            invalidatesTags: (_result, _error, { aiprofileId }) => [
                { type: "AIProfileDetail", id: aiprofileId },
            ],
        }),
        getModelConfigs: builder.query<ModelConfigDTO[], { aiProfileId: number }>({
            query: (args) => ({
                url: `/ai/ai-profiles/${args.aiProfileId}/model-configs`,
                method: "GET",
            }),
            providesTags: (_result, _error, args) => [
                { type: "ModelConfigList", id: args.aiProfileId },
            ],
        }),
        getAIScriptedTools: builder.query<AiScriptedToolDTO[], { aiProfileId: number }>({
            query: (args) => ({
                url: `/ai/ai-profiles/${args.aiProfileId}/ai-scripted-tools`,
                method: "GET",
            }),
            providesTags: (_result, _error, args) => [
                { type: "AIProfileDetail", id: args.aiProfileId },
            ],
        }),
        updateAIProfile: builder.mutation<AIProfileDTO, AIProfileDTO>({
            query: (profile) => ({
                url: `/ai/ai-profile/${profile.id}`,
                method: "PUT",
                body: profile,
            }),
            invalidatesTags: ["AIProfileList"],
        }),
        updateModelConfig: builder.mutation<ModelConfigDTO, ModelConfigDTO>({
            query: (config) => ({
                url: `/ai/model-config/${config.id}`,
                method: "PUT",
                body: config,
            }),
            invalidatesTags: (_result, _error, config) => [
                { type: "ModelConfigList", id: config.id },
            ],
        }),
        updateAiScriptedTool: builder.mutation<AiScriptedToolDTO, AiScriptedToolDTO>({
            query: (tool) => ({
                url: `/ai/ai-scripted-tool/${tool.id}`,
                method: "PUT",
                body: tool,
            }),
            invalidatesTags: ["AIProfileDetail"],
        }),
    }),
});
