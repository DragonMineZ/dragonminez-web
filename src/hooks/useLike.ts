import { useState, useCallback } from 'react';
import { useAuth } from "@clerk/astro/react";

export function useLike(
    hairId: number,
    initialIsLiked: boolean,
    onLikeToggle?: (hairId: number, liked: boolean) => void
) {
    const { getToken, isSignedIn } = useAuth();
    const [isLiked, setIsLiked] = useState(initialIsLiked);

    const toggleLike = async () => {
        if (!isSignedIn) return { success: false, requireAuth: true };

        // Capture state before optimistic update so we can rollback correctly
        const currentlyLiked = isLiked;
        const newLikedState = !currentlyLiked;

        setIsLiked(newLikedState);
        if (onLikeToggle) onLikeToggle(hairId, newLikedState);

        try {
            const token = await getToken();
            // PUT gives a like (idempotent), DELETE removes it (idempotent)
            const method = currentlyLiked ? "DELETE" : "PUT";
            const res = await fetch(`/api/hairs/${hairId}/like`, {
                method,
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                return { success: true, isLiked: newLikedState };
            } else {
                // Rollback optimistic update on failure
                setIsLiked(currentlyLiked);
                if (onLikeToggle) onLikeToggle(hairId, currentlyLiked);
                // Read the server error message so callers can surface it
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
