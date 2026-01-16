import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, Warning, X } from '@phosphor-icons/react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={24} weight="fill" className="text-green-500" />;
            case 'error': return <XCircle size={24} weight="fill" className="text-red-500" />;
            case 'warning': return <Warning size={24} weight="fill" className="text-yellow-500" />;
            default: return <Info size={24} weight="fill" className="text-blue-500" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success': return 'border-green-500/20 bg-green-500/5';
            case 'error': return 'border-red-500/20 bg-red-500/5';
            case 'warning': return 'border-yellow-500/20 bg-yellow-500/5';
            default: return 'border-blue-500/20 bg-blue-500/5';
        }
    };

    return (
        <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-right-8 duration-300 ${getBgColor()}`}>
            <div className="flex-shrink-0">
                {getIcon()}
            </div>
            <p className="text-sm font-medium text-foreground pr-4">
                {message}
            </p>
            <button
                onClick={onClose}
                className="p-1 hover:bg-foreground/10 rounded-full transition-colors text-muted-foreground"
            >
                <X size={16} />
            </button>
            <div className="absolute bottom-0 left-0 h-1 bg-foreground/10 w-full overflow-hidden rounded-b-xl">
                <div
                    className={`h-full transition-all duration-[4000ms] linear ${type === 'success' ? 'bg-green-500' :
                            type === 'error' ? 'bg-red-500' :
                                type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                    style={{ width: '0%', animation: `toast-progress ${duration}ms linear forwards` }}
                />
            </div>
            <style jsx>{`
                @keyframes toast-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};
