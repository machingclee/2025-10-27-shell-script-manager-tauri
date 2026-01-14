import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    OpenAiModelConfigDTO,
    AzureModelConfigDTO,
    ModelConfigResponse,
    ModelConfigDTO,
} from "@/types/dto";
import { useState, useEffect } from "react";

export const EditModelConfigDialog = (props: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    modelConfig: ModelConfigResponse | null;
    onSave: (
        config: ModelConfigDTO,
        openAiConfig?: OpenAiModelConfigDTO,
        azureConfig?: AzureModelConfigDTO
    ) => void;
}) => {
    const { isOpen, setIsOpen, modelConfig, onSave } = props;
    const { openaiApiKey: defaultOpenaiApiKey = "", openaiModel: defaultOpenaiModel = "" } =
        modelConfig?.openAiModelConfigDTO || {};
    const {
        azureOpenaiApiKey: defaultAzureOpenaiApiKey = "",
        azureOpenaiEndpoint: defaultAzureOpenaiEndpoint = "",
        azureOpenaiApiVersion: defaultAzureOpenaiApiVersion = "",
        azureOpenaiModel: defaultAzureOpenaiModel = "",
    } = modelConfig?.azureModelConfigDTO || {};

    const [name, setName] = useState("");
    const [modelSource, setModelSource] = useState<"OPENAI" | "AZURE_OPENAI" | "CUSTOM">("OPENAI");

    // OpenAI config fields
    const [openaiApiKey, setOpenaiApiKey] = useState(defaultOpenaiApiKey);
    const [openaiModel, setOpenaiModel] = useState(defaultOpenaiModel);

    // Azure OpenAI config fields
    const [azureOpenaiApiKey, setAzureOpenaiApiKey] = useState(defaultAzureOpenaiApiKey);
    const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState(defaultAzureOpenaiEndpoint);
    const [azureOpenaiApiVersion, setAzureOpenaiApiVersion] = useState(
        defaultAzureOpenaiApiVersion
    );
    const [azureOpenaiModel, setAzureOpenaiModel] = useState(defaultAzureOpenaiModel);

    // Password visibility toggles
    const [showOpenaiApiKey, setShowOpenaiApiKey] = useState(false);
    const [showAzureApiKey, setShowAzureApiKey] = useState(false);

    useEffect(() => {
        if (modelConfig) {
            setName(modelConfig.modelConfigDTO.name);
            setModelSource(modelConfig.modelConfigDTO.modelSource);
        }
    }, [modelConfig]);

    const handleSave = () => {
        if (modelConfig) {
            const updatedBaseConfig: ModelConfigDTO = {
                ...modelConfig.modelConfigDTO,
                name,
                modelSource,
            };

            const openAiConfig: OpenAiModelConfigDTO = {
                openaiApiKey,
                openaiModel,
                modelConfigId: modelConfig.modelConfigDTO.id,
            };

            const azureConfig = {
                azureOpenaiApiKey,
                azureOpenaiEndpoint,
                azureOpenaiApiVersion,
                azureOpenaiModel,
                modelConfigId: modelConfig.modelConfigDTO.id,
            };

            onSave(updatedBaseConfig, openAiConfig, azureConfig);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen} key={isOpen ? "open" : "closed"}>
            <DialogContent
                overlayClassName="bg-black/50 z-[9999]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[10000]"
            >
                <DialogHeader>
                    <DialogTitle>Edit Model Config</DialogTitle>
                    <DialogDescription>Update the model configuration name.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="config-name">Name</Label>
                        <Input
                            id="config-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Config name"
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="config-source">Model Source</Label>
                        <Select
                            value={modelSource}
                            onValueChange={(value: string) =>
                                setModelSource(value as "OPENAI" | "AZURE_OPENAI" | "CUSTOM")
                            }
                        >
                            <SelectTrigger className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white">
                                <SelectValue placeholder="Select model source" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[10000]">
                                <SelectItem value="OPENAI">OpenAI</SelectItem>
                                <SelectItem value="AZURE_OPENAI">Azure OpenAI</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* OpenAI Configuration Fields */}
                    {modelSource === "OPENAI" && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                                <div className="relative">
                                    <Input
                                        id="openai-api-key"
                                        type={showOpenaiApiKey ? "text" : "password"}
                                        value={openaiApiKey}
                                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowOpenaiApiKey(!showOpenaiApiKey)}
                                    >
                                        {showOpenaiApiKey ? (
                                            <EyeOff className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-500" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="openai-model">OpenAI Model</Label>
                                <Input
                                    id="openai-model"
                                    value={openaiModel}
                                    onChange={(e) => setOpenaiModel(e.target.value)}
                                    placeholder="gpt-4, gpt-3.5-turbo, etc."
                                    className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                />
                            </div>
                        </>
                    )}

                    {/* Azure OpenAI Configuration Fields */}
                    {modelSource === "AZURE_OPENAI" && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="azure-api-key">Azure OpenAI API Key</Label>
                                <div className="relative">
                                    <Input
                                        id="azure-api-key"
                                        type={showAzureApiKey ? "text" : "password"}
                                        value={azureOpenaiApiKey}
                                        onChange={(e) => setAzureOpenaiApiKey(e.target.value)}
                                        placeholder="Your Azure API Key"
                                        className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowAzureApiKey(!showAzureApiKey)}
                                    >
                                        {showAzureApiKey ? (
                                            <EyeOff className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-500" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="azure-endpoint">Azure OpenAI Endpoint</Label>
                                <Input
                                    id="azure-endpoint"
                                    value={azureOpenaiEndpoint}
                                    onChange={(e) => setAzureOpenaiEndpoint(e.target.value)}
                                    placeholder="https://your-resource.openai.azure.com/"
                                    className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="azure-api-version">Azure API Version</Label>
                                <Input
                                    id="azure-api-version"
                                    value={azureOpenaiApiVersion}
                                    onChange={(e) => setAzureOpenaiApiVersion(e.target.value)}
                                    placeholder="2024-02-15-preview"
                                    className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="azure-model">Azure OpenAI Model</Label>
                                <Input
                                    id="azure-model"
                                    value={azureOpenaiModel}
                                    onChange={(e) => setAzureOpenaiModel(e.target.value)}
                                    placeholder="gpt-4, gpt-35-turbo, etc."
                                    className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                />
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
