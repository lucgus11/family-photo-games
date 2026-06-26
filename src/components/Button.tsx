import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-lg shadow-amber-500/30',
    secondary: 'bg-stone-700 hover:bg-stone-600 text-stone-100 border border-stone-600',
    ghost: 'bg-transparent hover:bg-stone-800 text-stone-300',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1',
    md: 'px-5 py-2.5 text-base gap-2',
    lg: 'px-7 py-3.5 text-lg gap-2',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
