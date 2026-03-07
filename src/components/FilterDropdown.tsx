import React, { useState, useRef, useEffect } from 'react';

interface Option {
    id: string | number;
    label: string;
}

interface FilterDropdownProps {
    label: string;
    options: Option[];
    selectedId?: string | number;
    onSelect: (id: string | number) => void;
}

export default function FilterDropdown({ label, options, selectedId, onSelect }: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === selectedId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-3 px-5 py-2.5 bg-[#121214] border transition-all rounded-full min-w-[160px] group
                    ${isOpen ? 'border-white/60' : 'border-white/5 hover:border-white/10'}
                `}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-200">
                        {selectedOption ? selectedOption.label : label}
                    </span>
                </div>
                <span className={`material-symbols-outlined text-[20px] text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[180px] bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200">
                    <div className="p-1.5 flex flex-col gap-1">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    onSelect(option.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm font-bold rounded-xl transition-all
                                    ${selectedId === option.id
                                        ? 'bg-white text-black'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                `}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
