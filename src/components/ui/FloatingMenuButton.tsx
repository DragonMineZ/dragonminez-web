import React from 'react';

export interface FloatingMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    variant?: 'main' | 'mainActive' | 'option';
    title?: string;
    iconClassName?: string;
}

export const FloatingMenuButton = React.forwardRef<HTMLButtonElement, FloatingMenuButtonProps>(
    ({ icon, variant = 'main', title, className, iconClassName = '', onClick, ...props }, ref) => {
        const baseStyles = "group/fab flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0";

        const variants = {
            main: "bg-surface-elevated text-white border border-glass shadow-glass rounded-[1.25rem] w-[56px] h-[56px]",
            mainActive: "bg-white text-surface-elevated shadow-glow-strong border border-transparent rounded-full w-[56px] h-[56px]",
            option: "bg-surface-elevated text-white border border-glass shadow-glass rounded-[1.25rem] hover:rounded-full hover:bg-[#1C1C1F] hover:border-glass-strong w-12 h-12"
        };

        // Micro-animation: Fill 1 when active OR hovered. Fill 0 normally.
        const fillStyle = variant === 'mainActive'
            ? "[font-variation-settings:'FILL'_1]"
            : "group-hover/fab:[font-variation-settings:'FILL'_1] [font-variation-settings:'FILL'_0]";

        const combinedClass = `${baseStyles} ${variants[variant]} ${className || ''}`;

        return (
            <button
                ref={ref}
                onClick={onClick}
                title={title}
                className={combinedClass}
                {...props}
            >
                <span
                    className={`material-symbols-outlined transition-all duration-300 ${fillStyle} ${iconClassName}`}
                    style={{ fontSize: variant === 'option' ? '28px' : '36px', width: '1em', height: '1em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {icon}
                </span>
            </button>
        );
    });

export default FloatingMenuButton;
