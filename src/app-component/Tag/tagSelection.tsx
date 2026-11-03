import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type SelectedTagFolderId = number | "ungrouped";

const TagSelectionContext = createContext<{
    selectedId: SelectedTagFolderId | null;
    select: (id: SelectedTagFolderId) => void;
    clear: () => void;
    tagFilter: string;
    setTagFilter: (value: string) => void;
} | null>(null);

export function TagSelectionProvider({ children }: { children: ReactNode }) {
    const [selectedId, setSelectedId] = useState<SelectedTagFolderId | null>(null);
    const [tagFilter, setTagFilter] = useState("");
    const select = useCallback((id: SelectedTagFolderId) => {
        setTagFilter("");
        setSelectedId(id);
    }, []);
    const clear = useCallback(() => setSelectedId(null), []);

    return (
        <TagSelectionContext.Provider
            value={{
                selectedId,
                select,
                clear,
                tagFilter,
                setTagFilter,
            }}
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
