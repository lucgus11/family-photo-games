import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`bg-stone-900 border border-stone-700 rounded-2xl p-5 ${glow ? 'ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
