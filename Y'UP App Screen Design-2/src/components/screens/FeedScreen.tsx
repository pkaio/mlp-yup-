import { Heart, MessageCircle, Share2, TrendingUp, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const feedPosts = [
  {
    id: 1,
    user: 'Carlos Silva',
    username: '@carloswake',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    image: 'https://images.unsplash.com/photo-1632192661889-85748ae575d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWtlYm9hcmQlMjB3YXRlciUyMHNwb3J0fGVufDF8fHx8MTc2MDcxMDA4NXww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Primeiro Tantrum do dia! 🏄‍♂️🌊',
    hashtags: '#wakeboard #tantrum #nagacablepark',
    location: 'Naga Cable Park, Jaguariúna',
    likes: 12300,
    comments: 450,
    xp: 150,
    sport: 'Wakeboard',
  },
  {
    id: 2,
    user: 'Ana Santos',
    username: '@anawake',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    image: 'https://images.unsplash.com/photo-1610665893833-3692e97e1ee8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWtlYm9hcmQlMjB0cmlja3N8ZW58MXx8fHwxNzYwNzEwMDg1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Backroll ficou perfeito! ⚡',
    hashtags: '#wakeboard #backroll #nagacablepark',
    location: 'Naga Cable Park, Jaguariúna',
    likes: 8900,
    comments: 234,
    xp: 300,
    sport: 'Wakeboard',
  },
  {
    id: 3,
    user: 'Pedro Lima',
    username: '@pedrowake',
    avatar: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=150',
    image: 'https://images.unsplash.com/photo-1752170053218-5f05ccfbee4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWtlYm9hcmQlMjBjYWJsZSUyMHBhcmt8ZW58MXx8fHwxNzYwNzEwMDg1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Sessão no cabo estava insana! 🔥',
    hashtags: '#wakeboard #cablepark #naga',
    location: 'Naga Cable Park, Jaguariúna',
    likes: 15600,
    comments: 567,
    xp: 180,
    sport: 'Wakeboard',
  },
];

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

export function FeedScreen() {
  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[#0D0D0D]">
      {feedPosts.map((post) => (
        <div
          key={post.id}
          className="relative h-screen w-full snap-start snap-always flex items-center justify-center"
        >
          {/* Video/Image Background */}
          <div className="absolute inset-0">
            <ImageWithFallback
              src={post.image}
              alt={post.description}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </div>

          {/* Right Side Actions */}
          <div className="absolute right-3 bottom-24 flex flex-col gap-4 z-10">
            {/* Like Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center border border-[#27272A]">
                <Heart size={20} className="text-[#FF6B00]" />
              </div>
              <span className="text-white text-[10px] drop-shadow-lg">
                {formatNumber(post.likes)}
              </span>
            </motion.button>

            {/* Comment Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center border border-[#27272A]">
                <MessageCircle size={20} className="text-white" />
              </div>
              <span className="text-white text-[10px] drop-shadow-lg">
                {formatNumber(post.comments)}
              </span>
            </motion.button>

            {/* Share Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center border border-[#27272A]">
                <Share2 size={20} className="text-white" />
              </div>
            </motion.button>
          </div>

          {/* Bottom User Info */}
          <div className="absolute bottom-[72px] left-3 right-16 z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative">
                <ImageWithFallback
                  src={post.avatar}
                  alt={post.user}
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#FF6B00]"
                  style={{ boxShadow: '0 2px 8px rgba(255, 107, 0, 0.3)' }}
                />
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-full text-[9px] flex items-center gap-0.5 whitespace-nowrap"
                  style={{ boxShadow: '0 2px 6px rgba(255, 107, 0, 0.4)' }}
                >
                  <TrendingUp size={9} />
                  +{post.xp}
                </div>
              </div>
              <div>
                <h3 className="text-white text-[14px] drop-shadow-lg">
                  {post.username}
                </h3>
                <p className="text-white/80 text-[11px] drop-shadow-lg">
                  {post.sport}
                </p>
              </div>
            </div>

            <p className="text-white text-[13px] drop-shadow-lg mb-2">
              {post.description}
            </p>
            
            <p className="text-white/70 text-[12px] drop-shadow-lg mb-2">
              {post.hashtags}
            </p>

            <div className="inline-flex items-center gap-1 bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#27272A] px-2 py-1 rounded-lg">
              <MapPin size={10} className="text-[#FF6B00]" />
              <span className="text-white/90 text-[10px]">
                {post.location}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
