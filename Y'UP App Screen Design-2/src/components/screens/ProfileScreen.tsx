import { Settings, Bell, Trophy, TrendingUp, Award, Heart } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../Header';
import { YupCard } from '../YupCard';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { NotificationsScreen } from './NotificationsScreen';

const achievements = [
  { id: 1, title: 'Primeiro Vídeo', icon: '🎬', unlocked: true },
  { id: 2, title: '100 Likes', icon: '❤️', unlocked: true },
  { id: 3, title: 'Streak 7 dias', icon: '🔥', unlocked: true },
  { id: 4, title: '1000 XP', icon: '⚡', unlocked: false },
  { id: 5, title: 'Top 10 Região', icon: '🏆', unlocked: false },
];

const stats = [
  { label: 'Manobras', value: '24', icon: Trophy },
];

interface ProfileScreenProps {
  onNavigateToAchievements?: () => void;
}

export function ProfileScreen({ onNavigateToAchievements }: ProfileScreenProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  if (showNotifications) {
    return <NotificationsScreen onBack={() => setShowNotifications(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <Header 
        title="Perfil" 
        showBackButton={false}
        rightAction={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-[#27272A] rounded-lg transition-colors"
            >
              <Bell size={20} className="text-[#F5F5F5]" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF6B00] rounded-full" />
            </button>
            <button className="p-2 hover:bg-[#27272A] rounded-lg transition-colors">
              <Settings size={20} className="text-[#F5F5F5]" />
            </button>
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <YupCard>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200"
                alt="Perfil"
                className="w-24 h-24 rounded-full object-cover border-4 border-[#FF6B00]"
              />
              <div className="absolute -bottom-1 -right-1 bg-[#FF6B00] text-white w-8 h-8 rounded-full flex items-center justify-center">
                <span>12</span>
              </div>
            </div>
            
            <h2 className="text-[#F5F5F5] mb-1">Carlos Silva</h2>
            <p className="text-[#9CA3AF] text-[14px] mb-2">@carloswake</p>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-[#FF6B00] text-white border-0">Nível 12</Badge>
              <Badge className="bg-[#1A1A1A] text-[#9CA3AF] border border-[#27272A]">Wakeboard</Badge>
            </div>

            <p className="text-[#9CA3AF] text-[14px] mb-4">
              Apaixonado por wakeboard 🏄‍♂️🌊 | São Paulo, SP
            </p>

            {/* Followers */}
            <div className="flex items-center justify-center gap-6 text-[#F5F5F5] mb-6">
              <div className="flex items-center gap-1">
                <TrendingUp size={16} className="text-[#FF6B00]" />
                <span className="text-[14px]">1.2K</span>
                <span className="text-[#9CA3AF] text-[14px]">seguidores</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={16} className="text-[#FF6B00]" />
                <span className="text-[14px]">24</span>
                <span className="text-[#9CA3AF] text-[14px]">manobras</span>
              </div>
            </div>

            {/* Level Progress */}
            <div className="w-full">
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-[#9CA3AF]">Nível 12</span>
                <span className="text-[#FF6B00]">3.450 / 4.000 XP</span>
              </div>
              <Progress value={86} className="h-2 bg-[#27272A]" />
            </div>
          </div>
        </YupCard>

        {/* Achievements */}
        <YupCard onClick={onNavigateToAchievements}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#F5F5F5] flex items-center gap-2">
              <Award size={20} className="text-[#FF6B00]" />
              Achievements
            </h3>
            <span className="text-[#9CA3AF] text-[12px]">3/5</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-2xl
                  ${achievement.unlocked 
                    ? 'bg-gradient-to-br from-[#FF6B00] to-[#FF8533]' 
                    : 'bg-[#27272A] grayscale opacity-40'
                  }
                `}
              >
                {achievement.icon}
              </div>
            ))}
          </div>
        </YupCard>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-[2px]">
          {[
            'https://images.unsplash.com/photo-1632192661889-85748ae575d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1752170053218-5f05ccfbee4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1610665893833-3692e97e1ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1632192661889-85748ae575d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1752170053218-5f05ccfbee4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1610665893833-3692e97e1ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1632192661889-85748ae575d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1752170053218-5f05ccfbee4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1610665893833-3692e97e1ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
          ].map((image, index) => (
            <div key={index} className="aspect-square bg-[#1A1A1A] relative cursor-pointer group">
              <ImageWithFallback
                src={image}
                alt={`Post ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 text-white text-[12px]">
                  <div className="flex items-center gap-1">
                    <Heart size={16} className="fill-white" />
                    <span>1.2k</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={16} />
                    <span>+150</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
