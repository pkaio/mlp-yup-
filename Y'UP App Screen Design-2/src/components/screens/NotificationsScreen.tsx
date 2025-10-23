import { Heart, MessageCircle, UserPlus, Trophy, TrendingUp, ArrowLeft } from 'lucide-react';
import { Header } from '../Header';
import { YupCard } from '../YupCard';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface NotificationsScreenProps {
  onBack?: () => void;
}

const notifications = [
  {
    id: 1,
    type: 'like',
    user: 'Ana Santos',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    action: 'curtiu seu vídeo',
    content: 'Novo ollie na rampa do Ibirapuera! 🛹',
    time: '5min',
    unread: true,
  },
  {
    id: 2,
    type: 'comment',
    user: 'Pedro Lima',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    action: 'comentou',
    content: 'Que manobra incrível! 🔥',
    time: '15min',
    unread: true,
  },
  {
    id: 3,
    type: 'follow',
    user: 'Maria Oliveira',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    action: 'começou a seguir você',
    time: '1h',
    unread: true,
  },
  {
    id: 4,
    type: 'achievement',
    action: 'Nova conquista desbloqueada!',
    content: 'Streak de 7 dias 🔥',
    time: '2h',
    unread: false,
  },
  {
    id: 5,
    type: 'xp',
    action: 'Você ganhou XP!',
    content: '+150 XP pelo vídeo publicado',
    time: '3h',
    unread: false,
  },
  {
    id: 6,
    type: 'like',
    user: 'João Costa',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    action: 'curtiu seu vídeo',
    content: 'Backroll perfeito no cabo',
    time: '5h',
    unread: false,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart size={20} className="text-[#EF4444] fill-[#EF4444]" />;
    case 'comment':
      return <MessageCircle size={20} className="text-[#00BFFF]" />;
    case 'follow':
      return <UserPlus size={20} className="text-[#22C55E]" />;
    case 'achievement':
      return <Trophy size={20} className="text-[#FF6B00]" />;
    case 'xp':
      return <TrendingUp size={20} className="text-[#FF6B00]" />;
    default:
      return <Heart size={20} className="text-[#9CA3AF]" />;
  }
};

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <Header 
        title="Notificações" 
        showBackButton={!!onBack}
        onBack={onBack}
        rightAction={
          unreadCount > 0 ? (
            <Badge className="bg-[#FF6B00] text-white border-0">
              {unreadCount}
            </Badge>
          ) : null
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-2">
          {notifications.map((notification) => (
            <YupCard 
              key={notification.id} 
              className={`
                hover:border-[#FF6B00]/30 transition-all cursor-pointer
                ${notification.unread ? 'border-[#FF6B00]/20 bg-[#FF6B00]/5' : ''}
              `}
            >
              <div className="flex gap-3">
                {/* Avatar or Icon */}
                <div className="flex-shrink-0">
                  {notification.user ? (
                    <ImageWithFallback
                      src={notification.avatar!}
                      alt={notification.user}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[#27272A] rounded-full flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[#F5F5F5] text-[14px]">
                      {notification.user && (
                        <span className="font-semibold">{notification.user} </span>
                      )}
                      <span className="text-[#9CA3AF]">{notification.action}</span>
                    </p>
                    <span className="text-[#9CA3AF] text-[12px] flex-shrink-0">
                      {notification.time}
                    </span>
                  </div>

                  {notification.content && (
                    <p className="text-[#9CA3AF] text-[14px]">
                      {notification.content}
                    </p>
                  )}
                </div>

                {/* Unread Indicator */}
                {notification.unread && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-[#FF6B00] rounded-full" />
                  </div>
                )}
              </div>
            </YupCard>
          ))}
        </div>

        {/* Empty state (hidden when there are notifications) */}
        {notifications.length === 0 && (
          <YupCard className="text-center py-12">
            <div className="w-16 h-16 bg-[#27272A] rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="text-[#9CA3AF]" />
            </div>
            <h3 className="text-[#F5F5F5] mb-2">Nenhuma notificação</h3>
            <p className="text-[#9CA3AF] text-[14px]">
              Quando alguém interagir com você, aparecerá aqui!
            </p>
          </YupCard>
        )}
      </div>
    </div>
  );
}
