import { ChevronDown, Zap, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../Header';
import { YupCard } from '../YupCard';
import { ButtonPrimary } from '../YupButtons';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

interface Challenge {
  id: number;
  level: 'Iniciante' | 'Intermediário' | 'Pro';
  trick: string;
  description: string;
  xp: number;
  completed: boolean;
}

interface Obstacle {
  id: number;
  name: string;
  icon: string;
  challenges: Challenge[];
}

const obstacles: Obstacle[] = [
  {
    id: 1,
    name: 'Kicker - Go Fly',
    icon: '🚀',
    challenges: [
      { id: 1, level: 'Iniciante', trick: 'Straight Air', description: 'Pule reto por cima do kicker', xp: 100, completed: true },
      { id: 2, level: 'Intermediário', trick: 'Grab Method', description: 'Segure a prancha no ar', xp: 250, completed: true },
      { id: 3, level: 'Pro', trick: 'Backroll', description: 'Giro completo para trás', xp: 500, completed: false },
    ],
  },
  {
    id: 2,
    name: 'Kicker - Ilhas de Atibaia',
    icon: '🏝️',
    challenges: [
      { id: 4, level: 'Iniciante', trick: 'Air Jump', description: 'Salto básico no kicker', xp: 100, completed: true },
      { id: 5, level: 'Intermediário', trick: 'Tantrum', description: 'Giro para trás com impulso', xp: 250, completed: false },
      { id: 6, level: 'Pro', trick: 'HS Frontroll', description: 'Front flip heelside', xp: 500, completed: false },
    ],
  },
  {
    id: 3,
    name: 'Rail - Monkai',
    icon: '🎋',
    challenges: [
      { id: 7, level: 'Iniciante', trick: 'Front Board', description: 'Suba e deslize pelo rail', xp: 100, completed: false },
      { id: 8, level: 'Intermediário', trick: '50-50 Grind', description: 'Deslize com as duas bordas', xp: 250, completed: false },
      { id: 9, level: 'Pro', trick: 'Backside Lipslide', description: 'Entre de costas e deslize', xp: 500, completed: false },
    ],
  },
  {
    id: 4,
    name: 'Inclone - Corona',
    icon: '👑',
    challenges: [
      { id: 10, level: 'Iniciante', trick: 'Up Rail Slide', description: 'Deslize subindo o rail', xp: 100, completed: false },
      { id: 11, level: 'Intermediário', trick: 'Down Rail Press', description: 'Press descendo o rail', xp: 250, completed: false },
      { id: 12, level: 'Pro', trick: 'Switch Up Rail', description: 'Troque de lado no rail', xp: 500, completed: false },
    ],
  },
  {
    id: 5,
    name: 'Slider - 1',
    icon: '🛝',
    challenges: [
      { id: 13, level: 'Iniciante', trick: 'Center Slide', description: 'Deslize pelo centro', xp: 100, completed: false },
      { id: 14, level: 'Intermediário', trick: 'Rail Transfer', description: 'Transfira entre rails', xp: 250, completed: false },
      { id: 15, level: 'Pro', trick: 'Rail Tap 360', description: 'Gire 360 no rail', xp: 500, completed: false },
    ],
  },
  {
    id: 6,
    name: 'Incliner - Ilhas de Atibaia',
    icon: '🏔️',
    challenges: [
      { id: 16, level: 'Iniciante', trick: 'Incline Slide', description: 'Deslize na inclinação', xp: 100, completed: false },
      { id: 17, level: 'Intermediário', trick: 'Press Transfer', description: 'Press e transfira', xp: 250, completed: false },
      { id: 18, level: 'Pro', trick: 'Butter Spin 180', description: 'Gire 180 na inclinação', xp: 500, completed: false },
    ],
  },
  {
    id: 7,
    name: 'Wayframe - 1',
    icon: '⛰️',
    challenges: [
      { id: 19, level: 'Iniciante', trick: 'Ride Up', description: 'Suba a rampa', xp: 100, completed: false },
      { id: 20, level: 'Intermediário', trick: 'Bonk', description: 'Bata na rampa e volte', xp: 250, completed: false },
      { id: 21, level: 'Pro', trick: 'Indy Grab Bonk', description: 'Bonk com grab', xp: 500, completed: false },
    ],
  },
  {
    id: 8,
    name: 'Box - 1',
    icon: '📦',
    challenges: [
      { id: 22, level: 'Iniciante', trick: 'Surface Slide', description: 'Deslize reto pela box', xp: 100, completed: false },
      { id: 23, level: 'Intermediário', trick: 'Boardslide', description: 'Deslize de lado na box', xp: 250, completed: false },
      { id: 24, level: 'Pro', trick: 'Lipslide 270 Out', description: 'Entre de lado e saia girando', xp: 500, completed: false },
    ],
  },
  {
    id: 9,
    name: 'Slider - Decathlon',
    icon: '🏬',
    challenges: [
      { id: 25, level: 'Iniciante', trick: 'Slider Pass', description: 'Passe pelo slider', xp: 100, completed: false },
      { id: 26, level: 'Intermediário', trick: 'Slider Press', description: 'Press no slider', xp: 250, completed: false },
      { id: 27, level: 'Pro', trick: 'Slider Spin Out', description: 'Saia girando do slider', xp: 500, completed: false },
    ],
  },
  {
    id: 10,
    name: 'Rail - Morana',
    icon: '🌳',
    challenges: [
      { id: 28, level: 'Iniciante', trick: 'Rail Ride', description: 'Deslize pelo rail', xp: 100, completed: false },
      { id: 29, level: 'Intermediário', trick: 'Rail Switch', description: 'Troque de posição no rail', xp: 250, completed: false },
      { id: 30, level: 'Pro', trick: 'Rail 360 Out', description: 'Saia com 360 do rail', xp: 500, completed: false },
    ],
  },
  {
    id: 11,
    name: 'Step Up - Grove Urbano',
    icon: '🌴',
    challenges: [
      { id: 31, level: 'Iniciante', trick: 'Step Air', description: 'Pule o step up', xp: 100, completed: false },
      { id: 32, level: 'Intermediário', trick: 'Step Grab', description: 'Grab no step up', xp: 250, completed: false },
      { id: 33, level: 'Pro', trick: 'Step Backroll', description: 'Backroll no step up', xp: 500, completed: false },
    ],
  },
  {
    id: 12,
    name: 'Step Up - Vonpiper',
    icon: '🎯',
    challenges: [
      { id: 34, level: 'Iniciante', trick: 'Jump Over', description: 'Pule por cima', xp: 100, completed: false },
      { id: 35, level: 'Intermediário', trick: 'Method Grab', description: 'Grab method no salto', xp: 250, completed: false },
      { id: 36, level: 'Pro', trick: 'Raley Transfer', description: 'Raley no step up', xp: 500, completed: false },
    ],
  },
  {
    id: 13,
    name: 'Barril - 1',
    icon: '🛢️',
    challenges: [
      { id: 37, level: 'Iniciante', trick: 'Barrel Pass', description: 'Passe pelo barril', xp: 100, completed: false },
      { id: 38, level: 'Intermediário', trick: 'Barrel Bonk', description: 'Bata no barril', xp: 250, completed: false },
      { id: 39, level: 'Pro', trick: 'Barrel Tap 180', description: 'Bata e gire 180', xp: 500, completed: false },
    ],
  },
  {
    id: 14,
    name: 'AirTrick Area',
    icon: '🎪',
    challenges: [
      { id: 40, level: 'Iniciante', trick: 'Big Air', description: 'Salto alto na área', xp: 100, completed: false },
      { id: 41, level: 'Intermediário', trick: 'Grab Combo', description: 'Combinação de grabs', xp: 250, completed: false },
      { id: 42, level: 'Pro', trick: 'Double Flip', description: 'Dois giros aéreos', xp: 500, completed: false },
    ],
  },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Iniciante':
      return 'bg-[#10B981] text-white';
    case 'Intermediário':
      return 'bg-[#F59E0B] text-white';
    case 'Pro':
      return 'bg-[#EF4444] text-white';
    default:
      return 'bg-[#27272A] text-[#9CA3AF]';
  }
};

interface NagaChallengesScreenProps {
  onBack?: () => void;
  onRegisterChallenge?: (park: string, obstacle: string, trick: string) => void;
}

export function NagaChallengesScreen({ onBack, onRegisterChallenge }: NagaChallengesScreenProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const calculateProgress = (challenges: Challenge[]) => {
    const completed = challenges.filter(c => c.completed).length;
    return (completed / challenges.length) * 100;
  };

  const isObstacleCompleted = (challenges: Challenge[]) => {
    return challenges.every(c => c.completed);
  };

  const totalChallenges = obstacles.reduce((sum, o) => sum + o.challenges.length, 0);
  const completedChallenges = obstacles.reduce(
    (sum, o) => sum + o.challenges.filter(c => c.completed).length,
    0
  );
  const totalXP = obstacles.reduce(
    (sum, o) => sum + o.challenges.filter(c => c.completed).reduce((xpSum, c) => xpSum + c.xp, 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Card */}
        <YupCard className="bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8533]/10 border-[#FF6B00]/30">
          <div className="text-center mb-4">
            <h2 className="text-[#F5F5F5] mb-2">Complete as manobras para subir seu Y'LEVEL</h2>
            <p className="text-[#9CA3AF] text-[14px]">
              {completedChallenges} de {totalChallenges} desafios concluídos
            </p>
          </div>
          <Progress
            value={(completedChallenges / totalChallenges) * 100}
            className="h-3 bg-[#27272A]"
          />
        </YupCard>

        {/* Obstacles List */}
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems}>
          {obstacles.map((obstacle) => {
            const progress = calculateProgress(obstacle.challenges);
            const completed = isObstacleCompleted(obstacle.challenges);
            
            return (
              <AccordionItem
                key={obstacle.id}
                value={`obstacle-${obstacle.id}`}
                className="border-0 mb-3"
              >
                <YupCard className={`p-0 overflow-hidden ${completed ? 'border-[#FF6B00]/50' : ''}`}>
                  <AccordionTrigger className="px-4 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="text-2xl">{obstacle.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[#F5F5F5] text-[15px]">{obstacle.name}</h4>
                          {completed && (
                            <Badge className="bg-[#FF6B00] text-white border-0 text-[9px] px-2 py-0">
                              ✓ COMPLETO
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 bg-[#27272A] flex-1" />
                          <span className="text-[#9CA3AF] text-[11px] whitespace-nowrap">
                            {obstacle.challenges.filter(c => c.completed).length}/3
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3 pt-2">
                      {obstacle.challenges.map((challenge) => (
                        <div
                          key={challenge.id}
                          className={`
                            p-3 rounded-xl border transition-all
                            ${challenge.completed 
                              ? 'bg-[#FF6B00]/5 border-[#FF6B00]/30' 
                              : 'bg-[#27272A] border-[#374151]'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${getLevelColor(challenge.level)} border-0 text-[10px] px-2 py-0`}>
                                  {challenge.level}
                                </Badge>
                                <h5 className="text-[#F5F5F5] text-[14px]">{challenge.trick}</h5>
                              </div>
                              <p className="text-[#9CA3AF] text-[12px] mb-2">
                                {challenge.description}
                              </p>
                            </div>
                            <div className="ml-2">
                              {challenge.completed ? (
                                <CheckCircle2 size={20} className="text-[#FF6B00]" />
                              ) : (
                                <Circle size={20} className="text-[#27272A]" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-[#FF6B00] text-[12px]">
                              <Zap size={12} />
                              <span>+{challenge.xp} XP</span>
                            </div>
                            {!challenge.completed && (
                              <button 
                                onClick={() => onRegisterChallenge?.('naga', obstacle.name, challenge.trick)}
                                className="px-3 py-1.5 rounded-lg border border-[#FF6B00] text-[#FF6B00] text-[12px] hover:bg-[#FF6B00]/10 transition-colors"
                              >
                                Registrar manobra
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {completed && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-[#FF6B00]/20 to-[#FF8533]/10 border border-[#FF6B00]/30 rounded-xl text-center">
                        <Trophy size={24} className="text-[#FF6B00] mx-auto mb-2" />
                        <p className="text-[#F5F5F5] text-[13px]">
                          🎉 Completou o obstáculo!
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </YupCard>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Bottom CTA */}
        <div className="sticky bottom-20 z-10">
          <ButtonPrimary fullWidth>
            Ver meu progresso no Y'LEVEL
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
