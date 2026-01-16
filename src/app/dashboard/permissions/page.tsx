"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { isAdmin, ensureUserProfile, UserProfile } from "@/lib/users";
import { getAllPermissions, revokeAccess, CoursePermission, updateAccessExpiration } from "@/lib/permissions";
import { getCourses, Course } from "@/lib/courses";
import { Loader } from "@/components/Loader";
import {
    ArrowLeft,
    ShieldCheck,
    Trash,
    Calendar,
    User as UserIcon,
    BookOpen,
    MagnifyingGlass,
    PencilSimple,
    Check,
    X,
    Funnel
} from "@phosphor-icons/react";
import { User } from "firebase/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Toast, ToastType } from "@/components/Toast";

export default function GlobalPermissionsPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [permissions, setPermissions] = useState<CoursePermission[]>([]);
    const [courses, setCourses] = useState<Record<string, Course>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCourse, setFilterCourse] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState("");

    // Add Access State
    const [accessEmail, setAccessEmail] = useState("");
    const [accessName, setAccessName] = useState("");
    const [accessCourseId, setAccessCourseId] = useState("");
    const [accessExpiry, setAccessExpiry] = useState("");
    const [granting, setGranting] = useState(false);

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        isDestructive: false
    });

    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    };

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setCurrentUser(u);
                const profile = await ensureUserProfile(u);
                setUserProfile(profile);

                if (!isAdmin(profile)) {
                    router.push("/dashboard");
                    return;
                }

                await loadData();
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [perms, allCourses] = await Promise.all([
                getAllPermissions(),
                getCourses()
            ]);

            setPermissions(perms);

            const coursesMap: Record<string, Course> = {};
            allCourses.forEach(c => coursesMap[c.id] = c);
            setCourses(coursesMap);
        } catch (error) {
            console.error("Error loading global permissions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessEmail || !accessCourseId) return;

        setGranting(true);
        try {
            let expiryDate: Date | null = null;
            if (accessExpiry) {
                const [y, m, d] = accessExpiry.split('-').map(Number);
                expiryDate = new Date(y, m - 1, d, 23, 59, 59);
            }

            const { grantAccess } = await import("@/lib/permissions");
            const res = await grantAccess(accessCourseId, accessEmail, "DOCENTE", expiryDate, accessName);

            if (res === null) {
                showToast("Este usuario ya tiene acceso a este curso.", "warning");
            } else {
                setAccessEmail("");
                setAccessName("");
                setAccessExpiry("");
                // Refresh list
                const perms = await getAllPermissions();
                setPermissions(perms);
                showToast("Acceso otorgado correctamente.");
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Error al otorgar acceso", "error");
        } finally {
            setGranting(false);
        }
    };

    const handleRevoke = (id: string, email: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "¿Revocar Acceso?",
            message: `¿Estás seguro de que deseas quitar el acceso de ${email} a este curso?`,
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await revokeAccess(id);
                    setPermissions(prev => prev.filter(p => p.id !== id));
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    showToast("Acceso revocado.");
                } catch (error) {
                    console.error("Error revoking access:", error);
                    showToast("Error al revocar acceso", "error");
                }
            }
        });
    };

    const handleUpdateExpiry = async (id: string) => {
        try {
            let date: Date | null = null;
            if (editDate) {
                const [y, m, d] = editDate.split('-').map(Number);
                date = new Date(y, m - 1, d, 23, 59, 59);
            }
            await updateAccessExpiration(id, date);
            setPermissions(prev => prev.map(p => p.id === id ? { ...p, expiresAt: date ? { seconds: Math.floor(date.getTime() / 1000) } : null } as any : p));
            setEditingId(null);
            showToast("Fecha de expiración actualizada.");
        } catch (error) {
            console.error(error);
            showToast("Error al actualizar fecha", "error");
        }
    };

    const filteredPermissions = permissions.filter(p => {
        const matchesSearch = p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCourse = filterCourse === "" || p.courseId === filterCourse;
        return matchesSearch && matchesCourse;
    });

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-primary transition-all border border-transparent hover:border-border shadow-sm group"
                        >
                            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <ShieldCheck size={32} className="text-primary" />
                                Gestión Global de Accesos
                            </h1>
                            <p className="text-muted-foreground text-sm">Visualiza y administra todos los permisos de cursos en un solo lugar.</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Add Access Form */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Otorgar Nuevo Acceso</h2>
                    <form onSubmit={handleGrant} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Email del Docente</label>
                            <input
                                type="email"
                                required
                                value={accessEmail}
                                onChange={(e) => setAccessEmail(e.target.value)}
                                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Nombre (opcional)</label>
                            <input
                                type="text"
                                value={accessName}
                                onChange={(e) => setAccessName(e.target.value)}
                                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                placeholder="Nombre del docente"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Seleccionar Curso</label>
                            <select
                                required
                                value={accessCourseId}
                                onChange={(e) => setAccessCourseId(e.target.value)}
                                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">Elegir curso...</option>
                                {Object.values(courses).map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Expiración (opcional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={accessExpiry}
                                    onChange={(e) => setAccessExpiry(e.target.value)}
                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                />
                                <button
                                    type="submit"
                                    disabled={granting}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {granting ? "..." : "Dar Acceso"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Filters & Search */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative md:col-span-2">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por email o nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                        >
                            <option value="">Todos los cursos</option>
                            {Object.values(courses).map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Permissions List */}
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Curso</th>
                                <th className="px-6 py-4">Expiración</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPermissions.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <UserIcon size={16} weight="bold" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">{p.name || "Sin nombre"}</span>
                                                <span className="text-xs text-muted-foreground">{p.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen size={18} className="text-muted-foreground" />
                                            <span className="text-sm text-foreground font-medium">
                                                {courses[p.courseId]?.title || "Curso no encontrado"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === p.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className="text-xs bg-background border border-border rounded px-2 py-1"
                                                />
                                                <button onClick={() => handleUpdateExpiry(p.id)} className="text-green-600 hover:text-green-700">
                                                    <Check size={18} weight="bold" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600">
                                                    <X size={18} weight="bold" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex items-center gap-2 cursor-pointer group/date"
                                                onClick={() => {
                                                    setEditingId(p.id);
                                                    if (p.expiresAt) {
                                                        const d = new Date(p.expiresAt.seconds * 1000);
                                                        setEditDate(d.toISOString().split('T')[0]);
                                                    } else {
                                                        setEditDate("");
                                                    }
                                                }}
                                            >
                                                <Calendar size={18} className="text-muted-foreground" />
                                                <span className="text-sm text-foreground">
                                                    {p.expiresAt
                                                        ? new Date(p.expiresAt.seconds * 1000).toLocaleDateString()
                                                        : <span className="text-green-600 dark:text-green-400 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full font-medium">Permanente</span>
                                                    }
                                                </span>
                                                <PencilSimple size={14} className="opacity-0 group-hover/date:opacity-100 text-muted-foreground transition-opacity" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRevoke(p.id, p.email)}
                                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            title="Revocar acceso"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPermissions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm italic">
                                        No se encontraron permisos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 text-xs text-muted-foreground flex justify-between items-center px-2">
                    <span>Mostrando {filteredPermissions.length} permisos</span>
                    <span>Tip: Haz clic en la fecha para editar la expiración.</span>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDestructive={confirmConfig.isDestructive}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
