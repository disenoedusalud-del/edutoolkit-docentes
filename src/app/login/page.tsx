"use client";

import { useState, useEffect } from "react";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { getAuthorizedCoursesForUser } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, Code } from "@phosphor-icons/react";
import { useTheme } from "next-themes";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetMessage, setResetMessage] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResetMessage("");
        try {
            // Call our server-side API
            const res = await fetch('/api/auth/reset-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al enviar el enlace');
            }

            setResetMessage("Se ha enviado un enlace de recuperación a tu correo. Revisa tu bandeja de entrada (y spam).");
        } catch (err: any) {
            console.error("Reset Error:", err);
            setError(err.message || "Error al enviar el correo. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Check authorization immediately
                if (user.email) {
                    try {
                        const authorizedCourses = await getAuthorizedCoursesForUser(user.email);
                        if (authorizedCourses.length === 0) {
                            await user.delete();
                            throw new Error('unauthorized-email-alloc');
                        }
                    } catch (innerErr: any) {
                        // If checking fails (e.g. network) or returns empty (manual throw), ensure we rollback
                        if (innerErr.message !== 'unauthorized-email-alloc') {
                            await user.delete().catch(() => { });
                        }
                        throw innerErr;
                    }
                }
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            if (err.message === 'unauthorized-email-alloc') {
                setError("Este correo no tiene autorización para acceder. Contacta a un administrador.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Este correo ya está registrado.");
            } else if (err.code === 'auth/invalid-credential') {
                setError("Credenciales incorrectas.");
            } else if (err.code === 'auth/weak-password') {
                setError("La contraseña debe tener al menos 6 caracteres.");
            } else {
                setError(err.message === 'unauthorized-email-alloc' ? "No autorizado." : "Error de autenticación. Verifica tus datos.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300 relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-md border border-border">

                <div className="flex flex-col items-center justify-center mb-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-primary-foreground font-black text-xl italic">ET</span>
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-foreground decoration-primary decoration-4">EduToolkit</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] bg-muted px-2 py-0.5 rounded">Panel Docente</span>
                </div>

                <h1 className="mb-6 text-lg font-medium text-center text-muted-foreground">
                    {isResetting
                        ? "Recuperar Contraseña"
                        : (isRegistering ? "Crear nueva cuenta" : "Ingresa a tu cuenta")}
                </h1>

                {error && (
                    <div className="mb-4 text-sm font-medium text-center text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {resetMessage && (
                    <div className="mb-4 text-sm font-medium text-center text-green-600 dark:text-green-400">
                        {resetMessage}
                    </div>
                )}

                {!isResetting ? (
                    <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mr-1">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 pr-10 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-foreground transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Procesando..." : (isRegistering ? "Registrarse" : "Ingresar")}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4 mb-6">
                        <p className="text-sm text-center text-muted-foreground mb-4">
                            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsResetting(false); setError(""); setResetMessage(""); }}
                            className="w-full flex justify-center py-2 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Volver al inicio de sesión
                        </button>
                    </form>
                )}

                {!isResetting && (
                    <div className="mt-6 flex flex-col gap-3 text-center">
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
                            className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                            {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Registrate"}
                        </button>

                        {!isRegistering && (
                            <button
                                type="button"
                                onClick={() => { setIsResetting(true); setError(""); }}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="absolute bottom-8 left-0 right-0 px-4">
                <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground/60 text-center">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em]">
                        <span>© 2026. Desarrollado por: <span className="text-foreground/80">Lic. Daniel Alberto Zavala Hernández</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
