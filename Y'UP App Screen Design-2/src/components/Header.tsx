import { ArrowLeft, MoreVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  showBackButton?: boolean;
}

export function Header({ title, onBack, rightAction, showBackButton = true }: HeaderProps) {
  return (
    <header className="sticky top-0 left-0 right-0 h-[64px] bg-[#1A1A1A] border-b border-[#27272A] px-4 z-40 flex items-center justify-between">
      <div className="w-10 flex items-center">
        {showBackButton && onBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-[#27272A] rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-[#F5F5F5]" />
          </button>
        )}
      </div>
      
      <h1 className="absolute left-1/2 -translate-x-1/2 text-[#F5F5F5]">
        {title}
      </h1>
      
      <div className="w-10 flex items-center justify-end">
        {rightAction}
      </div>
    </header>
  );
}
