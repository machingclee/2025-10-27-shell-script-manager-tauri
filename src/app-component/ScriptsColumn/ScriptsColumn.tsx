import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { Plus, ScrollText, GripVertical } from 'lucide-react';
import ScriptItem from './ScriptItem';
import { Button } from '@/components/ui/button';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    defaultAnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from 'react';
import { scriptApi } from '@/store/api/scriptApi';
import { folderApi } from '@/store/api/folderApi';
import { ShellScriptDTO } from '@/types/dto';


interface SortableScriptItemProps {
    script: ShellScriptDTO;
    folderId: number;
}

const SortableScriptItem = React.memo(function SortableScriptItem({ script, folderId }: SortableScriptItemProps) {
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
        animateLayoutChanges: (args) => {
            const { wasDragging } = args;
            if (wasDragging) return false;
            return defaultAnimateLayoutChanges(args);
        },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
        width: '100%',
        touchAction: 'none',
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
                <ScriptItem script={script} folderId={folderId} />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.script.id === nextProps.script.id &&
        prevProps.script.name === nextProps.script.name &&
        prevProps.script.command === nextProps.script.command
    );
});

export default function ScriptsColumn() {
    const selectedFolderId = useAppSelector(s => s.folder.selectedFolderId);
    const backendPort = useAppSelector(s => s.config.backendPort);
    const { data: selectedFolder } = folderApi.endpoints.getAllFolders.useQueryState(undefined, {
        selectFromResult: (result) => ({
            data: result.data?.find(f => f.id === selectedFolderId)
        })
    })
    const { data: folderResponse, isLoading } = scriptApi.endpoints.getScriptsByFolder.useQuery(selectedFolderId ?? 0, {
        skip: !backendPort || !selectedFolderId,
    });
    const subFolders = folderResponse?.subfolders || [];
    const [createScript] = scriptApi.endpoints.createScript.useMutation();
    const [reorderScripts] = scriptApi.endpoints.reorderScripts.useMutation();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCommand, setNewCommand] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        console.log('active', active);
        console.log('over', over);
        if (over && active.id !== over.id && folderResponse && selectedFolderId) {
            console.log('folderResponse', folderResponse);
            console.log('selectedFolderId', selectedFolderId);
            const oldIndex = folderResponse.shellScripts.findIndex((s) => s.id === active.id);
            const newIndex = folderResponse.shellScripts.findIndex((s) => s.id === over.id);

            console.log('oldIndex', oldIndex);
            console.log('newIndex', newIndex);
            if (oldIndex !== -1 && newIndex !== -1) {
                console.log('reordering scripts');
                reorderScripts({ folderId: selectedFolderId, fromIndex: oldIndex, toIndex: newIndex })
                    .unwrap()
                    .catch((error) => {
                        console.error('Failed to reorder scripts:', error);
                    });
            }
        }
    };

    const handleCreate = async () => {
        if (!selectedFolderId) return;

        await createScript({
            name: newName,
            content: newCommand,
            folderId: selectedFolderId,
        });

        setNewName('');
        setNewCommand('');
        setIsCreateOpen(false);
    };

    const scriptIds = React.useMemo(() => folderResponse?.shellScripts.map(s => s.id) || [], [folderResponse]);
    const displayName = () => {
        if (selectedFolder) {
            return <div>Scripts in  <span className='font-bold text-[18px]' >{selectedFolder.name}</span></div>;
        }
        return <Label>Scripts</Label>;
    }

    return (
        <div className="flex flex-col h-full dark:text-white">
            <div className='flex items-center justify-between'>
                <div className="flex items-center gap-2 p-4">
                    <ScrollText />
                    <div className="font-medium">{displayName()}</div>
                </div>
                <Button
                    variant="ghost"
                    className="bg-white p-1 rounded-md border-0 !shadow-none transition-transform duration-150 hover:bg-gray-300 focus:ring-0 mr-4 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
                    disabled={!selectedFolderId}
                    onClick={() => setIsCreateOpen(true)}
                >
                    <Plus className="w-4 h-4" /> Add Script
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700">
                        <DialogHeader>
                            <DialogTitle>Create New Script</DialogTitle>
                            <DialogDescription>
                                Add a new script with a name and command.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-name">Name</Label>
                                <Input
                                    className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                    id="new-name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Script name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-command">Command</Label>
                                <Textarea
                                    id="new-command"
                                    value={newCommand}
                                    onChange={(e) => setNewCommand(e.target.value)}
                                    placeholder="Command to execute"
                                    rows={4}
                                    className="font-mono text-sm  bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={!newName || !newCommand}>
                                Create Script
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="h-px bg-gray-400 dark:bg-neutral-600" />
            <div className="space-y-2 p-4 overflow-y-auto flex-1">
                {isLoading && <div>Loading...</div>}
                {folderResponse && folderResponse.shellScripts && folderResponse.shellScripts.length > 0 && selectedFolderId && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={folderResponse.shellScripts.map(s => ({ id: s.id || 0 }))}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-4">
                                {folderResponse.shellScripts.map((script) => (
                                    <SortableScriptItem
                                        key={script.id}
                                        script={script}
                                        folderId={selectedFolderId}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div >

    )
}