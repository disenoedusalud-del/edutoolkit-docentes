import React from 'react';
import { Warning, X, Check } from '@phosphor-icons/react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    onCancel,
    isDestructive = false,
    isLoading = false
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400'}`}>
                            <Warning size={24} weight="fill" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors border border-border"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors flex items-center gap-2 ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
                                    : 'bg-primary hover:bg-primary/90'
                                } disabled:opacity-50`}
                        >
                            {isLoading && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
