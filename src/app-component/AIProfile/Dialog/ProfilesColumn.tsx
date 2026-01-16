import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { appStateApi } from "@/store/api/appStateApi";
import { useAppSelector } from "@/store/hooks";
import { AIProfileDTO } from "@/types/dto";
import dayjs from "dayjs";
import { Edit, Plus, Trash2 } from "lucide-react";

interface ProfilesColumnProps {
    profiles: AIProfileDTO[];
    selectedProfile: AIProfileDTO | null;
    onSelectProfile: (profile: AIProfileDTO) => void;
    onEditProfile: (profile: AIProfileDTO) => void;
    onCreateProfile: () => void;
    onDeleteProfile: (profile: AIProfileDTO) => void;
}

export const ProfilesColumn = ({
    profiles,
    selectedProfile,
    onSelectProfile,
    onEditProfile,
    onCreateProfile,
    onDeleteProfile,
}: ProfilesColumnProps) => {
    return (
        <div className="border-r border-gray-200 dark:border-neutral-600 pr-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">PROFILES</h3>
                <Button
                    size="sm"
                    onClick={onCreateProfile}
                    className="h-7 px-2 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                </Button>
            </div>
            <div className="space-y-2">
                {profiles.map((profile: AIProfileDTO) => (
                    <ContextMenu key={profile.id}>
                        <ContextMenuTrigger asChild>
                            <div
                                onClick={() => onSelectProfile(profile)}
                                onContextMenu={(e) => e.stopPropagation()}
                                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                    selectedProfile?.id === profile.id
                                        ? "bg-blue-100 border-blue-300 dark:bg-neutral-600 dark:border-neutral-500"
                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-neutral-700/50 dark:border-neutral-600 dark:hover:bg-neutral-700"
                                }`}
                            >
                                <div className="font-medium truncate">{profile.name}</div>
                                {profile.description && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                        {profile.description}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                    {profile.createdAt && (
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            {dayjs(profile.createdAt).format("YYYY-MM-DD")}
                                        </div>
                                    )}
                                    {profile.selectedModelConfigId ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            Model Config Selected
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            No Model Config
                                        </span>
                                    )}
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-white dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[9999]">
                            <ContextMenuItem
                                onClick={() => onEditProfile(profile)}
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-700"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => onDeleteProfile(profile)}
                                className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Profile
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ))}
            </div>
        </div>
    );
};
