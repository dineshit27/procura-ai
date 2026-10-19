import * as React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
