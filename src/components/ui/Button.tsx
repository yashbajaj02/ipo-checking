import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'amber';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-[#00d084]/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variantStyles = {
    primary:
      'bg-[#00d084] text-[#0b0f17] font-semibold hover:brightness-105 active:scale-[0.98] border border-[#00d084]',
    secondary:
      'bg-transparent text-[#dfe2ee] border border-white/20 hover:bg-[#1f2937] hover:border-white/30',
    outline:
      'bg-[#111827] text-[#dfe2ee] border border-white/10 hover:bg-[#1f2937] hover:border-[#00d084]/40',
    ghost:
      'bg-transparent text-[#bacbbd] hover:text-[#dfe2ee] hover:bg-white/5',
    amber:
      'bg-[#f59e0b] text-[#0b0f17] font-semibold hover:brightness-105 border border-[#f59e0b]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
