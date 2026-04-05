import { useState, useCallback } from 'react';
import { useAuth } from "@clerk/astro/react";

export function useLike(
    hairId: number,
    onLikeToggle?: (hairId: number, liked: boolean) => void
) {
    const { getToken, isSignedIn } = useAuth();
    const [isLiked, setIsLiked] = useState(false);

    const checkInitialLikeStatus = useCallback(async () => {
        if (!isSignedIn) return;
        try {
            const token = await getToken();
            const res = await fetch(`/api/hairs/${hairId}/like`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsLiked(data.liked);
            }
        } catch (error) {
            console.error("Error checking like status", error);
        }
    }, [hairId, isSignedIn, getToken]);

    const toggleLike = async () => {
        if (!isSignedIn) return { success: false, requireAuth: true };

        const newLikedState = !isLiked;
        setIsLiked(newLikedState);

        if (onLikeToggle) {
            onLikeToggle(hairId, newLikedState);
        }

        try {
            const token = await getToken();
            const res = await fetch(`/api/hairs/${hairId}/like`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                return { success: true, isLiked: newLikedState };
            } else {
                // Rollback on failure
                setIsLiked(!newLikedState);
                if (onLikeToggle) onLikeToggle(hairId, !newLikedState);
                return { success: false, requireAuth: false };
            }
        } catch (error) {
            setIsLiked(!newLikedState);
            if (onLikeToggle) onLikeToggle(hairId, !newLikedState);
            console.error("Error toggling like", error);
            return { success: false, requireAuth: false };
        }
    };

    return { isLiked, toggleLike, checkInitialLikeStatus };
}
