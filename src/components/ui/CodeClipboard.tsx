interface CodeClipboardProps {
    code: string;
    copied: boolean;
    onCopy: () => void;
}

export default function CodeClipboard({ code, copied, onCopy }: CodeClipboardProps) {
    return (
        <div className="flex items-center bg-surface-elevated border border-glass-strong rounded-xl overflow-hidden mb-4 max-w-full">
            <span className="text-sm font-medium text-muted truncate flex-1 tracking-tight px-4 py-1.5 font-mono">
                {code}
            </span>
            <button
                onClick={onCopy}
                className="group/copy shrink-0 flex items-center justify-center bg-black w-10 py-1.5 text-muted hover:bg-white hover:text-surface transition-all border-l border-glass-strong"
                title="Copiar código"
            >
                <span className="material-symbols-outlined text-[18px] group-hover/copy:[font-variation-settings:'FILL'_1]">
                    {copied ? 'check' : 'content_copy'}
                </span>
            </button>
        </div>
    );
}
