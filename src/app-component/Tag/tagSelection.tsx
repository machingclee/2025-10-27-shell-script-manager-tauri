import { createContext, useContext, useState, type ReactNode } from "react";

export type SelectedTagFolderId = number | "ungrouped";

const TagSelectionContext = createContext<{
    selectedId: SelectedTagFolderId | null;
    select: (id: SelectedTagFolderId) => void;
    clear: () => void;
} | null>(null);

export function TagSelectionProvider({ children }: { children: ReactNode }) {
    const [selectedId, setSelectedId] = useState<SelectedTagFolderId | null>(null);

    return (
        <TagSelectionContext.Provider
            value={{ selectedId, select: setSelectedId, clear: () => setSelectedId(null) }}
        >
            {children}
        </TagSelectionContext.Provider>
    );
}

export function useTagSelection() {
    const value = useContext(TagSelectionContext);
    if (!value) {
        throw new Error("useTagSelection must be used inside TagSelectionProvider");
    }
    return value;
}
