import { Upload, Video, Tag, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { YupCard } from '../YupCard';
import { ButtonPrimary, ButtonGhost } from '../YupButtons';
import { YupInput } from '../YupInput';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const tricks = ['Tantrum', 'Backroll', 'Raley', 'S-Bend', 'KGB', 'HS Frontroll', 'Toeside', 'Heelside'];

const parks = [
  { id: 'naga', name: 'Naga Cable Park', location: 'Jaguariúna, SP' },
  { id: 'marapendi', name: 'Lagoa de Marapendi', location: 'Rio de Janeiro, RJ' },
  { id: 'guarapiranga', name: 'Represa Guarapiranga', location: 'São Paulo, SP' },
];

const obstaclesByPark: Record<string, string[]> = {
  naga: [
    'Kicker - Go Fly',
    'Kicker - Ilhas de Atibaia',
    'Rail - Monkai',
    'Inclone - Corona',
    'Slider - 1',
    'Incliner - Ilhas de Atibaia',
    'Wayframe - 1',
    'Box - 1',
    'Slider - Decathlon',
    'Rail - Morana',
    'Step Up - Grove Urbano',
    'Step Up - Vonpiper',
    'Barril - 1',
    'AirTrick Area',
  ],
  marapendi: [
    'Rampa Principal',
    'Box Central',
    'Rail Lateral',
  ],
  guarapiranga: [
    'Kicker Norte',
    'Box Sul',
    'Rail Central',
  ],
};

interface ChallengeData {
  park: string;
  obstacle: string;
  trick: string;
}

interface UploadScreenProps {
  challengeData?: ChallengeData | null;
  onClearChallenge?: () => void;
}

export function UploadScreen({ challengeData, onClearChallenge }: UploadScreenProps) {
  const [selectedTrick, setSelectedTrick] = useState<string>('');
  const [selectedPark, setSelectedPark] = useState<string>('');
  const [selectedObstacle, setSelectedObstacle] = useState<string>('');
  const [description, setDescription] = useState('');

  // Preencher automaticamente com dados do desafio
  useEffect(() => {
    if (challengeData) {
      setSelectedPark(challengeData.park);
      setSelectedObstacle(challengeData.obstacle);
      setSelectedTrick(challengeData.trick);
    }
  }, [challengeData]);

  const availableObstacles = selectedPark ? obstaclesByPark[selectedPark] || [] : [];

  const clearChallengeData = () => {
    setSelectedPark('');
    setSelectedObstacle('');
    setSelectedTrick('');
    onClearChallenge?.();
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <Header 
        title="Novo Vídeo" 
        showBackButton={true}
        onBack={() => {}}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Challenge Banner */}
        {challengeData && (
          <YupCard className="bg-gradient-to-r from-[#FF6B00]/20 to-[#FF8533]/10 border-[#FF6B00]/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-[#FF6B00] text-white border-0 text-[10px] px-2 py-0">
                    DESAFIO NAGA
                  </Badge>
                </div>
                <h4 className="text-[#F5F5F5] text-[14px] mb-1">{challengeData.trick}</h4>
                <p className="text-[#9CA3AF] text-[12px]">
                  {challengeData.obstacle}
                </p>
              </div>
              <button 
                onClick={clearChallengeData}
                className="text-[#9CA3AF] hover:text-[#FF6B00] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </YupCard>
        )}

        {/* Upload Area */}
        <YupCard>
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#27272A] rounded-xl hover:border-[#FF6B00] transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-[#FF6B00] rounded-full flex items-center justify-center mb-4">
              <Video size={32} className="text-white" />
            </div>
            <h3 className="text-[#F5F5F5] mb-2">Escolher Vídeo</h3>
            <p className="text-[#9CA3AF] text-[14px] text-center">
              Clique para selecionar ou arraste um arquivo
            </p>
            <p className="text-[#9CA3AF] text-[12px] mt-2">
              MP4, MOV ou AVI • Máx. 500MB
            </p>
          </div>
        </YupCard>

        {/* Video Details */}
        <YupCard>
          <h3 className="text-[#F5F5F5] mb-4 flex items-center gap-2">
            <Tag size={20} className="text-[#FF6B00]" />
            Detalhes do Vídeo
          </h3>

          <div className="space-y-4">
            <YupInput
              label="Título"
              placeholder="Ex: Meu primeiro Tantrum!"
            />

            <div>
              <label className="text-[14px] text-[#F5F5F5] mb-2 block">
                Descrição
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte mais sobre esse momento..."
                className="min-h-[100px] bg-[#1A1A1A] border-[#374151] text-[#F5F5F5] placeholder:text-[#9CA3AF] focus:border-[#FF6B00] focus:ring-[#FF6B00]/20"
              />
            </div>

            <div>
              <label className="text-[14px] text-[#F5F5F5] mb-3 block">
                Manobra Principal
              </label>
              <div className="flex flex-wrap gap-2">
                {tricks.map((trick) => (
                  <button
                    key={trick}
                    onClick={() => setSelectedTrick(trick)}
                    className={`
                      px-4 py-2 rounded-full text-[14px] transition-all
                      ${selectedTrick === trick 
                        ? 'bg-[#FF6B00] text-white' 
                        : 'bg-[#27272A] text-[#9CA3AF] hover:bg-[#374151]'
                      }
                    `}
                  >
                    {trick}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[14px] text-[#F5F5F5] mb-2 block">
                Parque
              </label>
              <Select value={selectedPark} onValueChange={(value) => {
                setSelectedPark(value);
                setSelectedObstacle(''); // Reset obstacle when park changes
              }}>
                <SelectTrigger className="w-full bg-[#1A1A1A] border-[#374151] text-[#F5F5F5] focus:border-[#FF6B00] focus:ring-[#FF6B00]/20">
                  <SelectValue placeholder="Selecione o parque" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#374151]">
                  {parks.map((park) => (
                    <SelectItem 
                      key={park.id} 
                      value={park.id}
                      className="text-[#F5F5F5] focus:bg-[#27272A] focus:text-[#F5F5F5]"
                    >
                      {park.name}
                      <span className="text-[#9CA3AF] text-[12px] ml-2">
                        {park.location}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[14px] text-[#F5F5F5] mb-2 block">
                Obstáculo
              </label>
              <Select 
                value={selectedObstacle} 
                onValueChange={setSelectedObstacle}
                disabled={!selectedPark}
              >
                <SelectTrigger className={`w-full bg-[#1A1A1A] border-[#374151] text-[#F5F5F5] focus:border-[#FF6B00] focus:ring-[#FF6B00]/20 ${!selectedPark ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder={selectedPark ? "Selecione o obstáculo" : "Primeiro selecione um parque"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#374151] max-h-[300px]">
                  {availableObstacles.map((obstacle) => (
                    <SelectItem 
                      key={obstacle} 
                      value={obstacle}
                      className="text-[#F5F5F5] focus:bg-[#27272A] focus:text-[#F5F5F5]"
                    >
                      {obstacle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedPark && (
                <p className="text-[#9CA3AF] text-[12px] mt-1">
                  Selecione um parque primeiro
                </p>
              )}
            </div>
          </div>
        </YupCard>

        {/* XP Info */}
        <YupCard className="bg-gradient-to-r from-[#FF6B00]/20 to-[#FF8533]/20 border-[#FF6B00]/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center flex-shrink-0">
              <Upload size={20} className="text-white" />
            </div>
            <div>
              <h4 className="text-[#F5F5F5] mb-1">Ganhe XP ao publicar!</h4>
              <p className="text-[#9CA3AF] text-[14px]">
                Vídeos originais ganham +150 XP. Adicione localização e tags para ganhar bônus.
              </p>
            </div>
          </div>
        </YupCard>

        {/* Actions */}
        <div className="flex gap-3">
          <ButtonGhost fullWidth>
            Salvar Rascunho
          </ButtonGhost>
          <ButtonPrimary fullWidth>
            Publicar Vídeo
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
