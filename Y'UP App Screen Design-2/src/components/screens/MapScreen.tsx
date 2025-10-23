import {
  MapPin,
  Navigation,
  Star,
  SlidersHorizontal,
  List,
  Search,
  Plus,
  Minus,
} from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { YupCard } from '../YupCard';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const spots = [
  {
    id: 1,
    name: 'Naga Cable Park',
    type: 'Cable Park',
    distance: '1.2 km',
    rating: 4.9,
    reviews: 342,
    image: 'https://images.unsplash.com/photo-1752170053218-5f05ccfbee4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: -22.703,
    lng: -46.984,
    featured: true,
    description:
      'O principal cable park do interior paulista, com estrutura completa e sessões o dia todo.',
    activeRiders: 24,
    obstacles: ['Kicker', 'Box', 'Transfer'],
    weather: '27ºC · Ensolarado',
    mapPosition: { top: '38%', left: '52%' },
    highlights: [
      {
        id: 'naga-1',
        title: 'Sunset Riders',
        image:
          'https://images.unsplash.com/photo-1615081146837-3e25f7f32f49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
      {
        id: 'naga-2',
        title: 'Rail Session',
        image:
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
      {
        id: 'naga-3',
        title: 'Coaching Day',
        image:
          'https://images.unsplash.com/photo-1505850505430-8344cb5c2d89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
    ],
  },
  {
    id: 2,
    name: 'Lagoa de Marapendi',
    type: 'Boat Ride',
    distance: '3.7 km',
    rating: 4.6,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1632192661889-85748ae575d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: -23.590,
    lng: -46.650,
    description:
      'Passeio de lancha na zona oeste carioca com água tranquila e vista para a reserva.',
    activeRiders: 11,
    obstacles: ['Dock Start', 'Surf Wave'],
    weather: '29ºC · Céu aberto',
    mapPosition: { top: '28%', left: '28%' },
    highlights: [
      {
        id: 'marapendi-1',
        title: 'Flat Water Run',
        image:
          'https://images.unsplash.com/photo-1524738258070-1d2a82cc1880?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
      {
        id: 'marapendi-2',
        title: 'Golden Hour',
        image:
          'https://images.unsplash.com/photo-1469429978400-082eec725ad5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
    ],
  },
  {
    id: 3,
    name: 'Represa Guarapiranga',
    type: 'Boat Ride',
    distance: '5.1 km',
    rating: 4.7,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1610665893833-3692e97e1ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    lat: -23.583,
    lng: -46.663,
    description:
      'Represa tradicional da comunidade paulistana com crew ativa de wake e wakesurf.',
    activeRiders: 17,
    obstacles: ['Surf Wave', 'Slider'],
    weather: '26ºC · Parcialmente nublado',
    mapPosition: { top: '58%', left: '72%' },
    highlights: [
      {
        id: 'guarapiranga-1',
        title: 'Morning Glide',
        image:
          'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
      {
        id: 'guarapiranga-2',
        title: 'Wake Surf Crew',
        image:
          'https://images.unsplash.com/photo-1523413183764-43f0de435e6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      },
    ],
  },
];

export function MapScreen() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState(spots[0].id);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? spots[0],
    [selectedSpotId],
  );

  const handleMapInteraction = () => {
    setDrawerOpen(false);
    setDrawerExpanded(false);
  };

  const toggleDrawer = () => {
    if (!drawerOpen) {
      setDrawerOpen(true);
      setDrawerExpanded(false);
    } else if (!drawerExpanded) {
      setDrawerExpanded(true);
    } else {
      setDrawerExpanded(false);
    }
  };

  const handleSelectSpot = (spotId: number) => {
    setSelectedSpotId(spotId);
    setDrawerOpen(true);
    setDrawerExpanded(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel((current) => {
      const delta = direction === 'in' ? 0.15 : -0.15;
      return Math.min(1.6, Math.max(0.85, Number((current + delta).toFixed(2))));
    });
  };

  const displayedSpots = useMemo(() => {
    if (!searchTerm.trim()) {
      return spots;
    }

    const term = searchTerm.toLowerCase();
    return spots.filter(
      (spot) =>
        spot.name.toLowerCase().includes(term) ||
        spot.type.toLowerCase().includes(term),
    );
  }, [searchTerm]);

  useEffect(() => {
    if (
      displayedSpots.length > 0 &&
      !displayedSpots.some((spot) => spot.id === selectedSpotId)
    ) {
      setSelectedSpotId(displayedSpots[0].id);
    }
  }, [displayedSpots, selectedSpotId]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0D0D0D] text-white">
      {/* Map Layer */}
      <div
        ref={mapRef}
        className="absolute inset-0"
        onTouchStart={handleMapInteraction}
        onMouseDown={handleMapInteraction}
      >
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0 transition-transform duration-500 ease-out"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB_PMHCaAadyYXzTVwdWWXMNB7KfQEu40COX9hTYIQjTJL0UT868Nk2Vsqupcfs9NT9Ox1A1c6FA3GHrzvlPs7qWQJbz0s1nYuvMVXsmLBLYUebq4Er6MWMA9Pj8icya4Dup1ybFBbN2uXKsp7SSTaogpUX9UR7HMYUGk7n-xX1f_nYGXBsqu-fuX0JgAV1WMbfd_dI7hpwtOFjdbYqzh_32DyZHrLtpSrStN90dpK3pPfCJH7ImjL-CkpNW-iho-1AbTyfagi0XeWP')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center',
              filter: 'saturate(1.1) contrast(1.05)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />
        </div>

        <div className="relative z-10 flex h-full flex-col">
          {/* Header */}
          <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-6 pb-3">
            <button
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-[#F5F5F5] backdrop-blur-md transition-all hover:bg-black/60"
              onClick={(event) => event.stopPropagation()}
            >
              <SlidersHorizontal size={20} />
            </button>
            <h1 className="pointer-events-none text-[17px] font-semibold tracking-wide text-white">
              Mapa
            </h1>
            <button
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-[#F5F5F5] backdrop-blur-md transition-all hover:bg-black/60"
              onClick={(event) => {
                event.stopPropagation();
                setDrawerExpanded(true);
                setDrawerOpen(true);
              }}
            >
              <List size={20} />
            </button>
          </header>

          {/* Map content */}
          <div className="relative flex h-full flex-col">
            {/* Search + controls */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-4 pb-36 pt-28">
              <div className="pointer-events-auto relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  type="text"
                  placeholder="Buscar spots ou categorias"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/60 backdrop-blur-lg transition-all focus:border-[#FF6B00]/60 focus:outline-none"
                />
              </div>
              <div className="pointer-events-auto flex flex-col items-end gap-3">
                <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 backdrop-blur-lg">
                  <button
                    className="flex h-10 w-12 items-center justify-center text-white/80 transition hover:bg-white/10"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleZoom('in');
                    }}
                  >
                    <Plus size={16} />
                  </button>
                  <div className="h-px bg-white/10" />
                  <button
                    className="flex h-10 w-12 items-center justify-center text-white/80 transition hover:bg-white/10"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleZoom('out');
                    }}
                  >
                    <Minus size={16} />
                  </button>
                </div>

                <button
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#FF6B00] text-white shadow-lg transition hover:bg-[#FF8533]"
                  onClick={(event) => {
                    event.stopPropagation();
                    setZoomLevel(1);
                  }}
                >
                  <Navigation size={20} />
                </button>
              </div>
            </div>

            {/* Spot markers */}
            <div className="pointer-events-none absolute inset-0">
              {displayedSpots.map((spot, index) => {
                const isSelected = spot.id === selectedSpot.id;
                return (
                  <motion.button
                    key={spot.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{
                      top: spot.mapPosition?.top ?? '50%',
                      left: spot.mapPosition?.left ?? '50%',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectSpot(spot.id);
                    }}
                  >
                    <div className="pointer-events-auto relative flex flex-col items-center gap-1">
                      <div
                        className={[
                          'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
                          isSelected
                            ? 'border-white bg-[#FF6B00] shadow-xl shadow-[#FF6B00]/40'
                            : 'border-white/20 bg-black/50 backdrop-blur-md group-hover:border-[#FF6B00]/50 group-hover:bg-[#FF6B00]/30',
                        ].join(' ')}
                      >
                        <MapPin
                          size={22}
                          className={isSelected ? 'text-white' : 'text-white/80'}
                        />
                      </div>
                      <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white/80">
                        {spot.distance}
                      </span>
                      {isSelected && (
                        <motion.span
                          layoutId="spot-indicator"
                          className="absolute -bottom-8 h-2 w-2 rounded-full bg-[#FF6B00]/40 blur-[2px]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spots Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="absolute inset-0 z-20 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{
                y: drawerExpanded ? '5%' : 'calc(100% - 320px)',
              }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-30"
              style={{ height: '95%' }}
            >
              <div className="flex h-full flex-col rounded-t-3xl border-t border-white/10 bg-[#050505]/90 backdrop-blur-[28px]">
                <div
                  className="flex cursor-pointer justify-center pb-2 pt-3"
                  onClick={toggleDrawer}
                >
                  <div className="h-1.5 w-12 rounded-full bg-white/15" />
                </div>

                <div className="relative flex-1 overflow-hidden">
                  {drawerExpanded ? (
                    <div className="flex h-full flex-col overflow-y-auto px-5 pb-10">
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-[16px] font-semibold text-white">
                          Spots próximos de você
                        </h3>
                        <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                          {displayedSpots.length} encontrados
                        </span>
                      </div>

                      {displayedSpots.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
                          <MapPin
                            size={28}
                            className="mb-3 text-white/30"
                          />
                          <p className="text-sm text-white/60">
                            Nenhum spot encontrado para "{searchTerm}".
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            Experimente ajustar o termo de busca ou ampliar o
                            mapa.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {displayedSpots.map((spot) => {
                            const isActive = spot.id === selectedSpot.id;
                            return (
                              <YupCard
                                key={spot.id}
                                onClick={() => {
                                  handleSelectSpot(spot.id);
                                  setDrawerExpanded(false);
                                }}
                                className={[
                                  'flex gap-4 transition-all hover:border-[#FF6B00]/50',
                                  isActive
                                    ? 'border-[#FF6B00] bg-[#FF6B00]/5 shadow-lg shadow-[#FF6B00]/10'
                                    : 'border-white/10 bg-white/[0.02]',
                                ].join(' ')}
                              >
                                <div className="h-20 w-20 overflow-hidden rounded-2xl">
                                  <ImageWithFallback
                                    src={spot.image}
                                    alt={spot.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-1 flex-col justify-between">
                                  <div>
                                    <div className="mb-1 flex items-center gap-2">
                                      <h4 className="text-[15px] text-white">
                                        {spot.name}
                                      </h4>
                                      {spot.featured && (
                                        <Badge className="bg-[#FF6B00] text-[10px] text-white">
                                          DESTAQUE
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                                      <span className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5">
                                        {spot.type}
                                      </span>
                                      <span>{spot.distance}</span>
                                      <span>{spot.weather}</span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                                    <Star
                                      size={14}
                                      className="text-[#FF6B00] fill-[#FF6B00]"
                                    />
                                    <span>{spot.rating}</span>
                                    <span className="text-xs text-white/40">
                                      ({spot.reviews})
                                    </span>
                                  </div>
                                </div>
                              </YupCard>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col overflow-y-auto px-5 pb-10">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          {selectedSpot.featured && (
                            <Badge className="mb-3 bg-[#FF6B00] text-[10px] font-semibold text-white">
                              SPOT OFICIAL
                            </Badge>
                          )}
                          <h3 className="text-[20px] font-semibold text-white">
                            {selectedSpot.name}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            {selectedSpot.description}
                          </p>
                        </div>
                        <button
                          className="mt-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:border-white/25 hover:text-white"
                          onClick={() => setDrawerExpanded(true)}
                        >
                          Lista
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm text-white">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2">
                            <Star
                              size={16}
                              className="text-[#FF6B00] fill-[#FF6B00]"
                            />
                            <span className="font-semibold">
                              {selectedSpot.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/50">
                            {selectedSpot.reviews} avaliações
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2">
                            <Navigation size={16} className="text-[#FF6B00]" />
                            <span className="font-semibold">
                              {selectedSpot.distance}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/50">
                            {selectedSpot.weather}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-[#FF6B00]" />
                            <span className="font-semibold">
                              {selectedSpot.activeRiders} riders
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/50">
                            Online agora
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedSpot.obstacles?.map((obstacle) => (
                          <span
                            key={obstacle}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                          >
                            {obstacle}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Clipes recentes
                          </h4>
                          <button className="text-xs text-white/50 underline underline-offset-4 transition hover:text-white/80">
                            Ver mais
                          </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {selectedSpot.highlights?.map((highlight) => (
                            <div
                              key={highlight.id}
                              className="w-44 shrink-0 cursor-pointer transition hover:scale-[1.02]"
                            >
                              <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                                <ImageWithFallback
                                  src={highlight.image}
                                  alt={highlight.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p className="mt-2 text-xs font-medium text-white/80">
                                {highlight.title}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] py-3 text-sm font-semibold text-white transition hover:bg-[#FF8533]">
                          <MapPin size={16} />
                          Check-in
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10">
                          <Navigation size={16} />
                          Traçar rota
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Button to Show Drawer (when hidden) */}
      <AnimatePresence>
        {!drawerOpen && (
          <motion.button
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            onClick={() => setDrawerOpen(true)}
            className="absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B00]/30 transition hover:bg-[#FF8533]"
          >
            <MapPin size={18} />
            Ver {displayedSpots.length} spots
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
