"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { User } from "firebase/auth";
import { ensureUserProfile, UserProfile, isAdmin } from "@/lib/users";
import { createCourse, getCourses, updateCourseStatus, Course, deleteCourse } from "@/lib/courses";
import { uploadCourseImage } from "@/lib/storage";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Loader } from "@/components/Loader";

import { ConfirmModal } from "@/components/ConfirmModal";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CoursesPage() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCourseTitle, setNewCourseTitle] = useState("");
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);

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

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push("/login");
                return;
            }
            setUser(currentUser);

            try {
                const userProfile = await ensureUserProfile(currentUser);
                setProfile(userProfile);

                if (!isAdmin(userProfile)) {
                    router.push("/dashboard"); // Redirect non-admins back to dashboard
                    return;
                }

                // Load courses
                await loadCourses();
            } catch (error) {
                console.error("Error loading courses:", error);
                alert("Error cargando cursos. Ver consola.");
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const loadCourses = async () => {
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCourseTitle.trim()) return;

        setCreating(true);
        try {
            // First create the course
            const courseId = await createCourse(newCourseTitle);

            // If image is selected, upload it
            if (coverImage) {
                try {
                    console.log("Subiendo imagen para curso:", courseId);
                    const imageUrl = await uploadCourseImage(coverImage, courseId);
                    console.log("Imagen subida, URL:", imageUrl);

                    // Update course with image URL
                    await updateDoc(doc(db, "courses", courseId), { imageUrl });
                } catch (imgError) {
                    console.error("Error al subir imagen (curso creado sin imagen):", imgError);
                    alert("El curso se creó, pero hubo un error subiendo la imagen. Intenta subirla editando el curso.");
                }
            }

            setNewCourseTitle("");
            setCoverImage(null);
            await loadCourses();
        } catch (error) {
            console.error("Error creating course:", error);
            alert("Error al crear el curso");
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (courseId: string, currentStatus: "active" | "archived") => {
        const newStatus = currentStatus === "active" ? "archived" : "active";
        try {
            await updateCourseStatus(courseId, newStatus);
            await loadCourses();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "¿Eliminar curso permanentemente?",
            message: "Esta acción NO se puede deshacer.\n\nSe eliminará el curso y TODO su contenido, incluyendo módulos y recursos. Los archivos en almacenamiento permanecerán pero perderán su referencia.",
            confirmText: "Eliminar Curso",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    setConfirmLoading(true);
                    await deleteCourse(courseId);
                    await loadCourses();
                } catch (error) {
                    console.error("Error deleting course:", error);
                    alert("Error al eliminar el curso.");
                } finally {
                    setConfirmLoading(false);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    if (loading) return <Loader />;

    if (!isAdmin(profile)) return null;

    return (
        <div className="min-h-screen bg-background p-8 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-foreground">Administrar Cursos</h1>
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-primary hover:text-indigo-800 dark:hover:text-indigo-400 font-medium transition-colors"
                    >
                        &larr; Volver al Dashboard
                    </button>
                </div>

                {/* Create Course Form */}
                <div className="bg-card p-6 rounded-lg shadow-md mb-8 border border-border">
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Nuevo Curso</h2>
                    <form onSubmit={handleCreateCourse}>
                        <div className="flex gap-4 items-end mb-4 flex-wrap sm:flex-nowrap">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Curso</label>
                                <input
                                    type="text"
                                    value={newCourseTitle}
                                    onChange={(e) => setNewCourseTitle(e.target.value)}
                                    placeholder="Ej. Matemáticas"
                                    className="w-full rounded-md border-border bg-background border shadow-sm px-4 py-2 text-foreground focus:ring-primary focus:border-primary transition-colors"
                                    required
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Imagen de Portada (Opcional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCoverImage(e.target.files ? e.target.files[0] : null)}
                                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300 transition-colors"
                                />
                            </div>
                            <div className="">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 h-10 transition-colors shadow-sm"
                                >
                                    {creating ? "Creando..." : "Crear"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Courses List */}
                <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Portada</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Curso</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {courses.map((course) => (
                                <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {course.imageUrl ? (
                                            <img src={course.imageUrl} alt="" className="h-10 w-16 object-contain rounded bg-muted border border-border" />
                                        ) : (
                                            <div className="h-10 w-16 bg-muted rounded flex items-center justify-center text-muted-foreground/50 border border-border">
                                                <span>📷</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-foreground">{course.title}</div>
                                        <div className="text-xs text-muted-foreground">ID: {course.id}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${course.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                            {course.status === 'active' ? 'Activo' : 'Archivado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                                            className="text-primary hover:text-indigo-900 dark:hover:text-indigo-400 mr-4 transition-colors"
                                        >
                                            Ver / Recursos
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(course.id, course.status)}
                                            className={`${course.status === 'active' ? 'text-red-600 hover:text-red-900 dark:hover:text-red-400' : 'text-green-600 hover:text-green-900 dark:hover:text-green-400'} mr-4 transition-colors`}
                                        >
                                            {course.status === 'active' ? 'Archivar' : 'Activar'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCourse(course.id)}
                                            className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                            title="Eliminar curso"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {courses.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
                                        No hay cursos creados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
    );
}
