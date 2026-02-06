import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AiScriptedToolDTO, ScriptsFolderResponse } from "@/types/dto";
import { workspaceApi } from "@/store/api/workspaceApi";
import { useState, useEffect, useMemo } from "react";

export const UpsertScriptedToolDialog = (props: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    scriptedTool: AiScriptedToolDTO | null;
    onSave: (tool: AiScriptedToolDTO) => void;
    existingTools?: AiScriptedToolDTO[];
}) => {
    const { isOpen, setIsOpen, scriptedTool, onSave, existingTools = [] } = props;

    const { data: workspaces } = workspaceApi.endpoints.getAllWorkspaces.useQuery();

    const [name, setName] = useState("");
    const [toolDescription, setToolDescription] = useState("");
    const [isEnabled, setIsEnabled] = useState(false);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);

    // Get selected workspace data
    const selectedWorkspace = useMemo(() => {
        return workspaces?.find((w) => w.id === selectedWorkspaceId);
    }, [workspaces, selectedWorkspaceId]);

    // Get all folders from selected workspace (flat list including subfolders)
    const allFolders = useMemo(() => {
        if (!selectedWorkspace) return [];

        const flattenFolders = (
            folders: ScriptsFolderResponse[],
            prefix = ""
        ): Array<{ folder: ScriptsFolderResponse; displayName: string }> => {
            const result: Array<{ folder: ScriptsFolderResponse; displayName: string }> = [];
            for (const folder of folders) {
                const displayName = prefix ? `${prefix} / ${folder.name}` : folder.name;
                result.push({ folder, displayName });
                if (folder.subfolders.length > 0) {
                    result.push(...flattenFolders(folder.subfolders, displayName));
                }
            }
            return result;
        };

        return flattenFolders(selectedWorkspace.folders);
    }, [selectedWorkspace]);

    // Get selected folder data
    const selectedFolder = useMemo(() => {
        return allFolders.find((f) => f.folder.id === selectedFolderId)?.folder;
    }, [allFolders, selectedFolderId]);

    // Get scripts from selected folder
    const scripts = useMemo(() => {
        return selectedFolder?.shellScripts || [];
    }, [selectedFolder]);

    // Get set of script IDs already in use (excluding current editing tool)
    const usedScriptIds = useMemo(() => {
        const ids = new Set<number>();
        existingTools.forEach((tool) => {
            // Don't mark as used if this is the tool we're currently editing
            if (!scriptedTool || tool.id !== scriptedTool.id) {
                ids.add(tool.shellScriptId);
            }
        });
        return ids;
    }, [existingTools, scriptedTool]);

    useEffect(() => {
        if (scriptedTool) {
            setName(scriptedTool.name);
            setToolDescription(scriptedTool.toolDescription);
            setIsEnabled(scriptedTool.isEnabled);
            setSelectedScriptId(scriptedTool.shellScriptId);

            // Find workspace and folder that contains this script
            if (workspaces && scriptedTool.shellScriptId) {
                for (const workspace of workspaces) {
                    const findScriptInFolders = (
                        folders: ScriptsFolderResponse[]
                    ): { workspaceId: number; folderId: number } | null => {
                        for (const folder of folders) {
                            // Check if script is in this folder
                            if (
                                folder.shellScripts.some((s) => s.id === scriptedTool.shellScriptId)
                            ) {
                                return { workspaceId: workspace.id, folderId: folder.id };
                            }
                            // Check subfolders recursively
                            const result = findScriptInFolders(folder.subfolders);
                            if (result) return result;
                        }
                        return null;
                    };

                    const result = findScriptInFolders(workspace.folders);
                    if (result) {
                        setSelectedWorkspaceId(result.workspaceId);
                        setSelectedFolderId(result.folderId);
                        break;
                    }
                }
            }
        } else {
            // Reset for create mode
            setName("");
            setToolDescription("");
            setIsEnabled(false);
            setSelectedWorkspaceId(null);
            setSelectedFolderId(null);
            setSelectedScriptId(null);
        }
    }, [scriptedTool, isOpen, workspaces]);

    // Reset folder selection when workspace changes (only in create mode)
    useEffect(() => {
        if (!scriptedTool) {
            setSelectedFolderId(null);
            setSelectedScriptId(null);
        }
    }, [selectedWorkspaceId, scriptedTool]);

    // Reset script selection when folder changes (only in create mode)
    useEffect(() => {
        if (!scriptedTool) {
            setSelectedScriptId(null);
        }
    }, [selectedFolderId, scriptedTool]);

    const handleSave = () => {
        if (scriptedTool) {
            onSave({
                ...scriptedTool,
                name,
                toolDescription,
                isEnabled,
                shellScriptId: selectedScriptId!,
            });
        } else {
            // Create mode - need scriptId
            onSave({
                id: 0,
                shellScriptId: selectedScriptId!,
                name,
                toolDescription,
                isEnabled,
                createdAt: 0,
                createdAtHk: "",
            });
        }
        setIsOpen(false);
    };

    const isSaveDisabled = !name.trim() || !toolDescription.trim() || !selectedScriptId;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen} key={isOpen ? "open" : "closed"}>
            <DialogContent
                overlayClassName="bg-black/50 z-[9999]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 max-w-2xl z-[10000]"
            >
                <DialogHeader>
                    <DialogTitle>
                        {scriptedTool ? "Edit AI Scripted Tool" : "Create AI Scripted Tool"}
                    </DialogTitle>
                    <DialogDescription>
                        {scriptedTool
                            ? "Update the scripted tool configuration."
                            : "Create a new AI scripted tool."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="workspace-select">Workspace</Label>
                            <Select
                                value={selectedWorkspaceId?.toString() || ""}
                                onValueChange={(value) => setSelectedWorkspaceId(Number(value))}
                            >
                                <SelectTrigger
                                    id="workspace-select"
                                    className="h-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-800 hover:border-gray-400 dark:hover:border-gray-500 focus:border-gray-500 dark:focus:border-gray-400 dark:text-white disabled:opacity-50 transition-colors"
                                >
                                    <SelectValue placeholder="Select workspace" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-100 dark:bg-neutral-700 dark:text-white border-2 border-gray-300 dark:border-gray-600 shadow-lg max-h-[300px] z-[10001]">
                                    {workspaces?.map((workspace) => (
                                        <SelectItem
                                            key={workspace.id}
                                            value={workspace.id.toString()}
                                        >
                                            {workspace.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="folder-select">Folder</Label>
                            <Select
                                value={selectedFolderId?.toString() || ""}
                                onValueChange={(value) => setSelectedFolderId(Number(value))}
                                disabled={!selectedWorkspaceId}
                            >
                                <SelectTrigger
                                    id="folder-select"
                                    className="h-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-800 hover:border-gray-400 dark:hover:border-gray-500 focus:border-gray-500 dark:focus:border-gray-400 dark:text-white disabled:opacity-50 disabled:border-gray-300 dark:disabled:border-gray-600 transition-colors"
                                >
                                    <SelectValue placeholder="Select folder" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-100 dark:bg-neutral-700 dark:text-white border-2 border-gray-300 dark:border-gray-600 shadow-lg max-h-[300px] z-[10001]">
                                    {allFolders.map(({ folder, displayName }) => (
                                        <SelectItem key={folder.id} value={folder.id.toString()}>
                                            {displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="script-select">Script</Label>
                            <Select
                                value={selectedScriptId?.toString() || ""}
                                onValueChange={(value) => setSelectedScriptId(Number(value))}
                                disabled={!selectedFolderId}
                            >
                                <SelectTrigger
                                    id="script-select"
                                    className="h-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-800 hover:border-gray-400 dark:hover:border-gray-500 focus:border-gray-500 dark:focus:border-gray-400 dark:text-white disabled:opacity-50 disabled:border-gray-300 dark:disabled:border-gray-600 transition-colors"
                                >
                                    <SelectValue placeholder="Select script" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-100 dark:bg-neutral-700 dark:text-white border-2 border-gray-300 dark:border-gray-600 shadow-lg max-h-[300px] z-[10001]">
                                    {scripts.map((script) => {
                                        const isUsed = usedScriptIds.has(script.id);
                                        return (
                                            <SelectItem
                                                key={script.id}
                                                value={script.id.toString()}
                                                disabled={isUsed}
                                                className={isUsed ? "opacity-40" : ""}
                                            >
                                                {script.name}
                                                {isUsed ? " (already added)" : ""}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                    <div className="grid gap-2">
                        <Label htmlFor="tool-name">Name</Label>
                        <Input
                            id="tool-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tool name"
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tool-description">Description</Label>
                        <Textarea
                            id="tool-description"
                            value={toolDescription}
                            onChange={(e) => setToolDescription(e.target.value)}
                            placeholder="Tool description"
                            rows={6}
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="tool-enabled">Enabled</Label>
                        <Switch
                            id="tool-enabled"
                            checked={isEnabled}
                            onCheckedChange={setIsEnabled}
                        />
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
                        disabled={isSaveDisabled}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white disabled:opacity-50"
                    >
                        {scriptedTool ? "Save Changes" : "Create Tool"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
