import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Siempre mostrar la primera
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Mostrar páginas alrededor de la actual
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Siempre mostrar la última
            if (!pages.includes(totalPages)) {
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-2 mt-8 pb-4">
            {/* Botón Anterior */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all duration-300
                    ${currentPage === 1
                        ? 'opacity-20 cursor-not-allowed border-glass text-muted'
                        : 'bg-surface border-glass text-muted hover:border-glass-strong hover:text-foreground active:scale-95'
                    }
                `}
            >
                <span className="material-symbols-outlined text-[24px]">
                    chevron_left
                </span>
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-2">
                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <div className="w-12 h-12 flex items-end justify-center text-muted pb-3 font-bold">
                                ...
                            </div>
                        ) : (
                            <button
                                onClick={() => onPageChange(Number(page))}
                                className={`w-12 h-12 flex items-center justify-center rounded-2xl border text-sm font-bold transition-all duration-300 active:scale-95
                                    ${currentPage === page
                                        ? 'bg-foreground text-background border-foreground shadow-glow-strong'
                                        : 'bg-surface border-glass text-muted hover:border-glass-strong hover:text-foreground'
                                    }
                                `}
                            >
                                {page}
                            </button>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Botón Siguiente */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all duration-300
                    ${currentPage === totalPages
                        ? 'opacity-20 cursor-not-allowed border-glass text-muted'
                        : 'bg-surface border-glass text-muted hover:border-glass-strong hover:text-foreground active:scale-95'
                    }
                `}
            >
                <span className="material-symbols-outlined text-[24px]">
                    chevron_right
                </span>
            </button>
        </div>
    );
}
