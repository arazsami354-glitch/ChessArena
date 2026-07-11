import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  label,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        role="status"
        aria-label={label || "Loading"}
        className={`${sizeClasses[size]} border-zinc-800 border-t-white rounded-full animate-spin`}
      />
      {label && (
        <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-3 select-none">
          {label}
        </span>
      )}
    </div>
  );
}
