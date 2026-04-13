import Tooltip from "./Tooltip";
import { useLanguage } from "../../i18n";

interface CodeClipboardProps {
    code: string;
    copied: boolean;
    onCopy: () => void;
}

export default function CodeClipboard({ code, copied, onCopy }: CodeClipboardProps) {
    const { t } = useLanguage();
    return (
        <div className="flex items-center bg-surface-elevated border border-glass-strong rounded-xl mb-4 max-w-full">
            <span className="text-sm font-medium text-muted truncate flex-1 tracking-tight px-4 py-1.5 font-mono rounded-l-xl">
                {code}
            </span>
            <Tooltip content={copied ? t('hairSalon.copied') : t('hairSalon.copyCode')} className="shrink-0 h-[34px]">
                <button
                    onClick={onCopy}
                    className="group/copy w-full h-[34px] flex items-center justify-center bg-foreground px-4 text-background hover:opacity-90 transition-all border-l border-glass-strong rounded-r-xl"
                    aria-label={t('hairSalon.copyCode')}
                >
                    <span className="material-symbols-outlined text-[18px] group-hover/copy:[font-variation-settings:'FILL'_1] transition-all">
                        {copied ? 'check' : 'content_copy'}
                    </span>
                </button>
            </Tooltip>
        </div>
    );
}
