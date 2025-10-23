import { useState } from 'react';
import { BottomNavYup } from './components/BottomNavYup';
import { FeedScreen } from './components/screens/FeedScreen';
import { DiscoverScreen } from './components/screens/DiscoverScreen';
import { MapScreen } from './components/screens/MapScreen';
import { UploadScreen } from './components/screens/UploadScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { AchievementsScreen } from './components/screens/AchievementsScreen';
import { NagaChallengesScreen } from './components/screens/NagaChallengesScreen';

interface ChallengeData {
  park: string;
  obstacle: string;
  trick: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'upload' | 'map' | 'profile' | 'achievements' | 'naga-challenges'>('feed');
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);

  const handleRegisterChallenge = (park: string, obstacle: string, trick: string) => {
    setChallengeData({ park, obstacle, trick });
    setActiveTab('upload');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'feed':
        return <FeedScreen />;
      case 'discover':
        return <DiscoverScreen onNavigateToNagaChallenges={() => setActiveTab('naga-challenges')} />;
      case 'upload':
        return <UploadScreen challengeData={challengeData} onClearChallenge={() => setChallengeData(null)} />;
      case 'map':
        return <MapScreen />;
      case 'profile':
        return <ProfileScreen onNavigateToAchievements={() => setActiveTab('achievements')} />;
      case 'achievements':
        return <AchievementsScreen onBack={() => setActiveTab('profile')} />;
      case 'naga-challenges':
        return <NagaChallengesScreen onBack={() => setActiveTab('discover')} onRegisterChallenge={handleRegisterChallenge} />;
      default:
        return <FeedScreen />;
    }
  };

  const getActiveTab = () => {
    if (activeTab === 'achievements') return 'profile';
    if (activeTab === 'naga-challenges') return 'discover';
    return activeTab;
  };

  return (
    <div className="relative min-h-screen bg-[#0D0D0D] overflow-x-hidden">
      {renderScreen()}
      <BottomNavYup activeTab={getActiveTab()} onTabChange={setActiveTab} />
    </div>
  );
}
