import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useState } from 'react';

type FieldBaseProps = {
    label?: string;
    error?: string;
    as?: 'input' | 'textarea';
};

type InputProps = FieldBaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'as'>;
type TextareaProps = FieldBaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'as'>;

export type FieldProps = InputProps | TextareaProps;

export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(
    ({ label, error, as = 'input', className = '', onChange, value, defaultValue, maxLength, ...props }, ref) => {
        const isTextarea = as === 'textarea';
        const appliedMaxLength = isTextarea && maxLength === undefined ? 1000 : maxLength;

        const [internalValue, setInternalValue] = useState(value !== undefined ? value : (defaultValue || ''));

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (value === undefined) {
                setInternalValue(e.target.value);
            }
            if (onChange) {
                onChange(e as any);
            }
        };

        const currentValue = value !== undefined ? value : internalValue;
        const currentLength = String(currentValue || '').length;

        const baseInputStyles = `w-full px-5 py-3 bg-surface border border-glass rounded-2xl text-foreground placeholder:text-muted/40 focus:outline-none focus:border-glass-strong focus:bg-surface-elevated/80 focus:backdrop-blur-md focus:shadow-lg transition-all shadow-inner ${error ? 'border-red-500/50 focus:border-red-500' : ''
            } ${className}`;

        return (
            <div className="space-y-2 w-full">
                {label && (
                    <label className="block text-sm font-semibold text-foreground/70 ml-1">
                        {label}
                    </label>
                )}
                <div className="relative w-full group">
                    {isTextarea ? (
                        <>
                            <textarea
                                ref={ref as any}
                                value={value}
                                defaultValue={defaultValue}
                                onChange={handleChange}
                                maxLength={appliedMaxLength}
                                className={`${baseInputStyles} resize-y min-h-[120px] pb-10 scrollbar-hide relative z-10 bg-transparent`}
                                {...(props as any)}
                            />
                            <div className="absolute inset-0 bg-surface rounded-2xl pointer-events-none group-focus-within:bg-surface-elevated/80 group-focus-within:backdrop-blur-md transition-all"></div>
                            {appliedMaxLength && (
                                <div className="absolute bottom-3 right-3 bg-surface border border-glass text-muted px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider pointer-events-none z-20 shadow-sm transition-all group-focus-within:text-foreground group-focus-within:border-glass-strong">
                                    {currentLength} / {appliedMaxLength}
                                </div>
                            )}
                        </>
                    ) : (
                        <input
                            ref={ref as any}
                            value={value}
                            defaultValue={defaultValue}
                            onChange={handleChange}
                            maxLength={appliedMaxLength}
                            className={baseInputStyles}
                            {...(props as any)}
                        />
                    )}
                </div>
                {error && (
                    <p className="text-red-500 text-xs ml-1 mt-1">{error}</p>
                )}
            </div>
        );
    }
);

Field.displayName = 'Field';
export default Field;
