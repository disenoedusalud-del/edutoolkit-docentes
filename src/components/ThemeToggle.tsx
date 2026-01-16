"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Palette, Tree, Ghost } from "@phosphor-icons/react"

export function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme()
    const [isOpen, setIsOpen] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    // Close formatting on outside click
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const themes = [
        { id: "light", name: "Claro", icon: <Sun size={18} /> },
        { id: "dark", name: "Oscuro", icon: <Moon size={18} /> },
        { id: "system", name: "Sistema", icon: <Monitor size={18} /> },
        { id: "tokyo", name: "Tokyo Night", icon: <Palette size={18} />, color: "#7aa2f7" },
        { id: "dracula", name: "Dracula", icon: <Ghost size={18} />, color: "#ff79c6" },
        { id: "reforest", name: "Reforest", icon: <Tree size={18} />, color: "#4ade80" },
    ]

    const getCurrentIcon = () => {
        if (!mounted) return <Monitor size={20} className="opacity-50" />; // Fallback
        // Logic to show generic sun/moon based on resolved theme if standard, or palette for custom
        if (theme === 'system') return <Monitor size={20} />;
        if (theme === 'light') return <Sun size={20} />;
        if (theme === 'dark') return <Moon size={20} />;
        return <Palette size={20} />;
    }

    // Don't render dropdown logic until mounted to be safe, though button is key
    if (!mounted) {
        return (
            <button className="p-2 rounded-full text-muted-foreground border border-transparent">
                <div className="w-5 h-5 bg-muted rounded-full animate-pulse"></div>
            </button>
        )
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-border"
                title="Cambiar tema"
            >
                {getCurrentIcon()}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-xl border border-border z-50 overflow-hidden py-1 animate-fadeIn">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Temas
                    </div>
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTheme(t.id)
                                setIsOpen(false)
                            }}
                            className={`
                w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors
                ${theme === t.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-foreground hover:bg-muted"}
              `}
                        >
                            <span className={theme === t.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}>
                                {t.icon}
                            </span>
                            <span>{t.name}</span>
                            {t.color && (
                                <span
                                    className="ml-auto w-2 h-2 rounded-full"
                                    style={{ backgroundColor: t.color }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
