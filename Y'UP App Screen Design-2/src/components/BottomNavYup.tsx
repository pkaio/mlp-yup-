import { Home, Compass, PlusCircle, Map, User } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavYupProps {
  activeTab: 'feed' | 'discover' | 'upload' | 'map' | 'profile';
  onTabChange: (tab: 'feed' | 'discover' | 'upload' | 'map' | 'profile') => void;
}

export function BottomNavYup({ activeTab, onTabChange }: BottomNavYupProps) {
  const navItems = [
    { id: 'feed' as const, icon: Home, label: 'Feed' },
    { id: 'discover' as const, icon: Compass, label: 'Descobrir' },
    { id: 'upload' as const, icon: PlusCircle, label: 'Postar', isCenter: true },
    { id: 'map' as const, icon: Map, label: 'Mapa' },
    { id: 'profile' as const, icon: User, label: 'Perfil' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-[56px] bg-[#1A1A1A] border-t border-[#27272A] z-50"
      style={{ boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.25)' }}
    >
      <div className="h-full max-w-screen-xl mx-auto flex items-center justify-around px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const iconSize = item.isCenter ? 28 : 20;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex items-center justify-center w-[60px] h-full"
            >
              <Icon 
                size={iconSize} 
                className={`transition-colors duration-200 ${isActive ? 'text-[#FF6B00]' : 'text-[#9CA3AF]'}`}
                strokeWidth={2}
              />
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#FF6B00] rounded-b"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
