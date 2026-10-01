import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface-1' | 'surface-2' | 'surface-3';
}

export function Card({
  className,
  variant = 'surface-1',
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    'surface-1': 'bg-[#111827] border border-white/[0.07]',
    'surface-2': 'bg-[#1f2937] border border-white/[0.12]',
    'surface-3': 'bg-[#1e293b] border border-white/[0.16] shadow-xl',
  };

  return (
    <div
      className={cn(
        'rounded p-4 transition-all duration-200',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
