import React from 'react';
import Modal from './Modal';
import titleImage from '../assets/dmz-title.png';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "¿Estás seguro de esta acción?",
    description = "Si realizas esta acción no podrás deshacerla.",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar"
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
            <div className="flex flex-col items-center text-center py-4">
                <img
                    src={titleImage.src}
                    alt="DragonMine 2 Logo"
                    className="w-[200px] md:w-[260px] h-auto mb-8 drop-shadow-[0_0_20px_rgba(255,100,0,0.2)] animate-pulse-subtle"
                />

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                    {title}
                </h2>

                <p className="text-white/60 text-base md:text-lg mb-10 max-w-[90%] font-medium leading-relaxed">
                    {description}
                </p>

                <div className="flex flex-col-reverse sm:flex-row gap-4 w-full px-4 sm:px-0 sm:justify-center">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-[160px] px-8 py-3.5 rounded-full bg-black/40 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
                    >
                        {cancelLabel}
                    </button>

                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="w-full sm:w-[160px] px-8 py-3.5 rounded-full bg-[#E2E2DF] text-[#121214] font-bold hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-white/5"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
