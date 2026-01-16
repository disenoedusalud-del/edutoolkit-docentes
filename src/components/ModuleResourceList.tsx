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
    onDeleteResource: (id: string) => void;
    onDuplicateResource: (r: Resource) => void;
    onUpdateResource: (id: string, data: Partial<Resource>) => Promise<void>;
    onToggleFavorite?: (r: Resource) => void;
    onOpenResource?: (r: Resource) => void;
    onDeleteModule?: (id: string) => void;
    onUpdateModule?: (id: string, title: string, description?: string) => Promise<void>;
    onAddResource?: (moduleId: string, title: string, url: string) => Promise<void>;
}

export const ModuleResourceList = ({
    module,
    resources,
    isTeacher,
    favoriteIds,
    onDeleteResource,
    onDuplicateResource,
    onUpdateResource,
    onToggleFavorite,
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
    const [editDescription, setEditDescription] = useState(module.description || "");

    // Quick Add Resource State
    const [isAdding, setIsAdding] = useState(false);
    const [newResTitle, setNewResTitle] = useState("");
    const [newResUrl, setNewResUrl] = useState("");
    const [isSavingRes, setIsSavingRes] = useState(false);

    const handleSaveTitle = async () => {
        if (!editTitle.trim() || !onUpdateModule) return;
        await onUpdateModule(module.id, editTitle, editDescription);
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



    return (
        <div
            ref={setNodeRef}
            className={`bg-card rounded-lg shadow-sm border overflow-hidden transition-colors ${isOver ? 'border-2 border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-border'}`}
        >
            <div className="bg-muted px-6 py-3 border-b border-border">
                <div className="flex justify-between items-center mb-1">
                    {isEditing ? (
                        <div className="flex flex-col flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Título del módulo"
                                    className="flex-1 rounded-md border-border bg-background text-foreground px-2 py-1 text-sm font-semibold focus:ring-primary focus:border-primary"
                                    autoFocus
                                />
                            </div>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Descripción del módulo (opcional)"
                                className="w-full rounded-md border-border bg-background text-foreground px-2 py-1 text-xs focus:ring-primary focus:border-primary min-h-[60px] resize-none"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={handleSaveTitle}
                                    className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                >
                                    <Check size={14} /> Guardar
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setEditTitle(module.title); setEditDescription(module.description || ""); }}
                                    className="bg-muted-foreground/20 text-muted-foreground px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
                                >
                                    <X size={14} /> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-foreground">{module.title}</h3>
                                {!isTeacher && onUpdateModule && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-muted-foreground hover:text-indigo-500 transition-colors p-1"
                                        title="Editar módulo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152.06A16,16,0,0,0,32,163.37V208a16,16,0,0,0,16,16H92.63a16,16,0,0,0,11.31-4.69L227.31,96A16,16,0,0,0,227.31,73.37ZM92.63,208H48V163.37l116.69-116.7L209.31,91.31Z"></path></svg>
                                    </button>
                                )}
                            </div>
                            {module.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl">
                                    {module.description}
                                </p>
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

                {/* Quick Add Form Redesign */}
                {isAdding && (
                    <div className="mt-4 mb-2 p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-3">
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <Plus size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        value={newResTitle}
                                        onChange={(e) => setNewResTitle(e.target.value)}
                                        placeholder="Nombre del recurso (ej: Guía PDF)"
                                        className="w-full rounded-lg border-border bg-background pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a64.07,64.07,0,0,0-90.49,0l-16,16a8,8,0,0,0,11.32,11.32l16-16a48,48,0,0,1,67.88,67.88l-32,32a48,48,0,0,1-67.88,0,8,8,0,1,0-11.32,11.32,64,64,0,0,0,90.5,0l32-32A64.07,64.07,0,0,0,215.6,40.4Zm-83.31,155.3a8,8,0,0,0-11.32,0l-16,16a48,48,0,0,1-67.88-67.88l32-32a48,48,0,0,1,67.88,0,8,8,0,1,0,11.32-11.32,64,64,0,0,0-90.5,0l-32,32a64,64,0,0,0,90.5,90.5l16-16A8,8,0,0,0,132.29,195.7Z"></path></svg>
                                    </div>
                                    <input
                                        type="url"
                                        value={newResUrl}
                                        onChange={(e) => setNewResUrl(e.target.value)}
                                        placeholder="URL del enlace o archivo"
                                        className="w-full rounded-lg border-border bg-background pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleQuickAdd}
                                    disabled={!newResTitle.trim() || !newResUrl.trim() || isSavingRes}
                                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                >
                                    {isSavingRes ? "Guardando..." : "Agregar Link"}
                                </button>
                            </div>
                        </div>
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
