import { useState } from "react";

interface SearchBarProps {
    onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const [query, setQuery] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    };

    const handleClear = () => {
        setQuery("");
        onSearch("");
    };

    return (
        <div className="w-full">
            <div className="group/search relative bg-[#121214] border border-white/5 rounded-full overflow-hidden transition-all duration-300 focus-within:border-white/20 hover:border-white/10 shadow-lg">
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    placeholder="Busca tu cabello"
                    className="w-full h-14 pl-8 pr-16 bg-transparent text-white placeholder-gray-500 font-medium text-lg outline-none"
                />
                <div className="absolute right-2 top-2 bottom-2 w-12 flex items-center justify-center transition-all duration-300">
                    {query ? (
                        <button
                            onClick={handleClear}
                            className="group/clear w-full h-full flex items-center justify-center bg-black rounded-full text-gray-400 hover:bg-[#E2E2DF] hover:text-[#121214] transition-all duration-300"
                        >
                            <span className="material-symbols-outlined text-[24px] group-hover/clear:[font-variation-settings:'FILL'_1]">
                                close
                            </span>
                        </button>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <span className="material-symbols-outlined text-[24px]">
                                search
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
