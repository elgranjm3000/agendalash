'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

// Implementación propia (div) en lugar de @radix-ui/react-progress:
// el minificador SWC de Next 13.5 corrompe los template literals de Radix
// Progress y rompe el build de producción.

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className={cn('h-full flex-1 bg-primary transition-all', indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
    </div>
  )
);
Progress.displayName = 'Progress';

export { Progress };
