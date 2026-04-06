import React from 'react';
import Modal from './Modal';
import Button from './Button';
import titleImage from '../../assets/dmz-title.png';
import { useLanguage } from '../../i18n';

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
    title,
    description,
    confirmLabel,
    cancelLabel
}: ConfirmDialogProps) {
    const { t } = useLanguage();
    
    const displayTitle = title || t('hairSalon.deleteConfirmTitle');
    const displayDescription = description || t('common.error'); // Fallback to common error if not provided
    const displayConfirmLabel = confirmLabel || t('common.confirm');
    const displayCancelLabel = cancelLabel || t('common.cancel');

    return (
        <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
            <div className="flex flex-col items-center text-center py-4">
                <img
                    src={titleImage.src}
                    alt="DragonMine 2 Logo"
                    className="w-[200px] md:w-[260px] h-auto mb-8 drop-shadow-glow-orange animate-pulse-subtle"
                />

                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">
                    {displayTitle}
                </h2>

                <p className="text-foreground/60 text-base md:text-lg mb-8 max-w-[90%] font-medium leading-relaxed">
                    {displayDescription}
                </p>

                <div className="flex flex-col-reverse sm:flex-row gap-4 w-full px-4 sm:px-0 sm:justify-center">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="w-full sm:w-[160px]"
                    >
                        {displayCancelLabel}
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="w-full sm:w-[160px]"
                    >
                        {displayConfirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
