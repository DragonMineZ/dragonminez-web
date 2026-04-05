import { useState, useEffect } from "react";
import type { Hair } from "../../types/hair";
import { useAuth } from "@clerk/astro/react";
import ActionButtons from "../../ui/ActionButtons";
import Chip from "../../ui/Chip";
import AuthorTag from "../../ui/AuthorTag";
import CodeClipboard from "../../ui/CodeClipboard";
import LikeButton from "../../ui/LikeButton";
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
        <div className="group/card relative bg-surface rounded-[32px] border border-glass p-4 md:p-6 flex flex-col md:flex-row gap-6 transition-all duration-300 hover:border-glass-strong hover:bg-surface-elevated">
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
                        <Chip
                            href={`/viewer?code=${encodeURIComponent(hair.code)}`}
                            icon="visibility"
                            variant="outline"
                            title="Ver en 3D"
                        />
                        <LikeButton
                            isLiked={isLiked}
                            likesCount={hair._count?.likes || 0}
                            onClick={handleToggleLikeClick}
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {(hair.categories?.length ?? 0) > 0 ? (
                        hair.categories?.map((cat) => (
                            <Chip key={cat.id_category} variant="glass">
                                {cat.description}
                            </Chip>
                        ))
                    ) : (
                        <Chip variant="glass" className="opacity-50">
                            Normal
                        </Chip>
                    )}
                </div>

                {/* Copy Code Button */}
                <CodeClipboard code={hair.code} copied={copied} onCopy={handleCopyCode} />

                <p className="text-sm text-gray-200 line-clamp-3 leading-[1.6] mb-4 font-normal">
                    {hair.description || "Sin descripción disponible."}
                </p>

                {/* Author Info & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-glass mt-auto">
                    <AuthorTag
                        avatarUrl={hair.artist.avatar_url}
                        username={hair.artist.username}
                        isOnline={true}
                    />

                    {isSignedIn && isOwner && (
                        <ActionButtons
                            onEdit={() => setIsEditModalOpen(true)}
                            onDelete={() => setIsDeleteModalOpen(true)}
                        />
                    )}
                </div>
            </div>

            {/* Modals are still here but logic is clean and readable */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} noPadding={true}>
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
