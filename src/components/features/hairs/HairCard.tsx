import { useState, useEffect } from "react";
import type { Hair } from "../../types/hair";
import { useAuth } from "@clerk/astro/react";
import ActionButtons from "../../ui/ActionButtons";
import Modal from "../../ui/Modal";
import CreateHairForm from "./CreateHairForm";
import ConfirmDialog from "../../ui/ConfirmDialog";
import SuccessAlert from "../../ui/SuccessAlert";
import InfoDialog from "../../ui/InfoDialog";

import { useLike } from "../../../hooks/useLike";
import { useClipboard } from "../../../hooks/useClipboard";

interface HairCardProps {
    hair: Hair;
    isSignedIn: boolean;
    onDelete: (id: number) => void;
    onUpdateSuccess?: () => void;
    onLikeToggle?: (hairId: number, liked: boolean) => void;
}

export default function HairCard({ hair, isSignedIn, onDelete, onUpdateSuccess, onLikeToggle }: HairCardProps) {
    const { userId: clerkId } = useAuth();

    // Abstracted logic into hooks
    const { isLiked, toggleLike, checkInitialLikeStatus } = useLike(hair.id_hair, onLikeToggle);
    const { copied, copy } = useClipboard();

    // UI States for Dialogs
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "" });

    const isOwner = clerkId === hair.artist?.clerk_id;

    // Check like status only once when auth changes
    useEffect(() => {
        if (isSignedIn && clerkId) {
            checkInitialLikeStatus();
        }
    }, [isSignedIn, clerkId, checkInitialLikeStatus]);

    const handleCopyCode = () => {
        copy(hair.code, () => {
            setAlert({ show: true, message: "¡Código copiado al portapapeles!" });
        });
    };

    const handleToggleLikeClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await toggleLike();
        if (result.requireAuth) {
            setIsAuthModalOpen(true);
        } else if (result.success) {
            setAlert({
                show: true,
                message: result.isLiked ? "¡Añadido a tus favoritos!" : "Eliminado de tus favoritos"
            });
        }
    };

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        if (onUpdateSuccess) {
            onUpdateSuccess();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="group/card relative bg-surface rounded-[32px] overflow-hidden border border-glass p-4 flex flex-col md:flex-row gap-6 transition-all duration-300 hover:border-glass-strong hover:bg-surface-elevated">
            <div className="relative w-full md:w-48 aspect-square shrink-0">
                <img
                    src={hair.image_url}
                    alt={hair.name}
                    className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover/card:scale-105"
                />
            </div>

            <div className="flex flex-col flex-1 min-w-0 py-2">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-[1px] truncate pr-4">
                        {hair.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <a
                            href={`/viewer?code=${encodeURIComponent(hair.code)}`}
                            className="flex items-center gap-2 px-3 py-1 rounded-full border border-glass text-muted hover:bg-white hover:text-black transition-all"
                            title="Ver en 3D"
                        >
                            <span className="material-symbols-outlined text-[24px]">view_in_ar</span>
                        </a>
                        <button
                            onClick={handleToggleLikeClick}
                            className={`group/like flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 ${isLiked
                                ? "bg-white border-white/20 text-surface"
                                : "border-glass hover:bg-white hover:text-surface"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[24px] transition-all ${isLiked
                                ? "text-red-500 [font-variation-settings:'FILL'_1]"
                                : "text-red-500 group-hover/like:[font-variation-settings:'FILL'_1]"
                                }`}>
                                favorite
                            </span>
                            <span className="text-xl font-bold leading-none">
                                {hair._count?.likes || 0}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {hair.categories?.length > 0 ? (
                        hair.categories.map((cat) => (
                            <span
                                key={cat.id_category}
                                className="px-3 py-1 bg-glass border border-glass-strong rounded-full text-[10px] font-bold text-white/60 tracking-wider uppercase"
                            >
                                {cat.description}
                            </span>
                        ))
                    ) : (
                        <span className="px-3 py-1 bg-glass border border-glass rounded-full text-[10px] font-bold text-white/30 tracking-wider uppercase">
                            Normal
                        </span>
                    )}
                </div>

                {/* Copy Code Button */}
                <div className="flex items-center bg-surface-elevated border border-glass-strong rounded-xl overflow-hidden mb-4 max-w-full">
                    <span className="text-sm font-medium text-muted truncate flex-1 tracking-tight px-4 py-1.5 font-mono">
                        {hair.code}
                    </span>
                    <button
                        onClick={handleCopyCode}
                        className="group/copy shrink-0 flex items-center justify-center bg-black w-10 py-1.5 text-muted hover:bg-white hover:text-surface transition-all border-l border-glass-strong"
                        title="Copiar código"
                    >
                        <span className="material-symbols-outlined text-[18px] group-hover/copy:[font-variation-settings:'FILL'_1]">
                            {copied ? 'check' : 'content_copy'}
                        </span>
                    </button>
                </div>

                <p className="text-sm text-gray-200 line-clamp-3 leading-[1.6] mb-6 font-normal">
                    {hair.description || "Sin descripción disponible."}
                </p>

                {/* Author Info & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-glass mt-auto">
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <img
                                src={hair.artist.avatar_url}
                                alt={hair.artist.username}
                                className="w-8 h-8 rounded-full border border-white/20 object-cover"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-surface rounded-full" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">Author</span>
                            <span className="text-sm text-gray-200 font-semibold leading-tight">
                                {hair.artist.username}
                            </span>
                        </div>
                    </div>

                    {isSignedIn && isOwner && (
                        <ActionButtons
                            onEdit={() => setIsEditModalOpen(true)}
                            onDelete={() => setIsDeleteModalOpen(true)}
                        />
                    )}
                </div>
            </div>

            {/* Modals are still here but logic is clean and readable */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <CreateHairForm initialData={hair} onSuccess={handleEditSuccess} />
            </Modal>

            <ConfirmDialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => onDelete(hair.id_hair)}
                description="Si realizas esta acción no podrás recuperar este diseño de cabello."
            />

            <InfoDialog
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="Inicio de Sesión Requerido"
                description="Debes iniciar sesión con tu cuenta de Discord para poder dar like a los diseños de la comunidad."
            />

            <SuccessAlert
                show={alert.show}
                message={alert.message}
                duration={2000}
                onClose={() => setAlert({ ...alert, show: false })}
            />
        </div>
    );
}
