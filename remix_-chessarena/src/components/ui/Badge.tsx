import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    success: 'bg-green-950/60 border-green-800 text-green-400',
    warning: 'bg-amber-950/60 border-amber-800 text-amber-400',
    error: 'bg-red-950/60 border-red-800 text-red-400',
    info: 'bg-blue-950/60 border-blue-800 text-blue-400',
    neutral: 'bg-zinc-800 border-zinc-700 text-zinc-300',
    premium: 'bg-purple-950/60 border-purple-800 text-purple-400'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded select-none ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
