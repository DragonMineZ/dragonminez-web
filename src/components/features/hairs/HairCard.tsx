import { useState, lazy, Suspense } from "react";
import type { Hair } from "../../../types/hair";
import ActionButtons from "../../ui/ActionButtons";
import Chip from "../../ui/Chip";
import AuthorTag from "../../ui/AuthorTag";
import CodeClipboard from "../../ui/CodeClipboard";
import LikeButton from "../../ui/LikeButton";
import Modal from "../../ui/Modal";
import ConfirmDialog from "../../ui/ConfirmDialog";
import SuccessAlert from "../../ui/SuccessAlert";
import InfoDialog from "../../ui/InfoDialog";
import HairCategories from "./HairCategories";
import notFoundImage from '../../../assets/hairsalon/not_found.svg';

import { useLike } from "../../../hooks/useLike";
import { useClipboard } from "../../../hooks/useClipboard";
import { useLanguage } from "../../../i18n";
interface HairCardProps {
    hair: Hair;
    isSignedIn: boolean;
    onDelete: (id: number) => void;
    onUpdateSuccess?: () => void;
    onLikeToggle?: (hairId: number, liked: boolean) => void;
}

const CreateHairForm = lazy(() => import('./CreateHairForm'));

export default function HairCard({ hair, isSignedIn, onDelete, onUpdateSuccess, onLikeToggle }: HairCardProps) {
    const { t } = useLanguage();

    const { isLiked, toggleLike } = useLike(hair.id_hair, !!hair.is_liked_by_user, onLikeToggle);
    const { copied, copy } = useClipboard();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: "" });

    const isOwner = hair.isOwner ?? false;

    // ── Handlers
    const handleCopyCode = () => {
        copy(hair.code, () => {
            setAlert({ show: true, message: t('hairSalon.copySuccess') });
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
                message: result.isLiked ? t('hairSalon.addedToFavorites') : t('hairSalon.removedFromFavorites')
            });
        } else if (result.errorMessage) {
            setAlert({ show: true, message: result.errorMessage });
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

    // ── Render
    return (
        <div className="group/card relative bg-surface rounded-[32px] border border-glass p-4 md:p-6 flex flex-col md:flex-row gap-6 transition-all duration-300 hover:border-glass-strong hover:bg-surface-elevated">
            <div className="relative w-full md:w-48 aspect-square shrink-0">
                <img
                    src={hair.image_url}
                    alt={hair.name}
                    className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover/card:scale-105"
                    onError={(e) => {
                        e.currentTarget.src = notFoundImage.src;
                        e.currentTarget.onerror = null;
                    }}
                />
            </div>

            <div className="flex flex-col flex-1 min-w-0 py-2">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-[1px] truncate pr-4">
                        {hair.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <Chip
                            href={`/viewer?code=${encodeURIComponent(hair.code)}&name=${encodeURIComponent(hair.name)}`}
                            icon="visibility"
                            variant="outline"
                            title={t('hairSalon.view3D')}
                        />
                        <LikeButton
                            isLiked={isLiked}
                            likesCount={hair._count?.likes || 0}
                            onClick={handleToggleLikeClick}
                        />
                    </div>
                </div>

                <HairCategories categories={hair.categories} className="mb-3" />

                <CodeClipboard code={hair.code} copied={copied} onCopy={handleCopyCode} />

                <p className="text-sm text-foreground/70 line-clamp-3 leading-[1.6] mb-4 font-normal">
                    {hair.description || t('hairSalon.noDescription')}
                </p>

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

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} noPadding={true}>
                <Suspense fallback={
                    <div className="h-48 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                    </div>
                }>
                    <CreateHairForm initialData={hair} onSuccess={handleEditSuccess} />
                </Suspense>
            </Modal>

            <ConfirmDialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => onDelete(hair.id_hair)}
                description={t('hairSalon.deleteConfirmDesc')}
            />

            <InfoDialog
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title={t('hairSalon.authRequiredTitle')}
                description={t('hairSalon.authRequiredDesc')}
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

