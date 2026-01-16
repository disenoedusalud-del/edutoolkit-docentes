"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import {
    ensureUserProfile,
    isAdmin,
    getAdmins,
    getUserByEmail,
    updateUserRole,
    UserProfile,
    UserRole
} from "@/lib/users";
import { Loader } from "@/components/Loader";
import { ArrowLeft, UserGear, ShieldCheck, Check, X, MagnifyingGlass, UserPlus } from "@phosphor-icons/react";
import { User } from "firebase/auth";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function UsersPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);

    // State for the list of admins
    const [admins, setAdmins] = useState<UserProfile[]>([]);

    // State for Adding Admin
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [addingAdmin, setAddingAdmin] = useState(false);

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            setCurrentUser(u);
            if (u) {
                const profile = await ensureUserProfile(u);
                setCurrentProfile(profile);

                if (!isAdmin(profile)) {
                    alert("No tienes permisos de administrador.");
                    router.push("/dashboard");
                    return;
                }

                await loadAdmins();
            } else {
                router.push("/login");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const loadAdmins = async () => {
        try {
            const adminList = await getAdmins();
            // Sort: Super Admin first
            const sorted = adminList.sort((a, b) => {
                const roleScore = (r: string) => {
                    if (r === 'SUPER_ADMIN') return 3;
                    if (r === 'ADMIN') return 2;
                    return 1;
                };
                return roleScore(b.roleGlobal) - roleScore(a.roleGlobal);
            });
            setAdmins(sorted);
        } catch (error) {
            console.error(error);
            alert("Error al cargar administradores");
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdminEmail.trim()) return;

        setAddingAdmin(true);
        try {
            // Check if user exists
            const user = await getUserByEmail(newAdminEmail.trim());

            if (!user) {
                alert("Usuario no encontrado. El usuario debe registrarse e iniciar sesión en la plataforma primero (como docente/viewer) antes de poder ser nombrado administrador.");
                setAddingAdmin(false);
                return;
            }

            if (user.roleGlobal === 'ADMIN' || user.roleGlobal === 'SUPER_ADMIN') {
                alert("Este usuario ya es administrador.");
                setAddingAdmin(false);
                return;
            }

            // Promote
            if (confirm(`Usuario encontrado: ${user.email}. ¿Convertir en Administrador?`)) {
                await updateUserRole(user.uid, 'ADMIN');
                setNewAdminEmail("");
                await loadAdmins();
                alert("Administrador agregado exitosamente.");
            }

        } catch (error) {
            console.error(error);
            alert("Error al buscar/agregar usuario.");
        } finally {
            setAddingAdmin(false);
        }
    };

    const handleDemote = async (uid: string) => {
        if (!confirm("¿Estás seguro de quitar los permisos de administrador a este usuario? Volverá a ser DOCENTE.")) return;

        setUpdating(uid);
        try {
            await updateUserRole(uid, 'DOCENTE');
            // Remove from local list
            setAdmins(prev => prev.filter(u => u.uid !== uid));
        } catch (error) {
            console.error(error);
            alert("Error al actualizar rol");
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-background p-8 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <UserGear size={32} className="text-primary" />
                            Gestión de Administradores
                        </h1>
                    </div>
                    <ThemeToggle />
                </div>
                <p className="text-muted-foreground mb-8 ml-10">
                    Administra quién tiene acceso total a la plataforma.
                </p>

                {/* Add Admin Section */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8 transition-colors">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <UserPlus size={20} />
                        Agregar Nuevo Administrador
                    </h2>
                    <form onSubmit={handleAddAdmin} className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
                        <div className="flex-1 w-full min-w-[200px]">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Correo electrónico del usuario</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlass className="text-muted-foreground" />
                                </div>
                                <input
                                    type="email"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="pl-10 w-full rounded-md border-border bg-background shadow-sm text-sm p-2 border text-foreground focus:ring-primary focus:border-primary transition-colors"
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">El usuario ya debe estar registrado en la plataforma.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={addingAdmin}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium h-[38px] mb-[1px] transition-colors shadow-sm"
                        >
                            {addingAdmin ? "Buscando..." : "Agregar Admin"}
                        </button>
                    </form>
                </div>

                {/* Admins List */}
                <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border transition-colors">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Administradores Actuales</h3>
                    </div>
                    <ul className="divide-y divide-border">
                        {admins.map((user) => {
                            const isSelf = user.uid === currentUser?.uid;
                            const isSuperAdmin = user.roleGlobal === "SUPER_ADMIN";

                            return (
                                <li key={user.uid} className={`px-6 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors ${isSelf ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""}`}>
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm transition-colors">
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-foreground">{user.email}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                {user.roleGlobal}
                                                {isSelf && <span className="text-primary font-medium">(Tú)</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {updating === user.uid ? (
                                            <span className="text-xs text-muted-foreground">Procesando...</span>
                                        ) : (
                                            <div>
                                                {!isSelf && !isSuperAdmin && (
                                                    <button
                                                        onClick={() => handleDemote(user.uid)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 px-3 py-1 rounded border border-red-100 dark:border-red-800 transition-colors"
                                                    >
                                                        Quitar Admin
                                                    </button>
                                                )}
                                                {isSuperAdmin && (
                                                    <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 text-xs font-medium bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-100 dark:border-purple-800">
                                                        <ShieldCheck size={14} weight="fill" />
                                                        Super Admin
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                        {admins.length === 0 && (
                            <li className="px-6 py-8 text-center text-muted-foreground">
                                No se encontraron administradores. (Algo es extraño...)
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
