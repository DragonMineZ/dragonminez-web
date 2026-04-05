import type { ReactNode } from "react";
import Tooltip from "./Tooltip";

type ChipProps = {
    children?: ReactNode;
    variant?: "glass" | "solid" | "outline";
    icon?: string;
    onClick?: (e?: any) => void;
    href?: string;
    className?: string;
    title?: string;
};

export default function Chip({
    children,
    variant = "glass",
    icon,
    onClick,
    href,
    className = "",
    title
}: ChipProps) {
    // Base styles for round borders and text consistency
    const baseStyles = "group/chip inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-300";

    // Vary styles based on logic similar to architecture
    const variantStyles = {
        glass: "px-3 py-1 bg-glass border border-glass-strong text-[10px] font-bold text-white/60 tracking-wider uppercase hover:bg-glass-strong hover:text-white",
        outline: "px-3 py-1 border border-glass text-muted hover:bg-white hover:text-surface",
        solid: "px-3 py-1 bg-white border border-white/20 text-surface font-bold"
    };

    // If there's NO children (meaning purely an icon button chip like the viewer button), override padding optionally via className or just inherit
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

    const content = (
        <>
            {icon && (
                <span className={`material-symbols-outlined text-[18px] leading-none transition-all duration-300 ${!children ? 'text-[24px]' : ''} group-hover/chip:[font-variation-settings:'FILL'_1]`}>
                    {icon}
                </span>
            )}
            {children && <span className="leading-none">{children}</span>}
        </>
    );

    let element = (
        <span className={combinedClassName}>
            {content}
        </span>
    );

    if (href) {
        element = (
            <a href={href} className={combinedClassName}>
                {content}
            </a>
        );
    } else if (onClick) {
        element = (
            <button onClick={onClick} className={combinedClassName}>
                {content}
            </button>
        );
    }

    if (title) {
        return <Tooltip content={title}>{element}</Tooltip>;
    }

    return element;
}
