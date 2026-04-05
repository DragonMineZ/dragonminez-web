import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: ButtonProps) {

    const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight rounded-full transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variants = {
        primary: "bg-white text-black hover:bg-gray-200 focus:ring-white shadow-glow",
        secondary: "bg-surface text-white hover:bg-[#1C1C1F] border border-glass hover:border-glass-strong focus:ring-white/20",
        danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 focus:ring-red-500/50",
        ghost: "bg-transparent text-muted hover:text-white hover:bg-glass",
        outline: "bg-transparent border border-white/20 text-white hover:bg-glass",
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-6 py-2.5",
        lg: "text-base px-8 py-3",
        icon: "p-2 w-9 h-9",
    };

    const combinedStyles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
        <button className={combinedStyles} {...props}>
            {children}
        </button>
    );
}

export default Button;
