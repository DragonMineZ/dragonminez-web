import Tooltip from "./Tooltip";

interface LikeButtonProps {
    isLiked: boolean;
    likesCount: number;
    onClick: (e: React.MouseEvent) => void;
}

export default function LikeButton({ isLiked, likesCount, onClick }: LikeButtonProps) {
    return (
        <Tooltip content={isLiked ? "Eliminar de favoritos" : "Dar me gusta"}>
            <button
                onClick={onClick}
                className={`group/like flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 ${isLiked
                    ? "bg-foreground border-glass text-background"
                    : "border-glass text-muted hover:bg-foreground hover:text-background"
                    }`}
            >
                <span className={`material-symbols-outlined text-[24px] transition-all ${isLiked
                    ? "text-red-500 [font-variation-settings:'FILL'_1]"
                    : "text-red-500 group-hover/like:[font-variation-settings:'FILL'_1]"
                    }`}>
                    favorite
                </span>
                <span className="text-xl font-bold leading-none">
                    {likesCount}
                </span>
            </button>
        </Tooltip>
    );
}
