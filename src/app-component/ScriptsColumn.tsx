import { scriptApi } from '@/store/api/scriptApi';
import { useAppSelector } from '@/store/hooks';
import { ScrollText } from 'lucide-react';

export default function ScriptsColumn() {
    const selectedFolderId = useAppSelector(s => s.folder.selectedFolderId);
    const { data: scripts, isLoading } = scriptApi.endpoints.getScriptsByFolder.useQuery(selectedFolderId ?? 0);
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-4">
                <ScrollText />
                <div className="font-medium">Scripts</div>
            </div>
            <div className="h-px bg-gray-400" />
            <div className="space-y-1 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}
                {scripts && scripts.map((script) => (
                    <div key={script.id}>
                        <div>{script.name}</div>
                        <div>{script.command}</div>
                    </div>
                ))}
            </div>
        </div>

    )
}