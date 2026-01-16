"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { ensureUserProfile, UserProfile, isAdmin } from "@/lib/users";
import { Course, updateCourseDetails } from "@/lib/courses";
import { doc, getDoc } from "firebase/firestore";
import {
    createResource,
    getCourseResources,
    updateResource,
    deleteResource,
    duplicateResource,
    reorderResources,
    Resource
} from "@/lib/resources";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
    createModule,
    getCourseModules,
    deleteModule,
    updateModule,
    CourseModule
} from "@/lib/modules";
import {
    grantAccess,
    revokeAccess,
    getCoursePermissions,
    hasAccess,
    updateAccessExpiration,
    CoursePermission
} from "@/lib/permissions";
import { ResourceItem } from "@/components/ResourceItem";
import { ModuleResourceList } from "@/components/ModuleResourceList";
import { Loader } from "@/components/Loader";
import { Trash, Plus, FolderPlus, Eye, EyeSlash, ArrowLeft, Calendar, Check, X, PencilSimple, Star, FloppyDisk, MagnifyingGlass, Users } from "@phosphor-icons/react";
import {
    toggleFavorite,
    getUserFavorites,
    trackResourceOpen,
    toggleCompleted,
    getUserCompleted
} from "@/lib/interactions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<Course | null>(null);
    const [resources, setResources] = useState<Resource[]>([]);
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [permissions, setPermissions] = useState<CoursePermission[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    // Course Edit State
    const [isEditingCourse, setIsEditingCourse] = useState(false);
    const [editCourseTitle, setEditCourseTitle] = useState("");
    const [editCourseDesc, setEditCourseDesc] = useState("");
    const [savingCourse, setSavingCourse] = useState(false);

    // Form states
    const [resTitle, setResTitle] = useState("");
    const [resUrl, setResUrl] = useState("");
    const [resModule, setResModule] = useState("");
    const [resTags, setResTags] = useState(""); // Comma separated string
    const [addingRes, setAddingRes] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");

    // Module Form State
    const [newModuleTitle, setNewModuleTitle] = useState("");
    const [addingModule, setAddingModule] = useState(false);

    // Permission Form State
    const [accessEmail, setAccessEmail] = useState("");
    const [accessName, setAccessName] = useState("");
    const [accessExpiresAt, setAccessExpiresAt] = useState("");
    const [granting, setGranting] = useState(false);
    const [emailSuggestions, setEmailSuggestions] = useState<{ email: string; name?: string }[]>([]);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAccessEmail(val);
        // Auto-fill name if empty and match found
        const match = emailSuggestions.find(s => s.email.toLowerCase() === val.toLowerCase());
        if (match && match.name && !accessName) {
            setAccessName(match.name);
        }
    };

    // Permission Edit State
    const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
    const [editExpiresDate, setEditExpiresDate] = useState("");

    const [uploadingImage, setUploadingImage] = useState(false);

    // Preview Mode for Admins
    const [simulateDocenteView, setSimulateDocenteView] = useState(false);

    // Filtering State
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
        confirmText?: string;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: async () => { },
        confirmText: "Confirmar",
        isDestructive: false
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const [showResourceForm, setShowResourceForm] = useState(false);
    const [showAccessForm, setShowAccessForm] = useState(false);

    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Drag & Drop State for Overlay
    const [activeRes, setActiveRes] = useState<Resource | null>(null);
    const [isOutsideModule, setIsOutsideModule] = useState(false);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const item = resources.find(r => r.id === active.id);
        if (item) {
            setActiveRes(item);
            setIsOutsideModule(false);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || !activeRes) return;

        let overModuleId = activeRes.moduleId;

        if (over.id.toString().startsWith("module-")) {
            overModuleId = over.id.toString().replace("module-", "");
        } else {
            const overItem = resources.find(r => r.id === over.id);
            if (overItem) overModuleId = overItem.moduleId;
        }

        // Check if we are hovering over a different module
        if (overModuleId !== activeRes.moduleId) {
            if (!isOutsideModule) setIsOutsideModule(true);
        } else {
            if (isOutsideModule) setIsOutsideModule(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveRes(null);
            setIsOutsideModule(false);
            return;
        }

        const activeId = active.id.toString();
        const overId = over.id.toString();

        setActiveRes(null);
        setIsOutsideModule(false);

        const activeItem = resources.find(r => r.id === activeId);
        if (!activeItem) return;

        // Determine Drop Target
        let overModuleId = activeItem.moduleId; // Default to current
        let newIndex = -1;

        if (overId.startsWith("module-")) {
            // Dropped on a module header/container
            overModuleId = overId.replace("module-", "");
            // Add to end of that module or make it first?
            // Let's rely on arrayMove logic if possible or just update module ID.
            // If dropped ON module, usually means append to it or make 0 index.
            // Let's simulate dropped on "last item" of that module if exists.
            const moduleItems = resources.filter(r => r.moduleId === overModuleId);
            newIndex = moduleItems.length; // End
        } else {
            // Dropped on another resource
            const overItem = resources.find(r => r.id === overId);
            if (overItem) {
                overModuleId = overItem.moduleId;
                // Find index of overItem in the global list or local list?
                // reorderResources typically expects Global Order or grouped Logic.
                // Our reorderResources backend/lib likely handles "reorder within same course".
                // We should find the index in the current `resources` array
                const overGlobalIndex = resources.findIndex(r => r.id === overId);
                newIndex = overGlobalIndex; // This is raw index, but we might want reorder logic relative to group
            }
        }

        // Optimistic UI Update
        let newResources = [...resources];

        // 1. Update Module ID if Changed
        if (activeItem.moduleId !== overModuleId) {
            // Update the item locally
            activeItem.moduleId = overModuleId;
            // Also need to move it in the array to visually match expectation? 
            // arrayMove works best on flat lists.
            // If we group by modules for rendering, the array order might not equal render order perfectly 
            // unless we sort by module first? 
            // In rendering we do: resources.filter(m).
            // So changing moduleId is enough to move it to another list visually.
            // BUT order within that list matters.

            // Just updating state might put it at end or undefined position unless re-sorted.
            // Let's update backend immediately for module change.
            try {
                await updateResource(activeId, { moduleId: overModuleId });
                // We also likely want to set its order.
            } catch (e) {
                console.error(e);
            }
        }

        // 2. Reorder logic
        if (activeId !== overId) {
            const oldIndex = resources.findIndex(r => r.id === activeId);
            const newIndex = resources.findIndex(r => r.id === overId);

            // Move
            newResources = arrayMove(resources, oldIndex, newIndex);
            setResources(newResources);

            // Persist order
            // We need to send the new order of IDs.
            // Usually we send a list of {id, order}
            try {
                // Determine the subset or just update all?
                // Updating all is safest for small courses.
                // reorderResources(courseId, resources[])
                await reorderResources(newResources);
            } catch (e) {
                console.error("Reorder fail", e);
            }
        } else {
            // Just module changed (dropped on empty module)
            if (activeItem.moduleId !== overModuleId) {
                setResources([...resources]); // Trigger re-render
            }
        }
    };

    const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        if (!course) return;

        setUploadingImage(true);
        try {
            const file = e.target.files[0];
            const { uploadCourseImage } = await import("@/lib/storage");
            const { updateDoc, doc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase/client");

            const imageUrl = await uploadCourseImage(file, course.id);
            await updateDoc(doc(db, "courses", course.id), { imageUrl });

            setCourse(prev => prev ? { ...prev, imageUrl } : null);
        } catch (error) {
            console.error("Error updating image:", error);
            alert("Error al actualizar la imagen");
        } finally {
            setUploadingImage(false);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push("/login"); // Only protect if actually strictly needed or leave to layout
                // Actually this page is protected, so redirect.
                return;
            }

            try {
                const profile = await ensureUserProfile(currentUser);
                setUserProfile(profile);

                if (!profile) return;

                // Admin check?
                // Actually Docs say Teachers can view too? 
                // "isAdminReal" is used later.
                // We assume everyone allowed here needs at least Access.

                if (!isAdmin(profile)) {
                    // Check if has explicit access
                    const access = await hasAccess(unwrappedParams.id, profile.email);
                    if (!access) {
                        alert("No tienes permiso para ver este curso.");
                        router.push("/dashboard");
                        return;
                    }
                }

                // Load Data
                await loadCourse();
                await loadModules();
                await loadResources();
                await loadPermissions();

                // Load Favorites & Completed
                const favs = await getUserFavorites(profile.uid);
                setFavoriteIds(new Set(favs.map(f => f.resourceId)));

                const completed = await getUserCompleted(profile.uid, unwrappedParams.id);
                setCompletedIds(new Set(completed.map(c => c.resourceId)));

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [unwrappedParams.id, router]);

    useEffect(() => {
        if (userProfile && isAdmin(userProfile)) {
            import("@/lib/permissions").then(({ getRecentAccessSuggestions }) => {
                getRecentAccessSuggestions().then(setEmailSuggestions);
            });
        }
    }, [userProfile]);

    const loadFavorites = async (uid: string) => {
        try {
            const favs = await getUserFavorites(uid);
            // Filter by this course interactions? getUserFavorites returns global, so we can filter by courseId match to optimize Set lookups if list is huge,
            // but for UI logic 'favoriteIds' set is better being comprehensive or per course? 
            // The resource item just checks ID. So simple Set of IDs is fine.
            setFavoriteIds(new Set(favs.map(f => f.resourceId)));
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleFavorite = async (res: Resource) => {
        if (!auth.currentUser) return;

        // Optimistic
        const isFav = favoriteIds.has(res.id);
        setFavoriteIds(prev => {
            const next = new Set(prev);
            if (isFav) next.delete(res.id);
            else next.add(res.id);
            return next;
        });

        try {
            await toggleFavorite(auth.currentUser.uid, res);
        } catch (error) {
            console.error("Error toggling favorite", error);
            // Revert
            setFavoriteIds(prev => {
                const revert = new Set(prev);
                if (isFav) revert.add(res.id);
                else revert.delete(res.id);
                return revert;
            });
        }
    };

    const handleToggleCompleted = async (res: Resource) => {
        if (!auth.currentUser) return;

        // Optimistic
        const isCompleted = completedIds.has(res.id);
        setCompletedIds(prev => {
            const next = new Set(prev);
            if (isCompleted) next.delete(res.id);
            else next.add(res.id);
            return next;
        });

        try {
            await toggleCompleted(auth.currentUser.uid, res);
        } catch (error) {
            console.error("Error toggling completed", error);
            // Revert
            setCompletedIds(prev => {
                const revert = new Set(prev);
                if (isCompleted) revert.add(res.id);
                else revert.delete(res.id);
                return revert;
            });
        }
    };

    const handleResourceOpen = async (res: Resource) => {
        if (!auth.currentUser) return;
        try {
            await trackResourceOpen(auth.currentUser.uid, res);
        } catch (e) {
            console.error("Error tracking open", e);
        }
    };

    const loadCourse = async () => {
        try {
            const docRef = doc(db, "courses", unwrappedParams.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const c = { id: docSnap.id, ...docSnap.data() } as Course;
                setCourse(c);
                setEditCourseTitle(c.title);
                setEditCourseDesc(c.description || "");
            } else {
                alert("Curso no encontrado");
                router.push("/dashboard/courses");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadResources = async () => {
        const res = await getCourseResources(unwrappedParams.id);
        setResources(res);
    };

    const loadModules = async () => {
        const mods = await getCourseModules(unwrappedParams.id);
        setModules(mods);
        // Auto-select first module if none selected and modules exist
        if (mods.length > 0 && !resModule) {
            setResModule(mods[0].id);
        }
    };

    const loadPermissions = async () => {
        const perms = await getCoursePermissions(unwrappedParams.id);
        setPermissions(perms);
    };



    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModuleTitle.trim()) return;

        setAddingModule(true);
        try {
            await createModule(unwrappedParams.id, newModuleTitle);
            setNewModuleTitle("");
            await loadModules();
        } catch (error) {
            console.error("Error creating module:", error);
            alert("Error al crear módulo");
        } finally {
            setAddingModule(false);
        }
    };

    const handleDeleteModule = async (id: string) => {
        const mod = modules.find(m => m.id === id);

        setConfirmConfig({
            isOpen: true,
            title: `¿Eliminar módulo "${mod?.title}"?`,
            message: "Los recursos dentro de este módulo NO se borrarán. Se moverán automáticamente a la lista 'General' y podrás reorganizarlos después.",
            confirmText: "Eliminar Módulo",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    setConfirmLoading(true);
                    await deleteModule(id);
                    await loadModules();
                    await loadResources();
                } catch (error) {
                    console.error("Error deleting module:", error);
                } finally {
                    setConfirmLoading(false);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleUpdateModule = async (id: string, title: string) => {
        try {
            await updateModule(id, { title });
            await loadModules();
        } catch (error) {
            console.error("Error updating module:", error);
            alert("Error al actualizar módulo");
        }
    };

    const handleUpdateResource = async (id: string, data: Partial<Resource>) => {
        try {
            await updateResource(id, data);
            await loadResources();
        } catch (error) {
            console.error("Error updating resource:", error);
            alert("Error al actualizar recurso");
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resTitle.trim() || !resUrl.trim()) return;
        if (!resModule) {
            alert("Debes seleccionar un módulo para el recurso.");
            return;
        }

        setAddingRes(true);
        try {
            // Process tags
            const tagsArray = resTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

            // ALWAYS CREATE NEW
            await createResource(unwrappedParams.id, resTitle, "link", resUrl, resModule, tagsArray);

            // Reset form
            setResTitle("");
            setResUrl("");
            setResTags("");
            // Do not reset resModule, useful for adding multiple to same module

            await loadResources();
        } catch (error) {
            console.error("Error saving resource:", error);
            alert("Error al guardar recurso");
        } finally {
            setAddingRes(false);
        }
    };

    const handleQuickAddResource = async (moduleId: string, title: string, url: string) => {
        try {
            await createResource(unwrappedParams.id, title, "link", url, moduleId, []);
            await loadResources();
        } catch (error) {
            console.error("Error saving resource:", error);
            alert("Error al guardar recurso");
        }
    };

    const handleSaveCourse = async () => {
        if (!course) return;
        setSavingCourse(true);
        try {
            const { updateCourseDetails } = await import("@/lib/courses");
            await updateCourseDetails(course.id, {
                title: editCourseTitle,
                description: editCourseDesc
            });
            await loadCourse(); // Reload
            setIsEditingCourse(false);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar detalles del curso.");
        } finally {
            setSavingCourse(false);
        }
    };

    // Legacy Edit Functions Removed (handleEditResource, cancelEdit)

    const handleDeleteResource = async (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "¿Eliminar recurso?",
            message: "Estás a punto de eliminar este recurso permanentemente. Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    setConfirmLoading(true);
                    await deleteResource(id);
                    setResources(items => items.filter(item => item.id !== id));
                } catch (error) {
                    console.error("Error deleting resource:", error);
                } finally {
                    setConfirmLoading(false);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDuplicateResource = async (res: Resource) => {
        try {
            await duplicateResource(res);
            await loadResources();
        } catch (error) {
            console.error("Error duplicating resource:", error);
        }
    };

    const handleGrantAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessEmail.trim()) return;

        setGranting(true);
        try {
            let date: Date | null = null;
            if (accessExpiresAt) {
                const [year, month, day] = accessExpiresAt.split('-').map(Number);
                // Create date in local time at the end of the day
                date = new Date(year, month - 1, day, 23, 59, 59, 999);
            }

            const res = await grantAccess(unwrappedParams.id, accessEmail, "DOCENTE", date, accessName);
            if (res === null) {
                alert("Este usuario ya tiene acceso.");
            } else {
                setAccessEmail("");
                setAccessName("");
                setAccessExpiresAt("");
                await loadPermissions();
            }
        } catch (error) {
            console.error("Error granting access:", error);
            alert("Error al dar acceso");
        } finally {
            setGranting(false);
        }
    };

    const handleUpdateExpiration = async (permissionId: string) => {
        try {
            let date: Date | null = null;
            if (editExpiresDate) {
                const [year, month, day] = editExpiresDate.split('-').map(Number);
                // Create date in local time at the end of the day
                date = new Date(year, month - 1, day, 23, 59, 59, 999);
            }

            await updateAccessExpiration(permissionId, date);
            setEditingPermissionId(null);
            await loadPermissions();
        } catch (error) {
            console.error("Failed to update expiration", error);
        }
    };

    const handleRevokeAccess = async (id: string, email: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "¿Revocar acceso?",
            message: `¿Estás seguro de quitar el acceso al curso para el usuario ${email}?`,
            confirmText: "Revocar Acceso",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    setConfirmLoading(true);
                    await revokeAccess(id);
                    setPermissions(items => items.filter(item => item.id !== id));
                } catch (error) {
                    console.error("Error revoking access:", error);
                } finally {
                    setConfirmLoading(false);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    if (loading) return <Loader />;
    if (!course) return null;

    const isAdminReal = userProfile && isAdmin(userProfile);
    const isTeacher = (!isAdminReal) || simulateDocenteView;

    // Logic for filtering

    const filteredResources = resources.filter(r => {
        // Filter by favorites
        if (showFavoritesOnly && !favoriteIds.has(r.id)) return false;

        // Filter by search query (title or tag)
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();

        // Match title
        if (r.title.toLowerCase().includes(query)) return true;

        // Match tags
        if (r.tags && r.tags.some(t => t.toLowerCase().includes(query))) return true;

        return false;
    });

    // Group resources (using filtered list)
    const resourcesByModule: Record<string, Resource[]> = {};
    const generalResources: Resource[] = [];

    filteredResources.forEach(r => {
        if (r.moduleId) {
            if (!resourcesByModule[r.moduleId]) resourcesByModule[r.moduleId] = [];
            resourcesByModule[r.moduleId].push(r);
        } else {
            generalResources.push(r);
        }
    });





    return (
        <div className="min-h-screen bg-background p-8 transition-colors duration-300">
            <div className="max-w-4xl mx-auto flex flex-col w-full">
                <div className="flex justify-between items-center mb-4 w-full">
                    <button
                        onClick={() => router.push(isTeacher && !isAdminReal ? "/dashboard" : "/dashboard/courses")}
                        className="text-primary hover:text-indigo-800 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        {isTeacher && !isAdminReal ? "Volver al Dashboard" : "Volver a cursos"}
                    </button>

                    {/* Header Controls */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                            <ThemeToggle />
                        </div>

                        {isAdminReal && (
                            <button
                                onClick={() => setSimulateDocenteView(!simulateDocenteView)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border shadow-sm transition-all
                                    ${simulateDocenteView
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300"
                                        : "bg-card border-border text-foreground hover:bg-muted"}
                                `}
                            >
                                {simulateDocenteView ? (
                                    <>
                                        <EyeSlash size={16} />
                                        Vista: Docente
                                    </>
                                ) : (
                                    <>
                                        <Eye size={16} />
                                        Vista: Admin
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Header & Progress */}
                <div className="mb-8 relative overflow-hidden bg-card p-0 rounded-xl shadow-sm border border-border group">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row gap-8 p-8 relative z-10">
                        {/* Course Image / Icon */}
                        <div className="flex-shrink-0">
                            {course.imageUrl ? (
                                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-md ring-1 ring-border">
                                    <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center text-muted-foreground/40 shadow-inner ring-1 ring-border">
                                    <FolderPlus size={48} weight="light" />
                                </div>
                            )}
                        </div>

                        {/* Title and Description */}
                        <div className="flex-1 flex flex-col justify-center">
                            {isEditingCourse ? (
                                <div className="space-y-4 max-w-2xl animate-in fade-in slide-in-from-bottom-2">
                                    <input
                                        type="text"
                                        value={editCourseTitle}
                                        onChange={(e) => setEditCourseTitle(e.target.value)}
                                        className="block w-full text-3xl font-bold bg-background/50 border-border border rounded-md px-3 py-2 focus:ring-primary/50"
                                        placeholder="Título del curso"
                                        autoFocus
                                    />
                                    <textarea
                                        value={editCourseDesc}
                                        onChange={(e) => setEditCourseDesc(e.target.value)}
                                        className="block w-full text-base text-muted-foreground bg-background/50 border-border border rounded-md px-3 py-2 min-h-[80px] focus:ring-primary/50"
                                        placeholder="Descripción del curso (opcional)"
                                    />
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleSaveCourse}
                                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
                                            disabled={savingCourse}
                                        >
                                            {savingCourse ? "Guardando..." : "Guardar Cambios"}
                                        </button>
                                        <button
                                            onClick={() => { setIsEditingCourse(false); setEditCourseTitle(course.title); setEditCourseDesc(course.description || ""); }}
                                            className="bg-muted text-muted-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                                            {course.title}
                                        </h1>
                                        {!isTeacher && (
                                            <button
                                                onClick={() => setIsEditingCourse(true)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-muted/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-muted-foreground hover:text-indigo-600 p-2 rounded-full"
                                                title="Editar detalles"
                                            >
                                                <PencilSimple size={20} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
                                        {course.description || <span className="italic opacity-50">Sin descripción añadida.</span>}
                                    </p>

                                    {/* Optional: Add extra metadata row here later (e.g. Total Modules, Duration) */}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="mt-8 flex flex-wrap gap-4 items-center mb-12 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="relative flex-1 min-w-[200px]">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar recursos (título o etiquetas)..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border shadow-sm transition-all ${showFavoritesOnly
                            ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200"
                            : "bg-card border-border text-foreground hover:bg-muted"
                            }`}
                    >
                        <Star weight={showFavoritesOnly ? "fill" : "bold"} className={showFavoritesOnly ? "" : "text-yellow-500"} />
                        {showFavoritesOnly ? "Ver Todos" : "Favoritos"}
                    </button>
                </div>
                <div className="w-full block mb-12">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={!isTeacher ? handleDragStart : undefined}
                        onDragOver={!isTeacher ? handleDragOver : undefined}
                        onDragEnd={!isTeacher ? handleDragEnd : undefined}
                    >
                        <div className="grid grid-cols-1 gap-8 relative">
                            {modules.map(module => (
                                <ModuleResourceList
                                    key={module.id}
                                    module={module}
                                    resources={resourcesByModule[module.id] || []}
                                    isTeacher={isTeacher}
                                    favoriteIds={favoriteIds}
                                    completedIds={completedIds}
                                    onDeleteResource={handleDeleteResource}
                                    onDuplicateResource={handleDuplicateResource}
                                    onUpdateResource={handleUpdateResource}
                                    onToggleFavorite={handleToggleFavorite}
                                    onToggleCompleted={handleToggleCompleted}
                                    onOpenResource={handleResourceOpen}
                                    onDeleteModule={handleDeleteModule}
                                    onUpdateModule={handleUpdateModule}
                                    onAddResource={handleQuickAddResource}
                                />
                            ))}

                            {/* General Resources (No Module) */}
                            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                                <div className="bg-muted px-6 py-3 border-b border-border">
                                    <h3 className="font-semibold text-foreground">General (Sin Módulo)</h3>
                                </div>
                                <SortableContext
                                    items={generalResources.map(r => r.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <ul className="divide-y divide-border min-h-[50px]">
                                        {generalResources.map(res => (
                                            <ResourceItem
                                                key={res.id}
                                                resource={res}
                                                onDelete={handleDeleteResource}
                                                onDuplicate={handleDuplicateResource}
                                                onUpdate={handleUpdateResource}
                                                isDraggable={!isTeacher}
                                                modules={modules}
                                                isFavorite={favoriteIds.has(res.id)}
                                                onToggleFavorite={handleToggleFavorite}
                                                isCompleted={completedIds.has(res.id)}
                                                onToggleCompleted={handleToggleCompleted}
                                                onOpen={handleResourceOpen}
                                            />
                                        ))}
                                        {generalResources.length === 0 && (
                                            <li className="py-8 px-6 text-center text-muted-foreground text-xs italic pointer-events-none">
                                                {isTeacher ? "No hay recursos generales." : "Arrastra recursos aquí"}
                                            </li>
                                        )}
                                    </ul>
                                </SortableContext>
                            </div>

                            {/* Add Module Button (Admin) */}
                            {!isTeacher && (
                                <div className="mt-4 flex justify-center">
                                    {addingModule ? (
                                        <div className="flex gap-2 items-center bg-card p-3 rounded shadow-sm border border-border animate-in fade-in zoom-in duration-200">
                                            <input
                                                type="text"
                                                value={newModuleTitle}
                                                onChange={(e) => setNewModuleTitle(e.target.value)}
                                                placeholder="Nombre del Módulo"
                                                className="rounded border-border bg-background px-3 py-1.5 min-w-[200px] text-sm focus:ring-primary focus:border-primary"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleAddModule}
                                                className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium hover:bg-primary/90"
                                            >
                                                Crear
                                            </button>
                                            <button
                                                onClick={() => setAddingModule(false)}
                                                className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingModule(true)}
                                            className="flex items-center gap-2 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-4 py-2 rounded-full border border-dashed border-border hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                        >
                                            <Plus size={18} />
                                            Agregar Módulo
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <DragOverlay>
                            {activeRes ? (
                                <div className="opacity-90 rotate-2 scale-105 pointer-events-none">
                                    <div className="bg-card p-4 rounded shadow-xl border-l-4 border-l-indigo-500 border border-border/50">
                                        <div className="font-semibold text-foreground">{activeRes.title}</div>
                                        <div className="text-xs text-muted-foreground">{activeRes.url}</div>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>

                {/* Admin Section Container */}
                <div className="w-full block">
                    {!isTeacher && (
                        <div className="w-full block clear-both mt-16 space-y-10 border-t border-border pt-10">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <h3 className="text-lg font-bold uppercase tracking-wider">Zona de Administración</h3>
                                <div className="h-px bg-border flex-1"></div>
                            </div>

                            {/* Add Resource Section (Admin) */}
                            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                    <Plus className="text-indigo-500" size={24} />
                                    Agregar Nuevo Recurso
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Título</label>
                                        <input
                                            type="text"
                                            value={resTitle}
                                            onChange={(e) => setResTitle(e.target.value)}
                                            placeholder="Ej. Guía de estudio"
                                            className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">URL (Drive, YouTube, etc.)</label>
                                        <input
                                            type="url"
                                            value={resUrl}
                                            onChange={(e) => setResUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Asignar a Módulo</label>
                                        <select
                                            value={resModule}
                                            onChange={(e) => setResModule(e.target.value)}
                                            className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">General (Sin módulo)</option>
                                            {modules.map(m => (
                                                <option key={m.id} value={m.id}>{m.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Etiquetas (Opcional, separadas por coma)</label>
                                        <input
                                            type="text"
                                            value={resTags}
                                            onChange={(e) => setResTags(e.target.value)}
                                            placeholder="examen, lectura, importante"
                                            className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddResource}
                                        disabled={addingRes}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {addingRes ? "Agregando..." : "Agregar Recurso"}
                                    </button>
                                </div>
                            </div>

                            {/* Access Management Section (Admin) */}
                            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                                    <Users className="text-indigo-500" size={24} />
                                    Gestión de Acceso
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Formulario de otorgar acceso */}
                                    <div className="lg:col-span-1 border-r border-border pr-6">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Otorgar Acceso</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Nombre (Opcional)</label>
                                                <input
                                                    type="text"
                                                    value={accessName}
                                                    onChange={(e) => setAccessName(e.target.value)}
                                                    placeholder="Juan Pérez"
                                                    className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Email del usuario</label>
                                                <input
                                                    type="email"
                                                    value={accessEmail}
                                                    onChange={handleEmailChange}
                                                    placeholder="usuario@ejemplo.com"
                                                    list="email-suggestions"
                                                    className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary"
                                                    autoComplete="off"
                                                />
                                                <datalist id="email-suggestions">
                                                    {emailSuggestions.map((s) => (
                                                        <option key={s.email} value={s.email}>{s.name || s.email}</option>
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Expiración (Opcional)</label>
                                                <input
                                                    type="date"
                                                    value={accessExpiresAt}
                                                    onChange={(e) => setAccessExpiresAt(e.target.value)}
                                                    className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 focus:ring-primary focus:border-primary text-foreground"
                                                />
                                            </div>
                                            <button
                                                onClick={handleGrantAccess}
                                                disabled={granting}
                                                className="w-full bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {granting ? "Procesando..." : "Dar Acceso"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de permisos */}
                                    <div className="lg:col-span-2">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Usuarios con Acceso ({permissions.length})</h3>
                                        <div className="max-h-[300px] overflow-y-auto border border-border rounded-md w-full overflow-x-auto">
                                            <table className="min-w-full divide-y divide-border">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expiración</th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-card divide-y divide-border">
                                                    {permissions.map((p) => (
                                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                                                {p.name ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold">{p.name}</span>
                                                                        <span className="text-xs text-muted-foreground font-normal">{p.email}</span>
                                                                    </div>
                                                                ) : (
                                                                    p.email
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                                {editingPermissionId === p.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="date"
                                                                            value={editExpiresDate}
                                                                            onChange={(e) => setEditExpiresDate(e.target.value)}
                                                                            className="rounded border-border bg-background text-xs px-2 py-1"
                                                                        />
                                                                        <button onClick={() => handleUpdateExpiration(p.id)} className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                                                                        <button onClick={() => setEditingPermissionId(null)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                                                        setEditingPermissionId(p.id);
                                                                        if (p.expiresAt) {
                                                                            const d = new Date(p.expiresAt.seconds * 1000);
                                                                            const year = d.getFullYear();
                                                                            const month = String(d.getMonth() + 1).padStart(2, '0');
                                                                            const day = String(d.getDate()).padStart(2, '0');
                                                                            setEditExpiresDate(`${year}-${month}-${day}`);
                                                                        } else {
                                                                            setEditExpiresDate("");
                                                                        }
                                                                    }}>
                                                                        {p.expiresAt ? new Date(p.expiresAt.seconds * 1000).toLocaleDateString() : <span className="text-green-600 dark:text-green-400 text-xs bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Permanente</span>}
                                                                        <PencilSimple size={14} className="opacity-0 group-hover:opacity-100 text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => handleRevokeAccess(p.id, p.email)}
                                                                    className="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition-colors"
                                                                >
                                                                    Revocar
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {permissions.length === 0 && (
                                                        <tr>
                                                            <td colSpan={3} className="px-6 py-8 text-center text-sm text-muted-foreground">
                                                                Nadie tiene acceso explícito a este curso aún.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>




                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmText={confirmConfig.confirmText}
                    isDestructive={confirmConfig.isDestructive}
                    isLoading={confirmLoading}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                />
            </div>
        </div >
    );
}
