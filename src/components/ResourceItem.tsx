import { LinkSimple, Trash, Copy, Link as LinkIcon, YoutubeLogo, GoogleDriveLogo, PencilSimple, DotsSixVertical, Check, X, Star, Cloud, VideoCamera, FilePdf, Globe, FileText, MonitorPlay } from "@phosphor-icons/react";
import { Resource } from "@/lib/resources";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";
import { CourseModule } from "@/lib/modules";

interface ResourceItemProps {
    resource: Resource;
    onDelete: (id: string) => void;
    onDuplicate: (res: Resource) => void;
    onUpdate: (id: string, data: Partial<Resource>) => Promise<void>;
    moduleName?: string;
    isDraggable?: boolean;
    modules: CourseModule[];
    // User interactions
    isFavorite?: boolean;
    onToggleFavorite?: (res: Resource) => void;
    isCompleted?: boolean;
    onToggleCompleted?: (res: Resource) => void;
    onOpen?: (res: Resource) => void;
}

export function ResourceItem({
    resource,
    onDelete,
    onDuplicate,
    onUpdate,
    moduleName,
    isDraggable,
    modules,
    isFavorite = false,
    onToggleFavorite,
    isCompleted = false,
    onToggleCompleted,
    onOpen
}: ResourceItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: resource.id, disabled: !isDraggable });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : (isCompleted && !isDraggable ? 0.6 : 1), // Dim if completed
        zIndex: isDragging ? 999 : 'auto',
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(resource.title);
    const [editUrl, setEditUrl] = useState(resource.url);
    const [editModuleId, setEditModuleId] = useState(resource.moduleId || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setEditTitle(resource.title);
            setEditUrl(resource.url);
            setEditModuleId(resource.moduleId || "");
        }
    }, [isEditing, resource]);

    const handleSave = async () => {
        if (!editTitle.trim() || !editUrl.trim()) return;
        setSaving(true);
        try {
            await onUpdate(resource.id, {
                title: editTitle,
                url: editUrl,
                moduleId: editModuleId || null as any,
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update", error);
        } finally {
            setSaving(false);
        }
    };

    // Tailwind Safelist for Dynamic Classes
    // bg-red-50 bg-blue-50 bg-emerald-50 bg-sky-50 bg-rose-50 bg-purple-50 bg-indigo-50 
    // border-red-100 border-blue-100 border-emerald-100 border-sky-100 border-rose-100 border-purple-100 border-indigo-100
    const getResourceConfig = (type: string, url: string = "") => {
        const lowerUrl = url.toLowerCase();

        // 1. Specific Services
        if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be") || lowerUrl.includes("vimeo")) {
            return {
                icon: <YoutubeLogo size={24} className="text-red-600" weight="fill" />,
                bgClass: "bg-red-50 border-red-100 text-red-600"
            };
        }
        if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) {
            // Differentiate excel/sheets? For now generic drive Green/Blue
            if (lowerUrl.includes("spreadsheets") || lowerUrl.includes("sheets")) {
                return {
                    icon: <FileText size={24} className="text-emerald-600" weight="fill" />, // Sheet icon ideal but FileText works
                    bgClass: "bg-emerald-50 border-emerald-100 text-emerald-600"
                };
            }
            return {
                icon: <GoogleDriveLogo size={24} className="text-blue-600" weight="fill" />, // Drive is tricolor, Blue looks Pro
                bgClass: "bg-blue-50 border-blue-100 text-blue-600"
            };
        }
        if (lowerUrl.includes("zoom.us") || lowerUrl.includes("meet.google.com") || lowerUrl.includes("teams.microsoft")) {
            return {
                icon: <VideoCamera size={24} className="text-sky-600" weight="fill" />,
                bgClass: "bg-sky-50 border-sky-100 text-sky-600"
            };
        }

        // 2. File Types
        if (lowerUrl.endsWith(".pdf")) {
            return {
                icon: <FilePdf size={24} className="text-rose-600" weight="fill" />,
                bgClass: "bg-rose-50 border-rose-100 text-rose-600"
            };
        }
        if (lowerUrl.endsWith(".doc") || lowerUrl.endsWith(".docx")) {
            return {
                icon: <FileText size={24} className="text-blue-700" weight="fill" />,
                bgClass: "bg-blue-50 border-blue-100 text-blue-700"
            };
        }
        if (lowerUrl.endsWith(".xls") || lowerUrl.endsWith(".xlsx") || lowerUrl.endsWith(".csv")) {
            return {
                icon: <FileText size={24} className="text-emerald-600" weight="fill" />,
                bgClass: "bg-emerald-50 border-emerald-100 text-emerald-600"
            };
        }

        // 3. Fallbacks by declared type
        if (type === 'video') {
            return {
                icon: <MonitorPlay size={24} className="text-purple-600" weight="fill" />,
                bgClass: "bg-purple-50 border-purple-100 text-purple-600"
            };
        }

        // Default
        return {
            icon: <Globe size={24} className="text-indigo-500" weight="duotone" />,
            bgClass: "bg-indigo-50 border-indigo-100 text-indigo-500"
        };
    };

    const { icon, bgClass } = getResourceConfig(resource.type, resource.url);

    if (isEditing) {
        return (
            <li className="p-4 bg-card border-l-4 border-l-primary/50" ref={setNodeRef} style={style}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault(); // Handle save
                        handleSave();
                    }}
                    className="space-y-3"
                >
                    <div className="grid grid-cols-1 gap-3">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="block w-full rounded-md border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                            placeholder="Título"
                            autoFocus // Focus on title when editing starts
                        />
                        <input
                            type="url"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="block w-full rounded-md border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                            placeholder="URL del recurso"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-colors"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </li>
        );
    }

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`
                group relative py-4 flex justify-between items-center border-b border-gray-100 last:border-0 pl-3 pr-4 transition-all duration-200 bg-card 
                hover:shadow-sm hover:translate-x-1 border-l-4 border-l-transparent hover:border-l-indigo-500
                ${!isDraggable ? 'cursor-pointer hover:bg-muted/30' : 'hover:bg-muted/30'}
                ${isDragging ? 'border-2 border-dashed border-indigo-500 bg-indigo-50 !opacity-50 !translate-x-0 !shadow-none' : ''}
                ${isCompleted && !isDraggable ? 'bg-muted/10' : ''}
            `}
            onClick={(e) => {
                // Determine if we should open the link (Teacher Mode)
                if (!isDraggable && onOpen) {
                    // Prevent firing if clicking specific action buttons or links directly
                    if ((e.target as HTMLElement).closest('button, a')) return;
                    onOpen(resource);
                }
            }}
        >
            <div className="flex items-center gap-4 flex-1">
                {isDraggable && (
                    <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DotsSixVertical size={24} />
                    </button>
                )}

                {!isDraggable && onToggleCompleted && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompleted(resource);
                        }}
                        className={`p-1.5 rounded-full transition-all duration-200 z-10 ${isCompleted
                            ? "text-green-600 bg-green-50 hover:bg-green-100"
                            : "text-gray-300 hover:text-green-500 hover:bg-green-50"
                            }`}
                        title={isCompleted ? "Marcar como pendiente" : "Marcar como visto"}
                    >
                        {isCompleted ? (
                            <Check size={20} weight="bold" />
                        ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-current" />
                        )}
                    </button>
                )}

                {/* Favorite Toggle (Teacher Mode) - Always visible or visible on hover/active */}
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(resource);
                        }}
                        className={`p-1.5 rounded-full transition-all duration-200 transform active:scale-125 ${isFavorite
                            ? "text-yellow-400 bg-yellow-50 hover:bg-yellow-100 opacity-100"
                            : "text-gray-300 hover:text-yellow-400 opacity-0 group-hover:opacity-100 hover:bg-yellow-50"
                            }`}
                        title={isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
                    >
                        <Star size={20} weight={isFavorite ? "fill" : "bold"} />
                    </button>
                )}

                {/* Icon Container with Dynamic Background */}
                <div className={`flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0 transition-colors ${bgClass} ${isCompleted && !isDraggable ? 'opacity-70 grayscale-[50%]' : ''}`}>
                    {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold text-foreground group-hover:text-indigo-700 transition-colors ${isCompleted && !isDraggable ? 'line-through text-muted-foreground' : ''}`}>
                            {resource.title}
                        </span>
                        {moduleName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-muted-foreground border border-gray-200 uppercase tracking-wide">
                                {moduleName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-indigo-600 truncate max-w-md block hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {resource.url}
                        </a>
                    </div>
                </div>
            </div>

            {/* Admin Actions */}
            {isDraggable && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                    >
                        <PencilSimple size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(resource); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Duplicar"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(resource.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                    >
                        <Trash size={18} />
                    </button>
                </div>
            )}

            {/* Visual Arrow for Clickable (Teacher Mode) */}
            {!isDraggable && (
                <div className="text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:translate-x-0 translate-x-2">
                    <LinkSimple size={20} weight="bold" />
                </div>
            )}

            {/* Tailwind Force-Generate Classes (Hidden) */}
            <div className="hidden bg-red-50 border-red-100 text-red-600 bg-blue-50 border-blue-100 text-blue-600 bg-emerald-50 border-emerald-100 text-emerald-600 bg-sky-50 border-sky-100 text-sky-600 bg-rose-50 border-rose-100 text-rose-600 bg-purple-50 border-purple-100 text-purple-600 bg-indigo-50 border-indigo-100 text-indigo-500 hover:bg-yellow-50 hover:bg-green-50"></div>
        </li>
    );
}
