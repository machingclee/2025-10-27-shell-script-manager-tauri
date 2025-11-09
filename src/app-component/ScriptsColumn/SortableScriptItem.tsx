import { ShellScriptResponse } from "@/types/dto";
import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import React from "react";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import ScriptItem from "./ScriptItem";

export default function SortableScriptItem({
    script,
    parentFolderId,
}: {
    script: ShellScriptResponse;
    parentFolderId: number;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        setActivatorNodeRef,
    } = useSortable({
        id: script.id || 0,
        data: {
            type: "script",
            script: script,
        },
        animateLayoutChanges: (args) => {
            const { isSorting, wasDragging } = args;
            // Disable all animations when actively sorting or just finished dragging
            if (isSorting || wasDragging) return false;
            return defaultAnimateLayoutChanges(args);
        },
    });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transform ? "none" : transition, // Disable transition while transforming
        opacity: isDragging ? 0 : 1,
        width: "100%",
        touchAction: "none",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="flex items-center gap-2 w-full"
        >
            <div
                ref={setActivatorNodeRef}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 flex-shrink-0 dark:hover:bg-neutral-700"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <ScriptItem script={script} parentFolderId={parentFolderId} />
            </div>
        </div>
    );
}
