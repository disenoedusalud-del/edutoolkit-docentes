"use client";

import { useEffect, useState, useRef } from "react";
import { User, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { isAdmin } from "@/lib/users";
import { useRouter } from "next/navigation";
import { getCourses, Course } from "@/lib/courses";
import { Loader } from "@/components/Loader";
import {
    getUserRecents,
    getUserFavorites,
    trackResourceOpen,
    RecentItem,
    FavoriteItem
} from "@/lib/interactions";
import {
    Clock,
    Star,
    YoutubeLogo,
    GoogleDriveLogo,
    Link as LinkIcon,
    UserGear,
    Cloud,
    VideoCamera,
    FilePdf,
    Globe,
    FileText,
    MonitorPlay,
    ShieldCheck,
    Code
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [resolvedName, setResolvedName] = useState<string>("");

    const [recents, setRecents] = useState<RecentItem[]>([]);
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser: User | null) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const { ensureUserProfile, isAdmin } = await import("@/lib/users");
                    const profile = await ensureUserProfile(currentUser);
                    setUserProfile(profile);

                    // Attempt to resolve name from permissions if not in profile
                    if (currentUser.email) {
                        const { getUserNameFromPermissions } = await import("@/lib/permissions");
                        const permName = await getUserNameFromPermissions(currentUser.email);
                        if (permName) setResolvedName(permName);
                    }

                    // Load Courses
                    if (isAdmin(profile)) {
                        const fetchedCourses = await getCourses();
                        setCourses(fetchedCourses);
                    } else if (profile?.roleGlobal === "DOCENTE" && currentUser.email) {
                        const { getAuthorizedCoursesForUser } = await import("@/lib/permissions");
                        const { getCoursesByIds } = await import("@/lib/courses");

                        const courseIds = await getAuthorizedCoursesForUser(currentUser.email);
                        const fetchedCourses = await getCoursesByIds(courseIds);
                        setCourses(fetchedCourses.filter(c => c.status === 'active'));
                    }

                    // Load Recents & Favorites (For both Admin and Docente for utility)
                    const recentData = await getUserRecents(currentUser.uid);
                    setRecents(recentData);

                    const favData = await getUserFavorites(currentUser.uid);
                    setFavorites(favData);

                } catch (error) {
                    console.error("Error ensuring user profile:", error);
                }
            } else {
                router.push("/login");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleOpenResource = async (item: RecentItem | FavoriteItem) => {
        if (!user) return;

        // Track open
        try {
            // Reconstruct minimal Resource object for tracking
            await trackResourceOpen(user.uid, {
                id: item.resourceId,
                courseId: item.courseId,
                title: item.resourceTitle,
                type: item.resourceType as any,
                url: item.resourceUrl,
                order: 0,
                createdAt: null
            });
        } catch (e) {
            console.error(e);
        }

        // Open Link
        window.open(item.resourceUrl, '_blank', 'noopener,noreferrer');
    };

    const getIcon = (type: string, url: string = "") => {
        const lowerUrl = url ? url.toLowerCase() : "";

        // 1. Specific Services
        if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
            return <YoutubeLogo size={20} className="text-red-600" weight="fill" />;
        }
        if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) {
            return <GoogleDriveLogo size={20} className="text-green-600" weight="fill" />;
        }
        if (lowerUrl.includes("zoom.us") || lowerUrl.includes("meet.google.com") || lowerUrl.includes("teams.microsoft")) {
            return <VideoCamera size={20} className="text-blue-500" weight="fill" />;
        }

        // 2. File Types
        if (lowerUrl.endsWith(".pdf")) {
            return <FilePdf size={20} className="text-red-500" weight="fill" />;
        }
        if (lowerUrl.endsWith(".doc") || lowerUrl.endsWith(".docx") || lowerUrl.endsWith(".txt")) {
            return <FileText size={20} className="text-blue-600" weight="fill" />;
        }

        switch (type) {
            case 'video': return <MonitorPlay size={20} className="text-purple-600" weight="fill" />;
            case 'drive': return <Cloud size={20} className="text-sky-500" weight="fill" />;
            default: return <Globe size={20} className="text-indigo-400" weight="duotone" />;
        }
    };

    if (loading) {
        return <Loader />;
    }

    if (!user) return null;

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/login");
    };

    const isGlobalAdmin = isAdmin(userProfile);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <nav className="bg-card shadow border-b border-border transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
                                    <span className="text-primary-foreground font-black text-lg italic">ET</span>
                                </div>
                                <span className="text-xl font-bold text-primary tracking-tight">EduToolkit</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">

                            <ThemeToggle />
                            {user && (
                                <div className="flex flex-col items-end">
                                    <span className="text-sm text-foreground font-medium">
                                        {userProfile?.roleGlobal === 'ADMIN' || userProfile?.roleGlobal === 'SUPER_ADMIN' ? 'Administrador' : 'Docente'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
                        {isGlobalAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.push("/dashboard/users")}
                                    className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 text-sm font-medium shadow-sm flex items-center gap-2 transition-colors border border-border"
                                >
                                    <UserGear size={18} />
                                    Admins
                                </button>
                                <button
                                    onClick={() => router.push("/dashboard/permissions")}
                                    className="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <ShieldCheck size={18} />
                                    Accesos a Cursos
                                </button>
                                <button
                                    onClick={() => router.push("/dashboard/courses")}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium shadow-sm transition-colors border border-transparent"
                                >
                                    Cursos
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="mt-2 text-muted-foreground mb-8 text-lg">
                        {(() => {
                            const name = userProfile?.displayName || resolvedName || user?.displayName || "";
                            if (!name) return "Hola, bienvenido/a.";

                            const firstName = name.trim().split(' ')[0].toLowerCase();
                            // Heuristic for Spanish names: ends in 'a' is usually feminine
                            // We can also check for common feminine endings or specific names
                            const isFeminine = firstName.endsWith('a') ||
                                firstName.endsWith('ana') ||
                                firstName.endsWith('ela') ||
                                firstName.endsWith('ita');

                            const greeting = isFeminine ? "bienvenida" : "bienvenido";
                            return `Hola, ${greeting} ${name}.`;
                        })()}
                        {isGlobalAdmin && " Tienes acceso total."}
                    </p>


                    {/* Courses Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <MonitorPlay size={24} className="text-primary" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground">Mis Cursos</h2>
                        </div>

                        {courses.length === 0 ? (
                            <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border px-6">
                                <p className="text-muted-foreground">
                                    {isGlobalAdmin
                                        ? "No hay cursos creados todavía. Comienza agregando uno en la sección de 'Cursos'."
                                        : "Aún no tienes acceso a ningún curso. Por favor, contacta con un administrador."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map(course => (
                                    <div
                                        key={course.id}
                                        className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 group flex flex-col h-full"
                                    >
                                        <div className="h-32 w-full bg-muted relative overflow-hidden">
                                            {course.imageUrl ? (
                                                <img
                                                    src={course.imageUrl}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 text-primary/40">
                                                    <span className="text-4xl font-bold opacity-20">ET</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                            <div className="absolute bottom-3 left-4 right-4">
                                                <h3 className="text-lg font-bold text-white drop-shadow-sm line-clamp-1">{course.title}</h3>
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col">
                                            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1">
                                                {course.description || "Sin descripción disponible."}
                                            </p>

                                            <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                                                <div className="flex -space-x-2">
                                                    {/* Avatars placeholder if needed, or simple badge */}
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                                        Curso
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                                >
                                                    Ver contenido
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>




        </div>
    );
}
