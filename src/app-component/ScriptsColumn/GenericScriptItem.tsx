import { ShellScriptDTO } from "@/types/dto";
import ScriptItem from "./ScriptItem";
import MarkdownItem from "./MarkdownItem";

export default function GenericScriptItem({
    script,
    parentFolderId,
    liteVersionDisplay,
    historyVersion = false,
    parentFolderPath = "",
}: {
    script: ShellScriptDTO;
    parentFolderId: number;
    liteVersionDisplay?: React.ReactNode;
    historyVersion?: boolean;
    parentFolderPath?: string;
}) {
    // Render MarkdownItem if it's a markdown script
    if (script.isMarkdown) {
        return (
            <MarkdownItem
                script={script}
                parentFolderId={parentFolderId}
                parentFolderPath={parentFolderPath}
            />
        );
    }

    // Otherwise render regular ScriptItem
    return (
        <ScriptItem
            script={script}
            parentFolderId={parentFolderId}
            liteVersionDisplay={liteVersionDisplay}
            historyVersion={historyVersion}
            parentFolderPath={parentFolderPath}
        />
    );
}
