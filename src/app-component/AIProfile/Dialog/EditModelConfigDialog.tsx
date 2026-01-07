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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ModelConfigDTO } from "@/types/dto";
import { useState, useEffect } from "react";

export const EditModelConfigDialog = (props: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    modelConfig: ModelConfigDTO | null;
    onSave: (config: ModelConfigDTO) => void;
}) => {
    const { isOpen, setIsOpen, modelConfig, onSave } = props;

    const [name, setName] = useState("");
    const [modelSource, setModelSource] = useState<"OPENAI" | "AZURE_OPENAI" | "CUSTOM">("OPENAI");

    useEffect(() => {
        if (modelConfig) {
            setName(modelConfig.name);
            setModelSource(modelConfig.modelSource);
        }
    }, [modelConfig]);

    const handleSave = () => {
        if (modelConfig) {
            onSave({
                ...modelConfig,
                name,
                modelSource,
            });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
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
                            <SelectContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[9999]">
                                <SelectItem value="OPENAI">OpenAI</SelectItem>
                                <SelectItem value="AZURE_OPENAI">Azure OpenAI</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
