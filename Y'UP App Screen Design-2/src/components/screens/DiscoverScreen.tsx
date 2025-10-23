import { Search, MapPin, Users } from 'lucide-react';
import { Header } from '../Header';
import { YupCard } from '../YupCard';
import { YupInput } from '../YupInput';
import { Badge } from '../ui/badge';

const nearbySpots = [
  {
    id: 1,
    name: 'Naga Cable Park',
    location: 'Jaguariúna, SP',
    image: 'https://images.unsplash.com/photo-1752170053218-5f05ccfbee4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    distance: '1.2 km',
    activeUsers: 24,
    featured: true,
  },
  {
    id: 2,
    name: 'Lagoa de Marapendi',
    location: 'Rio de Janeiro, RJ',
    image: 'https://images.unsplash.com/photo-1632192661889-85748ae575d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    distance: '3.7 km',
    activeUsers: 8,
  },
];

interface DiscoverScreenProps {
  onNavigateToNagaChallenges?: () => void;
}

export function DiscoverScreen({ onNavigateToNagaChallenges }: DiscoverScreenProps) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <Header 
        title="Descobrir" 
        showBackButton={false}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
          <YupInput
            placeholder="Buscar spots, eventos, riders..."
            className="pl-11"
          />
        </div>

        {/* Naga Season Pass CTA */}
        <YupCard 
          onClick={onNavigateToNagaChallenges}
          className="bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8533]/10 border-[#FF6B00]/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              🏆
            </div>
            <div className="flex-1">
              <h3 className="text-[#F5F5F5] mb-1 text-[16px]">Naga Season Pass</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#FF6B00] text-white border-0 text-[10px] px-2 py-0.5">
                  SEASON PASS
                </Badge>
                <span className="text-[#FF6B00] text-[11px]">2/42 completos</span>
              </div>
            </div>
          </div>
        </YupCard>

        {/* Nearby Active Spots */}
        <YupCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#F5F5F5] flex items-center gap-2">
              <MapPin size={18} className="text-[#FF6B00]" />
              Spots Ativos Próximos
            </h3>
          </div>

          <div className="space-y-3">
            {nearbySpots.map((spot) => (
              <div
                key={spot.id}
                className="relative rounded-xl overflow-hidden cursor-pointer"
              >
                <div className="h-32 bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8533]/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                {spot.featured && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-[#FF6B00] text-white border-0 text-[9px] px-2 py-0.5">
                      DESTAQUE
                    </Badge>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white text-[14px] mb-0.5">{spot.name}</h4>
                  <p className="text-white/60 text-[11px] mb-1.5">{spot.location}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white/80 text-[12px]">{spot.distance}</p>
                    <div className="flex items-center gap-1 text-[#FF6B00] text-[12px]">
                      <Users size={14} />
                      <span>{spot.activeUsers} online</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </YupCard>
      </div>
    </div>
  );
}
