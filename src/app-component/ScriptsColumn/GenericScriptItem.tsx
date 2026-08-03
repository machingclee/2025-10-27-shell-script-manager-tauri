import { ShellScriptDTO, ShellScriptResponse } from "@/types/dto";
import ScriptItem from "./ScriptItem";
import MarkdownItem from "./MarkdownItem";

export type ScriptItemVariant = "default" | "history" | "search";

export default function GenericScriptItem({
    script,
    parentFolderId,
    liteVersionDisplay,
    /** @deprecated use variant instead */
    historyVersion = false,
    /** @deprecated use variant instead */
    searchResultVersion = false,
    parentFolderPath = "",
    variant,
}: {
    script: ShellScriptDTO | ShellScriptResponse;
    parentFolderId: number;
    liteVersionDisplay?: React.ReactNode;
    historyVersion?: boolean;
    searchResultVersion?: boolean;
    parentFolderPath?: string;
    /**
     * - default: full script/markdown actions
     * - history: execute/open only (no edit/delete/move)
     * - search: only navigate to workspace root folder
     */
    variant?: ScriptItemVariant;
}) {
    const resolvedVariant: ScriptItemVariant =
        variant ??
        (searchResultVersion ? "search" : historyVersion ? "history" : "default");

    if (script.isMarkdown) {
        return (
            <MarkdownItem
                script={script}
                parentFolderId={parentFolderId}
                parentFolderPath={parentFolderPath}
                liteVersionDisplay={liteVersionDisplay}
                variant={resolvedVariant}
            />
        );
    }

    return (
        <ScriptItem
            script={script}
            parentFolderId={parentFolderId}
            liteVersionDisplay={liteVersionDisplay}
            parentFolderPath={parentFolderPath}
            variant={resolvedVariant}
        />
    );
}
