import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { useLanguage } from '../../i18n';

interface DownloadDropdownProps {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    curseforgeIcon: string;
    modrinthIcon: string;
    showLabel?: boolean;
    label?: string;
    showIcon?: boolean;
}

export function DownloadDropdown({
    variant = 'primary',
    size = 'md',
    className = '',
    curseforgeIcon,
    modrinthIcon,
    showLabel = true,
    label,
    showIcon = true
}: DownloadDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { t, isLoaded } = useLanguage();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        {
            name: 'CurseForge',
            url: 'https://www.curseforge.com/minecraft/mc-mods/dragonminez',
            icon: curseforgeIcon
        },
        {
            name: 'Modrinth',
            url: 'https://modrinth.com/mod/dragonminez',
            icon: modrinthIcon
        }
    ];

    return (
        <div className={`relative inline-block ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 transition-all transition-colors duration-200 cursor-pointer ${variant === 'ghost'
                        ? 'text-xl font-medium text-white/80 hover:text-white bg-transparent p-0'
                        : `font-bold tracking-tight rounded-full outline-none focus:ring-2 focus:ring-gray-300 ${variant === 'primary'
                            ? 'bg-foreground text-background px-8 py-3 hover:opacity-90 hover:scale-105 active:scale-95 shadow-glow'
                            : 'bg-surface-elevated text-foreground hover:bg-surface border border-glass hover:border-glass-strong px-6 py-2.5'
                        }`
                    }`}
            >
                {showIcon && (
                    <span className="material-symbols-rounded text-xl transition-transform group-hover:scale-110">
                        download
                    </span>
                )}
                {showLabel && (
                    <span>
                        {label || (isLoaded ? t('home.hero.cta') : '')}
                    </span>
                )}
                <span className={`material-symbols-rounded text-lg transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-3 w-[220px] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bg-surface/90 backdrop-blur-xl border border-glass-strong rounded-[2rem] overflow-hidden shadow-dropdown animate-in fade-in zoom-in slide-in-from-top-2 duration-200 p-2">
                    <div className="flex flex-col gap-1">
                        {options.map((option) => (
                            <a
                                key={option.name}
                                href={option.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 px-5 py-4 rounded-3xl transition-all hover:bg-white/10 group active:scale-[0.98]"
                                onClick={() => setIsOpen(false)}
                            >
                                <div
                                    className="w-10 h-10 flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                                    dangerouslySetInnerHTML={{ __html: option.icon }}
                                />
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-bold text-foreground group-hover:text-white transition-colors">
                                        {option.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                        {t('common.platform')}
                                    </span>
                                </div>
                                <span className="material-symbols-rounded ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform">
                                    chevron_right
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DownloadDropdown;
