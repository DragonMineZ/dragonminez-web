import { useState, useCallback } from 'react';
import { useAuth } from "@clerk/astro/react";

export function useLike(
    hairId: number,
    initialIsLiked: boolean,
    onLikeToggle?: (hairId: number, liked: boolean) => void
) {
// ── Estado
    const { getToken, isSignedIn } = useAuth();
    const [isLiked, setIsLiked] = useState(initialIsLiked);

// ── Handlers
    const toggleLike = async () => {
        if (!isSignedIn) return { success: false, requireAuth: true };

        const currentlyLiked = isLiked;
        const newLikedState = !currentlyLiked;

        setIsLiked(newLikedState);
        if (onLikeToggle) onLikeToggle(hairId, newLikedState);

        try {
            const token = await getToken();
            const method = currentlyLiked ? "DELETE" : "PUT";
            const res = await fetch(`/api/hairs/${hairId}/like`, {
                method,
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                return { success: true, isLiked: newLikedState };
            } else {
                setIsLiked(currentlyLiked);
                if (onLikeToggle) onLikeToggle(hairId, currentlyLiked);
                const data = await res.json().catch(() => ({}));
                return { success: false, requireAuth: false, errorMessage: data.error as string | undefined };
            }
        } catch (error) {
            setIsLiked(currentlyLiked);
            if (onLikeToggle) onLikeToggle(hairId, currentlyLiked);
            console.error("Error toggling like", error);
            return { success: false, requireAuth: false, errorMessage: undefined };
        }
    };

    return { isLiked, toggleLike };
}
