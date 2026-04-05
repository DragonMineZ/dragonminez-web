import React from 'react';

export interface FloatingOptionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    title?: string;
    iconClassName?: string;
}

export const FloatingOptionButton = React.forwardRef<HTMLButtonElement, FloatingOptionButtonProps>(
    ({ icon, title, className, iconClassName = '', onClick, ...props }, ref) => {
        // Micro-animation: Fill 1 when hovered. Fill 0 normally.
        const fillStyle = "group-hover/fab:[font-variation-settings:'FILL'_1] [font-variation-settings:'FILL'_0]";

        return (
            <button
                ref={ref}
                onClick={onClick}
                title={title}
                className={`group/fab fab-option ${className || ''}`}
                {...props}
            >
                <span className={`material-symbols-outlined transition-all duration-300 ${fillStyle} text-[28px] ${iconClassName}`}>
                    {icon}
                </span>
            </button>
        );
    }
);

export default FloatingOptionButton;
