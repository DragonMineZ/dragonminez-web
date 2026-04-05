import React, { type ReactNode } from "react";

interface TooltipProps {
    children: ReactNode;
    content: string;
    position?: "top" | "bottom";
    className?: string;
    disabled?: boolean;
}

export default function Tooltip({ children, content, position = "top", className = "", disabled = false }: TooltipProps) {
    if (disabled) return <>{children}</>;

    return (
        <div className={`tooltip-wrapper group/tooltip ${className}`}>
            {children}
            <div className={`tooltip-content ${position === "top" ? "tooltip-top" : "tooltip-bottom"}`}>
                <div className="tooltip-inner">
                    {content}
                    <div className={`tooltip-arrow ${position === "top" ? "tooltip-arrow-top" : "tooltip-arrow-bottom"}`} />
                </div>
            </div>
        </div>
    );
}
