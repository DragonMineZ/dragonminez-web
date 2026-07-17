import React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = '', value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative h-4 w-full overflow-hidden rounded-full bg-foreground/20 ${className}`}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-foreground transition-all duration-500 ease-in-out"
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

const ProgressLabel = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`text-sm font-medium text-foreground ${className}`}
        {...props}
      />
    );
  }
);
ProgressLabel.displayName = 'ProgressLabel';

const ProgressValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { value?: number }>(
  ({ className = '', value, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`text-sm font-medium text-foreground/80 ${className}`}
        {...props}
      >
        {value != null ? `${Math.round(value)}%` : ''}
      </span>
    );
  }
);
ProgressValue.displayName = 'ProgressValue';

export { Progress, ProgressLabel, ProgressValue };
