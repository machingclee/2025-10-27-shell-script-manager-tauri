import {
    AIProfileDTO,
    AiScriptedToolDTO,
    ModelConfigDTO,
    ModelConfigResponse,
    UpdateModelConfigRequest,
} from "@/types/dto";
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
            { name: string; modelSource: string; aiprofileId: number }
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
        getModelConfigs: builder.query<ModelConfigResponse[], { aiProfileId: number }>({
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
        updateAIProfile: builder.mutation<AIProfileDTO, { aiProfileDTO: AIProfileDTO }>({
            query: (request) => ({
                url: "/ai/ai-profile",
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["AIProfileList"],
        }),
        updateModelConfig: builder.mutation<ModelConfigDTO, UpdateModelConfigRequest>({
            query: (request) => ({
                url: "/ai/model-config",
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["ModelConfigList"],
        }),
        updateAiScriptedTool: builder.mutation<
            AiScriptedToolDTO,
            { aiScriptedToolDTO: AiScriptedToolDTO }
        >({
            query: (request) => ({
                url: "/ai/ai-scripted-tool",
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["AIProfileDetail"],
        }),
        deleteAIProfile: builder.mutation<void, { id: number }>({
            query: ({ id }) => ({
                url: `/ai/ai-profile/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["AIProfileList"],
        }),
        deleteModelConfig: builder.mutation<void, { id: number; aiProfileId: number }>({
            query: ({ id, aiProfileId }) => ({
                url: `/ai/model-config/${id}?aiProfileId=${aiProfileId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { aiProfileId }) => [
                { type: "ModelConfigList", id: aiProfileId },
            ],
        }),
        deleteAiScriptedTool: builder.mutation<void, { id: number; aiProfileId: number }>({
            query: ({ id, aiProfileId }) => ({
                url: `/ai/ai-scripted-tool/${id}?aiProfileId=${aiProfileId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { aiProfileId }) => [
                { type: "AIProfileDetail", id: aiProfileId },
            ],
        }),
        selectDefaultAiProfile: builder.mutation<void, { aiProfileId: number }>({
            query: ({ aiProfileId }) => ({
                url: `/ai/select-default-ai-profile/${aiProfileId}`,
                method: "PUT",
            }),
            invalidatesTags: ["AIProfileList", "AppState"],
        }),
        selectDefaultModelConfig: builder.mutation<
            void,
            { aiProfileId: number; modelConfigId: number }
        >({
            query: (request) => ({
                url: "/ai/default-model-config",
                method: "PUT",
                body: request,
            }),
            invalidatesTags: ["ModelConfigList", "AIProfileList"],
        }),
    }),
});
