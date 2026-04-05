import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    showCloseButton?: boolean;
    noPadding?: boolean;
}

export default function Modal({ isOpen, onClose, children, showCloseButton = true, noPadding = false }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-3xl animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col relative overflow-hidden rounded-[32px] border border-glass-strong bg-background shadow-2xl shadow-foreground/10 ring-1 ring-white/5 max-h-[85vh]">
                    {/* Header/Close Button (Overlay) */}
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="absolute right-6 top-6 z-[100] flex h-10 w-10 items-center justify-center rounded-full bg-glass text-foreground/50 transition-all hover:bg-glass-strong hover:text-foreground"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}

                    {noPadding ? (
                        <div className="flex flex-col flex-1 overflow-hidden relative">
                            {children}
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
