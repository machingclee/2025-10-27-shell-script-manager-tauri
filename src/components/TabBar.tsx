import { useCallback, useState } from "react";
import {
    AppTab,
    closeTab,
    setActiveTab,
    setRightPanelMode,
    reorderTabs,
} from "../store/slices/appSlice";
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    closestCenter,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Home, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { scriptApi } from "../store/api/scriptApi";
import { openHistory } from "../store/slices/historySlice";
import { useTagSelection } from "../app-component/Tag/tagSelection";

function TabPill({
    tab,
    isActive,
    onActivate,
    onClose,
}: {
    tab: AppTab;
    isActive: boolean;
    onActivate: () => void;
    onClose?: () => void;
}) {
    const { data: script } = scriptApi.endpoints.getScriptById.useQuery(tab.scriptId, {
        skip: tab.type === "home",
    });

    const hasChanges = useAppSelector(
        (s) => tab.type === "markdown" && (s.app.tab.tabStates[tab.scriptId]?.hasChanges ?? false)
    );

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: tab.scriptId,
        disabled: tab.type === "home",
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onMouseDown={(e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
            onMouseUp={(e) => {
                if (e.button === 1 && onClose && !hasChanges) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }
            }}
            onClick={onActivate}
            className={cn(
                "w-full flex flex-1 items-center gap-1.5 px-3 h-8 select-none rounded-md border transition-colors",
                tab.type !== "home" && "cursor-grab active:cursor-grabbing",
                isActive
                    ? "bg-[#505052] text-white border-[#505052]"
                    : "bg-transparent text-neutral-500 border-transparent hover:text-neutral-200 hover:bg-neutral-800/40"
            )}
        >
            {tab.type === "home" ? (
                <Home className="w-4 h-4 flex-shrink-0" />
            ) : (
                <FileText className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="max-w-[140px] truncate">
                {tab.type === "home" ? "Home" : (script?.name ?? tab.scriptName)}
            </span>
            {onClose && (
                <button
                    className={cn(
                        "ml-0.5 p-0.5 rounded hover:bg-neutral-600 text-neutral-500 hover:text-white",
                        hasChanges && "pointer-events-none"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!hasChanges) onClose();
                    }}
                >
                    {hasChanges ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />
                    ) : (
                        <X className="w-4 h-4 text-white" />
                    )}
                </button>
            )}
        </div>
    );
}

export default function TabBar() {
    const dispatch = useAppDispatch();
    const { clear: clearTagSelection } = useTagSelection();
    const tabs = useAppSelector((s) => s.app.tab.tabs);
    const activeTabId = useAppSelector((s) => s.app.tab.activeTabId);
    const rightPanelMode = useAppSelector((s) => s.app.rightPanel.mode);

    const [activeDragId, setActiveDragId] = useState<number | null>(null);
    const activeDragTab =
        activeDragId !== null ? tabs.find((t) => t.scriptId === activeDragId) : null;

    const tabSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleTabDragStart = useCallback((event: DragStartEvent) => {
        setActiveDragId(event.active.id as number);
    }, []);

    const handleTabDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || active.id === over.id) {
                setActiveDragId(null);
                return;
            }
            const fromIdx = tabs.findIndex((t) => t.scriptId === active.id);
            const toIdx = tabs.findIndex((t) => t.scriptId === over.id);
            if (fromIdx !== -1 && toIdx !== -1 && toIdx !== 0) {
                dispatch(reorderTabs({ fromIndex: fromIdx, toIndex: toIdx }));
            }
            setActiveDragId(null);
        },
        [tabs, dispatch]
    );

    return (
        <DndContext
            sensors={tabSensors}
            collisionDetection={closestCenter}
            onDragStart={handleTabDragStart}
            onDragEnd={handleTabDragEnd}
        >
            <SortableContext
                items={tabs.filter((t) => t.type !== "home").map((t) => t.scriptId)}
                strategy={horizontalListSortingStrategy}
            >
                <div
                    className="flex-shrink-0 flex items-end gap-0.5 px-2 bg-transparent overflow-x-auto"
                    style={{ height: 36 }}
                >
                    {tabs.map((tab) => (
                        <TabPill
                            key={tab.scriptId}
                            tab={tab}
                            isActive={tab.scriptId === activeTabId}
                            onActivate={() => {
                                dispatch(setActiveTab(tab.scriptId));
                                if (tab.type !== "home") return;
                                clearTagSelection();
                                if (rightPanelMode === "TAG") {
                                    dispatch(setRightPanelMode("HISTORY"));
                                    dispatch(openHistory());
                                }
                            }}
                            onClose={
                                tab.type !== "home"
                                    ? () => dispatch(closeTab(tab.scriptId))
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
                {activeDragTab ? (
                    <div
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-8 select-none rounded-md border",
                            activeDragTab.scriptId === activeTabId
                                ? "bg-[#505052] text-white border-[#505052]"
                                : "bg-neutral-800 text-neutral-200 border-neutral-600",
                            "shadow-lg opacity-90"
                        )}
                    >
                        {activeDragTab.type === "home" ? (
                            <Home className="w-3 h-3 flex-shrink-0" />
                        ) : (
                            <FileText className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span className="max-w-[140px] truncate">
                            {activeDragTab.type === "home" ? "Home" : activeDragTab.scriptName}
                        </span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
