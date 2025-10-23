import { ReactNode } from 'react';

interface YupCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function YupCard({ children, className = '', onClick }: YupCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#1A1A1A] border border-[#27272A] rounded-2xl p-4
        ${onClick ? 'cursor-pointer hover:border-[#FF6B00]/30 transition-colors' : ''}
        ${className}
      `}
      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)' }}
    >
      {children}
    </div>
  );
}
