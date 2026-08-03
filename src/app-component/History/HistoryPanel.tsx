import { scriptApi } from "@/store/api/scriptApi";
import SearchResultItem from "./SearchResultItem";
import dayjs from "dayjs";
import { useAppSelector } from "@/store/hooks";

export default function HistoryPanel() {
    const backendPort = useAppSelector((s) => s.config.backendPort);
    const { data: histories } = scriptApi.endpoints.getScriptHistories.useQuery(undefined, {
        skip: backendPort === 0,
    });

    return (
        <div className="h-full flex flex-col bg-white dark:bg-neutral-800 border-l border-gray-200 dark:border-neutral-700">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-neutral-700">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                    Script Execution History
                </h2>
                <p className="text-sm text-gray-600 dark:text-neutral-400 italic mt-1">
                    Latest shell scripts that have been executed in descending order
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {histories?.map((item) => (
                        <div key={item.history.id}>
                            <SearchResultItem
                                script={item.shellScript}
                                rootFolderId={item.rootFolderId}
                                parentFolderPath={item.parentFolderPath}
                                preview={
                                    <div className="flex text-xs text-neutral-500 dark:text-neutral-400 italic items-center gap-2">
                                        <div>Executed at</div>
                                        <div className="font-medium bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] p-1 rounded-md text-black dark:text-[rgba(255,255,255,0.5)]">
                                            {dayjs(item.history.executionTime).format(
                                                "YYYY-MM-DD HH:mm:ss"
                                            )}
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
