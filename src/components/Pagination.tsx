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
        <div className="flex items-center justify-center gap-2 mt-12 pb-8">
            {/* Botón Anterior */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all duration-300
                    ${currentPage === 1
                        ? 'opacity-20 cursor-not-allowed border-white/5 text-gray-500'
                        : 'bg-[#121214] border-white/5 text-gray-400 hover:border-white/10 hover:text-white active:scale-95'
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
                            <div className="w-12 h-12 flex items-end justify-center text-gray-500 pb-3 font-bold">
                                ...
                            </div>
                        ) : (
                            <button
                                onClick={() => onPageChange(Number(page))}
                                className={`w-12 h-12 flex items-center justify-center rounded-2xl border text-sm font-bold transition-all duration-300 active:scale-95
                                    ${currentPage === page
                                        ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                        : 'bg-[#121214] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
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
                        ? 'opacity-20 cursor-not-allowed border-white/5 text-gray-500'
                        : 'bg-[#121214] border-white/5 text-gray-400 hover:border-white/10 hover:text-white active:scale-95'
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
