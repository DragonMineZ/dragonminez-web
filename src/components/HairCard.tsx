import type { Hair } from "./types/hair";
import { useState } from "react";
import ActionButtons from "./ActionButtons";

interface HairCardProps {
    hair: Hair;
    isSignedIn: boolean;
    onDelete: (id: number) => void;
}

export default function HairCard({ hair, isSignedIn, onDelete }: HairCardProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(hair.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 250);
    };

    const handleEdit = () => {
        window.location.href = `/edit-hair/${hair.id_hair}`;
    };

    return (
        <div className="group/card relative bg-[#121214] rounded-[32px] overflow-hidden border border-white/5 p-4 flex flex-col md:flex-row gap-6 transition-all duration-300 hover:border-white/10 hover:bg-[#18181b]">

            <div className="relative w-full md:w-48 aspect-square shrink-0">
                <img
                    src={hair.image_url}
                    alt={hair.name}
                    className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover/card:scale-105"
                />
            </div>

            {/* Contenido a la derecha */}
            <div className="flex flex-col flex-1 min-w-0 py-2">

                {/* Header: Title and Likes */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-[1px] truncate pr-4">
                        {hair.name}
                    </h3>
                    <button className="group/like flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 hover:bg-[#E2E2DF] hover:text-[#121214] transition-all duration-300">
                        <span className="material-symbols-outlined text-[24px] text-red-500 group-hover/like:[font-variation-settings:'FILL'_1]">
                            favorite
                        </span>
                        <span className="text-xl font-bold leading-none">
                            {hair._count?.likes || 0}
                        </span>
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {hair.categories?.map((cat) => (
                        <span
                            key={cat.id_category}
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/60 tracking-wider uppercase"
                        >
                            {cat.description}
                        </span>
                    ))}
                    {(!hair.categories || hair.categories.length === 0) && (
                        <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-white/30 tracking-wider uppercase">
                            Normal
                        </span>
                    )}
                </div>

                {/* Code Area with Copy Button */}
                <div className="flex items-center bg-[#18181b] border border-white/10 rounded-xl overflow-hidden mb-4 max-w-full">
                    <span className="text-sm font-medium text-gray-400 truncate flex-1 tracking-tight px-4 py-1.5 font-mono">
                        {hair.code}
                    </span>
                    <button
                        onClick={copyToClipboard}
                        className="group/copy shrink-0 flex items-center justify-center bg-black w-10 py-1.5 text-gray-400 hover:bg-[#E2E2DF] hover:text-[#121214] transition-all border-l border-white/10"
                        title="Copiar código"
                    >
                        <span className="material-symbols-outlined text-[18px] group-hover/copy:[font-variation-settings:'FILL'_1]">
                            {copied ? 'check' : 'content_copy'}
                        </span>
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-200 line-clamp-3 leading-[1.6] mb-6 font-normal">
                    {hair.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam molestie, orci varius molestie elementum, mi nunc imperdiet sem, non suscipit orci nisl et ex. Sed non sagittis leo"}
                </p>

                {/* Footer info */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2.5">
                        <div className="relative">
                            <img
                                src={hair.artist.avatar_url}
                                alt={hair.artist.username}
                                className="w-8 h-8 rounded-full border border-white/20 object-cover"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#121214] rounded-full" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">Author</span>
                            <span className="text-sm text-gray-200 font-semibold leading-tight">
                                {hair.artist.username}
                            </span>
                        </div>
                    </div>

                    {isSignedIn && (
                        <ActionButtons
                            onEdit={handleEdit}
                            onDelete={() => onDelete(hair.id_hair)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
