import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useState, useId } from 'react';

type FieldBaseProps = {
    label?: string;
    error?: string;
    as?: 'input' | 'textarea';
};

type InputProps = FieldBaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'as'>;
type TextareaProps = FieldBaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'as'>;

export type FieldProps = InputProps | TextareaProps;

export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(
    ({ label, error, as = 'input', className = '', onChange, value, defaultValue, maxLength, id, ...props }, ref) => {
        const generatedId = useId();
        const elementId = id || generatedId;
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

        const baseInputStyles = `w-full px-5 py-3 bg-surface border border-glass rounded-2xl text-foreground placeholder:text-muted/40 focus:outline-none focus:border-glass-strong focus:bg-surface-elevated/80 focus:backdrop-blur-md focus:shadow-lg transition-all shadow-inner ${error ? 'border-error/60 focus:border-error bg-error-glass/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : ''
            } ${className}`;

        return (
            <div className="space-y-2 w-full">
                {label && (
                    <label htmlFor={elementId} className={`block text-sm font-semibold ml-1 transition-colors duration-300 ${error ? 'text-error' : 'text-foreground/70'}`}>
                        {label}
                    </label>
                )}
                <div className="relative w-full group">
                    {isTextarea ? (
                        <>
                            <textarea
                                id={elementId}
                                ref={ref as any}
                                value={value}
                                defaultValue={defaultValue}
                                onChange={handleChange}
                                maxLength={appliedMaxLength}
                                className={`${baseInputStyles} resize-y min-h-[120px] pb-10 scrollbar-hide relative z-10 bg-transparent`}
                                {...(props as any)}
                            />
                            <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300 ${error ? 'bg-error-glass/5' : 'bg-surface group-focus-within:bg-surface-elevated/80 group-focus-within:backdrop-blur-md'}`}></div>
                            {appliedMaxLength && (
                                <div className="absolute bottom-3 right-3 bg-surface border border-glass text-muted px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider pointer-events-none z-20 shadow-sm transition-all group-focus-within:text-foreground group-focus-within:border-glass-strong">
                                    {currentLength} / {appliedMaxLength}
                                </div>
                            )}
                        </>
                    ) : (
                        <input
                            id={elementId}
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
                    <p className="text-error text-xs ml-1 mt-1 font-medium italic animate-slide-in-soft">{error}</p>
                )}
            </div>
        );
    }
);

Field.displayName = 'Field';
export default Field;
