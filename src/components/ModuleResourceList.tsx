import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ResourceItem } from './ResourceItem';
import { Resource } from '@/lib/resources';
import { CourseModule } from '@/lib/modules';
import { Trash, Plus, Check, X } from '@phosphor-icons/react';

interface ModuleResourceListProps {
    module: CourseModule;
    resources: Resource[];
    isTeacher: boolean;
    favoriteIds: Set<string>;
    completedIds?: Set<string>;
    onDeleteResource: (id: string) => void;
    onDuplicateResource: (r: Resource) => void;
    onUpdateResource: (id: string, data: Partial<Resource>) => Promise<void>;
    onToggleFavorite?: (r: Resource) => void;
    onToggleCompleted?: (r: Resource) => void;
    onOpenResource?: (r: Resource) => void;
    onDeleteModule?: (id: string) => void;
    onUpdateModule?: (id: string, title: string) => Promise<void>;
    onAddResource?: (moduleId: string, title: string, url: string) => Promise<void>;
}

export const ModuleResourceList = ({
    module,
    resources,
    isTeacher,
    favoriteIds,
    completedIds,
    onDeleteResource,
    onDuplicateResource,
    onUpdateResource,
    onToggleFavorite,
    onToggleCompleted,
    onOpenResource,
    onDeleteModule,
    onUpdateModule,
    onAddResource
}: ModuleResourceListProps) => {
    // Make the entire module container droppable
    const { setNodeRef, isOver } = useDroppable({
        id: `module-${module.id}`,
        data: { type: 'module', module }
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(module.title);

    // Quick Add Resource State
    const [isAdding, setIsAdding] = useState(false);
    const [newResTitle, setNewResTitle] = useState("");
    const [newResUrl, setNewResUrl] = useState("");
    const [isSavingRes, setIsSavingRes] = useState(false);

    const handleSaveTitle = async () => {
        if (!editTitle.trim() || !onUpdateModule) return;
        await onUpdateModule(module.id, editTitle);
        setIsEditing(false);
    };

    const handleQuickAdd = async () => {
        if (!newResTitle.trim() || !newResUrl.trim() || !onAddResource) return;
        setIsSavingRes(true);
        try {
            await onAddResource(module.id, newResTitle, newResUrl);
            setNewResTitle("");
            setNewResUrl("");
            setIsAdding(false);
        } catch (error) {
            console.error("Error adding resource:", error);
        } finally {
            setIsSavingRes(false);
        }
    };

    // Calculate progress
    const totalResources = resources.length;
    const completedCount = resources.filter(r => completedIds?.has(r.id)).length;
    const progressPercent = totalResources > 0 ? Math.round((completedCount / totalResources) * 100) : 0;

    return (
        <div
            ref={setNodeRef}
            className={`bg-card rounded-lg shadow-sm border overflow-hidden transition-colors ${isOver ? 'border-2 border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-border'}`}
        >
            <div className="bg-muted px-6 py-3 border-b border-border">
                <div className="flex justify-between items-center mb-1">
                    {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 mr-4">
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="flex-1 rounded-md border-border bg-background text-foreground px-2 py-1 text-sm focus:ring-primary focus:border-primary"
                                autoFocus
                            />
                            <button
                                onClick={handleSaveTitle}
                                className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); setEditTitle(module.title); }}
                                className="bg-muted-foreground/20 text-muted-foreground px-2 py-1 rounded text-xs"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{module.title}</h3>
                            {!isTeacher && onUpdateModule && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-muted-foreground hover:text-indigo-500 transition-colors p-1"
                                    title="Editar nombre del módulo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152.06A16,16,0,0,0,32,163.37V208a16,16,0,0,0,16,16H92.63a16,16,0,0,0,11.31-4.69L227.31,96A16,16,0,0,0,227.31,73.37ZM92.63,208H48V163.37l116.69-116.7L209.31,91.31Z"></path></svg>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        {/* Quick Add Button */}
                        {!isTeacher && onAddResource && !isEditing && (
                            <button
                                onClick={() => setIsAdding(!isAdding)}
                                className={`transition-colors p-1 rounded-md ${isAdding ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-muted-foreground hover:text-indigo-500'}`}
                                title="Agregar recurso a este módulo"
                            >
                                <Plus size={16} weight={isAdding ? "bold" : "regular"} />
                            </button>
                        )}

                        {!isTeacher && onDeleteModule && !isEditing && (
                            <button
                                onClick={() => onDeleteModule(module.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                title="Eliminar módulo"
                            >
                                <Trash size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Add Form */}
                {isAdding && (
                    <div className="mt-3 mb-2 p-3 bg-background rounded-md border border-indigo-200 dark:border-indigo-800 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={newResTitle}
                                onChange={(e) => setNewResTitle(e.target.value)}
                                placeholder="Título del recurso..."
                                className="w-full rounded border-border bg-background px-2 py-1.5 text-xs focus:ring-primary focus:border-primary"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newResUrl}
                                    onChange={(e) => setNewResUrl(e.target.value)}
                                    placeholder="URL (https://...)"
                                    className="flex-1 rounded border-border bg-background px-2 py-1.5 text-xs focus:ring-primary focus:border-primary"
                                />
                                <button
                                    onClick={handleQuickAdd}
                                    disabled={!newResTitle.trim() || !newResUrl.trim() || isSavingRes}
                                    className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingRes ? "..." : "Agregar"}
                                </button>
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Bar (Visible for teacher/student view mostly, but nice for admin too) */}
                {totalResources > 0 && isTeacher && (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                            {completedCount}/{totalResources} completados
                        </span>
                    </div>
                )}
            </div>
            <div className="p-0 min-h-[60px]"> {/* Min height to ensure drop target exists */}
                <SortableContext
                    items={resources.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <ul className="divide-y divide-border min-h-[50px]">
                        {resources.map(res => (
                            <ResourceItem
                                key={res.id}
                                resource={res}
                                onDelete={onDeleteResource}
                                onDuplicate={onDuplicateResource}
                                onUpdate={onUpdateResource}
                                moduleName={module.title}
                                modules={[]} // Not needed here just for display
                                isDraggable={!isTeacher}
                                isFavorite={favoriteIds.has(res.id)}
                                onToggleFavorite={onToggleFavorite}
                                isCompleted={completedIds?.has(res.id)}
                                onToggleCompleted={onToggleCompleted}
                                onOpen={onOpenResource}
                            />
                        ))}
                        {resources.length === 0 && (
                            <li className="py-8 px-6 text-center text-muted-foreground text-xs italic pointer-events-none">
                                {isTeacher ? "Este módulo no tiene contenido aún." : "Arrastra recursos aquí"}
                            </li>
                        )}
                    </ul>
                </SortableContext>
            </div>
        </div>
    );
};
