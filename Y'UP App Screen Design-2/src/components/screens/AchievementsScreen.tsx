import { Trophy, Award, Star, Zap, Target, Crown, Flame, Lock } from 'lucide-react';
import { Header } from '../Header';
import { YupCard } from '../YupCard';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

const achievements = [
  {
    id: 1,
    icon: '🏆',
    name: 'Primeira Conquista',
    description: 'Poste seu primeiro vídeo',
    unlocked: true,
    unlockedAt: '15 dias atrás',
    xp: 100,
    rarity: 'comum',
  },
  {
    id: 2,
    icon: '🌊',
    name: 'Domador de Ondas',
    description: 'Complete 10 sessões no Naga Cable Park',
    unlocked: true,
    unlockedAt: '10 dias atrás',
    xp: 250,
    rarity: 'raro',
    progress: 10,
    total: 10,
  },
  {
    id: 3,
    icon: '🔥',
    name: 'Em Chamas',
    description: 'Receba 1000 curtidas em um único vídeo',
    unlocked: true,
    unlockedAt: '5 dias atrás',
    xp: 500,
    rarity: 'épico',
  },
  {
    id: 4,
    icon: '⚡',
    name: 'Raio Veloz',
    description: 'Acerte 3 Tantrums seguidos',
    unlocked: false,
    xp: 300,
    rarity: 'raro',
    progress: 2,
    total: 3,
  },
  {
    id: 5,
    icon: '👑',
    name: 'Rei do Cable',
    description: 'Complete 50 sessões no Naga Cable Park',
    unlocked: false,
    xp: 1000,
    rarity: 'lendário',
    progress: 24,
    total: 50,
  },
  {
    id: 6,
    icon: '🎯',
    name: 'Precisão Total',
    description: 'Acerte 5 Backrolls perfeitos',
    unlocked: false,
    xp: 400,
    rarity: 'épico',
    progress: 1,
    total: 5,
  },
  {
    id: 7,
    icon: '💎',
    name: 'Colecionador',
    description: 'Desbloqueie 10 achievements',
    unlocked: false,
    xp: 750,
    rarity: 'épico',
    progress: 3,
    total: 10,
  },
  {
    id: 8,
    icon: '🌟',
    name: 'Estrela em Ascensão',
    description: 'Alcance 1000 seguidores',
    unlocked: false,
    xp: 600,
    rarity: 'raro',
    progress: 520,
    total: 1000,
  },
  {
    id: 9,
    icon: '🚀',
    name: 'Lenda Viva',
    description: 'Alcance o nível 50',
    unlocked: false,
    xp: 2500,
    rarity: 'lendário',
    progress: 12,
    total: 50,
  },
];

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'comum':
      return 'bg-[#9CA3AF] text-white';
    case 'raro':
      return 'bg-[#3B82F6] text-white';
    case 'épico':
      return 'bg-[#A855F7] text-white';
    case 'lendário':
      return 'bg-[#FF6B00] text-white';
    default:
      return 'bg-[#27272A] text-[#9CA3AF]';
  }
};

interface AchievementsScreenProps {
  onBack?: () => void;
}

export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalXP = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <Header
        title="Achievements"
        showBackButton={true}
        onBack={onBack}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Card */}
        <YupCard className="bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8533]/10 border-[#FF6B00]/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#F5F5F5] mb-1">Progresso Total</h3>
              <p className="text-[#9CA3AF] text-[14px]">
                {unlockedCount} de {achievements.length} desbloqueados
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-1">
                <Trophy size={16} className="text-[#FF6B00]" />
                <span className="text-[#F5F5F5]">{totalXP} XP</span>
              </div>
              <p className="text-[#9CA3AF] text-[12px]">XP total ganho</p>
            </div>
          </div>
          <Progress
            value={(unlockedCount / achievements.length) * 100}
            className="h-2 bg-[#27272A]"
          />
        </YupCard>

        {/* Unlocked Achievements */}
        {unlockedCount > 0 && (
          <div>
            <h3 className="text-[#F5F5F5] mb-4 px-1 flex items-center gap-2">
              <Star size={18} className="text-[#FF6B00]" />
              Desbloqueados ({unlockedCount})
            </h3>
            <div className="space-y-3">
              {achievements
                .filter((achievement) => achievement.unlocked)
                .map((achievement) => (
                  <YupCard
                    key={achievement.id}
                    className="border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00]/5 to-transparent"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl">
                        {achievement.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-[#F5F5F5] text-[15px]">
                            {achievement.name}
                          </h4>
                          <Badge className={`${getRarityColor(achievement.rarity)} border-0 text-[10px] px-2 py-0 ml-2`}>
                            {achievement.rarity.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-[#9CA3AF] text-[13px] mb-2">
                          {achievement.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[#FF6B00] text-[12px]">
                            <Zap size={12} />
                            <span>+{achievement.xp} XP</span>
                          </div>
                          <span className="text-[#9CA3AF] text-[11px]">
                            {achievement.unlockedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  </YupCard>
                ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {achievements.filter((a) => !a.unlocked).length > 0 && (
          <div>
            <h3 className="text-[#F5F5F5] mb-4 px-1 flex items-center gap-2">
              <Lock size={18} className="text-[#9CA3AF]" />
              Bloqueados ({achievements.filter((a) => !a.unlocked).length})
            </h3>
            <div className="space-y-3">
              {achievements
                .filter((achievement) => !achievement.unlocked)
                .map((achievement) => (
                  <YupCard key={achievement.id}>
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-[#27272A] rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl grayscale opacity-40">
                        {achievement.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-[#F5F5F5] text-[15px]">
                            {achievement.name}
                          </h4>
                          <Badge className={`${getRarityColor(achievement.rarity)} border-0 text-[10px] px-2 py-0 ml-2`}>
                            {achievement.rarity.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-[#9CA3AF] text-[13px] mb-3">
                          {achievement.description}
                        </p>

                        {achievement.progress !== undefined && achievement.total && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[#9CA3AF] text-[11px]">
                                Progresso: {achievement.progress}/{achievement.total}
                              </span>
                              <span className="text-[#9CA3AF] text-[11px]">
                                {Math.round((achievement.progress / achievement.total) * 100)}%
                              </span>
                            </div>
                            <Progress
                              value={(achievement.progress / achievement.total) * 100}
                              className="h-1.5 bg-[#27272A]"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-[#9CA3AF] text-[12px]">
                          <Zap size={12} />
                          <span>+{achievement.xp} XP</span>
                        </div>
                      </div>
                    </div>
                  </YupCard>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
