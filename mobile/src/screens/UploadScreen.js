import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { Video } from 'expo-av';
import { colors, radii, spacing, typography } from '../theme/tokens';
import YupBadge from '../components/ui/YupBadge';
import YupButton from '../components/ui/YupButton';
import YupCard from '../components/ui/YupCard';
import YupSectionHeader from '../components/ui/YupSectionHeader';
import YupInput from '../components/ui/YupInput';
import { parkService } from '../services/parkService';
import uploadService from '../services/uploadService';
import { videoService } from '../services/videoService';
import { ensureManeuverPayload } from '../utils/maneuver';
import api from '../services/api';

const Icon = MaterialIcons;

const previewPlaceholder = require('../../assets/splash.png');

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Público', icon: 'public' },
  { id: 'friends', label: 'Amigos', icon: 'groups' },
  { id: 'private', label: 'Privado', icon: 'lock' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Iniciante' },
  { id: 'medium', label: 'Intermediário' },
  { id: 'hard', label: 'Avançado' },
  { id: 'pro', label: 'Pro' },
];

const DIFFICULTY_LABEL_TO_ID = DIFFICULTY_OPTIONS.reduce((acc, option) => {
  acc[option.label] = option.id;
  return acc;
}, {});

const MIN_TRIM_DURATION = 2;

const UPLOAD_STEPS = [
  { id: 1, label: 'Manobra' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Edição' },
];


const MANEUVER_TYPES = [
  { id: 'rail', label: 'Rail' },
  { id: 'kicker', label: 'Kicker' },
  { id: 'air', label: 'Air' },
  { id: 'surface', label: 'Surface' },
];

const COMPONENT_DIVISIONS = [
  { id: 'approach', label: 'Approach / Edge' },
  { id: 'entry', label: 'Entrada' },
  { id: 'spins', label: 'Rotação' },
  { id: 'grabs', label: 'Grab' },
  { id: 'base_moves', label: 'Base Move' },
];

const DIVISION_HINTS = {
  approach: 'Selecione o edge usado na aproximação.',
  entry: 'Escolha como você entra/pop no obstáculo.',
  spins: 'Informe a rotação principal da manobra.',
  grabs: 'Marque o grab aplicado (ou "Sem grab").',
  base_moves: 'Escolha o movimento base executado.',
};



const formatNumber = (value) => {
  if (value == null) return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toLocaleString('pt-BR');
};

const formatTimestamp = (value) => {
  if (value == null || Number.isNaN(value)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export default function UploadScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const presetChallenge = route.params?.presetChallenge;
  const safeInsets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedManeuverType, setSelectedManeuverType] = useState(null);

  const [videoPreview, setVideoPreview] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [targetFrameRate, setTargetFrameRate] = useState(30);
  const [slowMotionFactor, setSlowMotionFactor] = useState(1);
  const [slowMotionStart, setSlowMotionStart] = useState(0);
  const [slowMotionEnd, setSlowMotionEnd] = useState(0);

  const [privacy, setPrivacy] = useState(PRIVACY_OPTIONS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  const emptyComponentPayload = useMemo(
    () => ({
      approach: 'none',
      entry: 'none',
      spins: 'none',
      grabs: 'none',
      base_moves: 'none',
      modifiers: [],
    }),
    []
  );

  const [componentOptions, setComponentOptions] = useState(null);
  const [componentPayload, setComponentPayload] = useState(emptyComponentPayload);
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [componentError, setComponentError] = useState(null);
  const [maneuverDisplayName, setManeuverDisplayName] = useState('');
  const [hasEditedDisplayName, setHasEditedDisplayName] = useState(false);

  const componentLookup = useMemo(() => {
    if (!componentOptions) return null;
    const map = {};
    Object.entries(componentOptions).forEach(([division, list]) => {
      list.forEach((item) => {
        map[`${division}.${item.component_id}`] = item;
      });
    });
    return map;
  }, [componentOptions]);

  const handleSelectComponentOption = useCallback((division, componentId) => {
    setComponentPayload((prev) => ({
      ...prev,
      [division]: componentId,
    }));
    setHasEditedDisplayName(false);
  }, []);

  const toggleModifier = useCallback((modifierId) => {
    setComponentPayload((prev) => {
      const exists = prev.modifiers.includes(modifierId);
      return {
        ...prev,
        modifiers: exists
          ? prev.modifiers.filter((id) => id !== modifierId)
          : [...prev.modifiers, modifierId],
      };
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchComponents = async () => {
      try {
        setComponentsLoading(true);
        setComponentError(null);
        let response;
        try {
          response = await api.get('/skill-components/public');
        } catch (publicError) {
          console.warn('Falha ao carregar componentes públicos, tentando rota protegida...', publicError?.message);
          response = await api.get('/skill-components');
        }
        const fetched = response.data?.components || null;
        if (!isMounted) return;
        if (!fetched) {
          setComponentOptions(null);
          return;
        }
        const normalized = {
          approach: [...(fetched.approach || [])],
          entry: [...(fetched.entry || [])],
          spins: [...(fetched.spins || [])],
          grabs: [...(fetched.grabs || [])],
          base_moves: [...(fetched.base_moves || [])],
          modifiers: [...(fetched.modifiers || [])],
        };
        const ensureNoneOption = (division, name, description) => {
          const list = normalized[division];
          if (!list.some((component) => component.component_id === 'none')) {
            list.unshift({
              component_id: 'none',
              name,
              description,
              xp: 0,
              division,
            });
          }
        };
        ensureNoneOption('approach', 'Sem approach/edge', 'Nenhum edge aplicado');
        ensureNoneOption('entry', 'Sem entry', 'Nenhuma entrada aplicada');
        ensureNoneOption('spins', 'Sem rotação', 'Nenhuma rotação aplicada');
        ensureNoneOption('grabs', 'Sem grab', 'Nenhum grab atribuído');
        ensureNoneOption('base_moves', 'Sem base move', 'Nenhum base selecionado');
        setComponentOptions(normalized);
        setComponentPayload((prev) => ({
          ...prev,
          approach: prev.approach !== 'none' ? prev.approach : normalized.approach[0]?.component_id || 'none',
          entry: prev.entry !== 'none' ? prev.entry : normalized.entry[0]?.component_id || 'none',
          spins: prev.spins !== 'none' ? prev.spins : normalized.spins[0]?.component_id || 'none',
          grabs: prev.grabs !== 'none' ? prev.grabs : normalized.grabs[0]?.component_id || 'none',
          base_moves: prev.base_moves !== 'none' ? prev.base_moves : normalized.base_moves[0]?.component_id || 'none',
          modifiers: prev.modifiers || [],
        }));
      } catch (error) {
        console.error('Erro ao carregar componentes:', error);
        if (isMounted) {
          setComponentError('Não foi possível carregar os componentes de manobra.');
        }
      } finally {
        if (isMounted) {
          setComponentsLoading(false);
        }
      }
    };

    fetchComponents();
    return () => {
      isMounted = false;
    };
  }, []);
  const [presetUploadConfig, setPresetUploadConfig] = useState(null);

  const [parks, setParks] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [selectedObstacle, setSelectedObstacle] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('Aguardando seleção de vídeo');

  const editorVideoRef = useRef(null);
  const hasSlowMotion =
    slowMotionFactor !== 1 && slowMotionEnd - slowMotionStart >= MIN_TRIM_DURATION;
  const slowMotionDuration = Math.max(0, slowMotionEnd - slowMotionStart);
  const editorReadyRef = useRef(false);
  const trimConfigRef = useRef({
    start: 0,
    end: 0,
    slowFactor: 1,
  });

  const clampedTrimStart = useMemo(
    () => Math.min(trimStart, Math.max(0, trimEnd - MIN_TRIM_DURATION)),
    [trimStart, trimEnd]
  );
  const clampedTrimEnd = useMemo(
    () => Math.max(trimEnd, clampedTrimStart + MIN_TRIM_DURATION),
    [trimEnd, clampedTrimStart]
  );
  const clampedSlowStart = useMemo(
    () =>
      Math.min(
        Math.max(slowMotionStart, clampedTrimStart),
        Math.max(clampedTrimStart, clampedTrimEnd - MIN_TRIM_DURATION)
      ),
    [slowMotionStart, clampedTrimStart, clampedTrimEnd]
  );
  const clampedSlowEnd = useMemo(
    () =>
      Math.max(
        Math.min(slowMotionEnd, clampedTrimEnd),
        clampedSlowStart + MIN_TRIM_DURATION
      ),
    [slowMotionEnd, clampedTrimEnd, clampedSlowStart]
  );

  useEffect(() => {
    if (clampedTrimStart !== trimStart) {
      setTrimStart(clampedTrimStart);
    }
    if (clampedTrimEnd !== trimEnd) {
      setTrimEnd(clampedTrimEnd);
    }
  }, [clampedTrimStart, clampedTrimEnd, trimStart, trimEnd]);

  useEffect(() => {
    if (thumbnailTime < trimStart) {
      setThumbnailTime(trimStart);
    } else if (thumbnailTime > trimEnd) {
      setThumbnailTime(trimEnd);
    }
  }, [trimStart, trimEnd, thumbnailTime]);

  useEffect(() => {
    if (clampedSlowStart !== slowMotionStart) {
      setSlowMotionStart(clampedSlowStart);
    }
    if (clampedSlowEnd !== slowMotionEnd) {
      setSlowMotionEnd(clampedSlowEnd);
    }
  }, [clampedSlowStart, clampedSlowEnd, slowMotionStart, slowMotionEnd]);

  useEffect(() => {
    trimConfigRef.current = {
      start: trimStart,
      end: trimEnd,
      slowFactor: slowMotionFactor,
    };
  }, [trimStart, trimEnd, slowMotionFactor]);
  const applyEditorPlaybackRate = useCallback(async () => {
    const video = editorVideoRef.current;
    if (!video || !editorReadyRef.current) return;
    const factor = Math.max(0.25, Math.min(2, trimConfigRef.current.slowFactor || 1));
    const playbackRate = factor === 0 ? 1 : 1 / factor;

    try {
      await video.setRateAsync(playbackRate, true);
    } catch (error) {
      console.warn('Erro ao ajustar velocidade do preview:', error);
    }
  }, []);

  const seekToTrimStart = useCallback(
    async (resumePlayback = false) => {
      const video = editorVideoRef.current;
      if (!video || !editorReadyRef.current) return;
      const startMs = Math.max(0, Math.floor((trimConfigRef.current.start || 0) * 1000));

      try {
        await video.setPositionAsync(startMs);
        if (resumePlayback && showEditorModal) {
          await video.playAsync();
        }
      } catch (error) {
        console.warn('Erro ao reposicionar preview:', error);
      }
    },
    [showEditorModal]
  );

  const handleEditorStatusUpdate = useCallback((status) => {
    if (!status?.isLoaded || !editorReadyRef.current) return;
    const video = editorVideoRef.current;
    if (!video) return;

    const startMs = Math.max(0, Math.floor((trimConfigRef.current.start || 0) * 1000));
    const endMsCandidate = Math.floor((trimConfigRef.current.end || 0) * 1000);
    const endMs = Math.max(
      startMs + MIN_TRIM_DURATION * 1000,
      endMsCandidate > 0 ? endMsCandidate : startMs + MIN_TRIM_DURATION * 1000
    );

    if (status.positionMillis < startMs) {
      video.setPositionAsync(startMs).catch(() => null);
      return;
    }

    if (status.positionMillis > endMs || status.didJustFinish) {
      video
        .setPositionAsync(startMs)
        .then(() => {
          if (status.shouldPlay) {
            video.playAsync().catch(() => null);
          }
        })
        .catch(() => null);
    }
  }, []);

  const handleEditorLoad = useCallback(async () => {
    editorReadyRef.current = true;
    await applyEditorPlaybackRate();
    await seekToTrimStart(true);
  }, [applyEditorPlaybackRate, seekToTrimStart]);

  useEffect(() => {
    if (!showEditorModal) {
      editorReadyRef.current = false;
      try {
        editorVideoRef.current?.pauseAsync?.();
      } catch (error) {
        console.warn('Erro ao pausar pré-visualização:', error);
      }
      return;
    }
    editorReadyRef.current = false;
  }, [showEditorModal]);

  useEffect(() => {
    if (!showEditorModal || !editorReadyRef.current) return;
    applyEditorPlaybackRate();
  }, [showEditorModal, slowMotionFactor, applyEditorPlaybackRate]);

  useEffect(() => {
    if (!showEditorModal || !editorReadyRef.current) return;
    seekToTrimStart();
  }, [showEditorModal, trimStart, seekToTrimStart]);
  const handleGenerateThumbnail = useCallback(
    async (timeInSeconds, sourceVideo = null) => {
      const targetTime = Number.isFinite(timeInSeconds) ? Math.max(0, timeInSeconds) : 0;
      const videoUri = sourceVideo?.uri || videoPreview?.uri;
      if (!videoUri) return;

      try {
        setIsGeneratingThumbnail(true);
        const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: targetTime * 1000,
        });
        setThumbnailPreview(result?.uri || null);
        setThumbnailTime(targetTime);
      } catch (error) {
        console.warn('Não foi possível gerar thumbnail personalizada:', error);
        setThumbnailPreview(null);
      } finally {
        setIsGeneratingThumbnail(false);
      }
    },
    [videoPreview?.uri]
  );

  const handleVideoSelection = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar um vídeo.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets?.[0]) {
        setUploadStatus('Verificando vídeo...');

        const video = pickerResult.assets[0];
        const preparation = await uploadService.prepareVideo(video);

        if (!preparation.valid) {
          Alert.alert('Vídeo inválido', preparation.error);
          setUploadStatus('Aguardando seleção de vídeo');
          return;
        }

        setVideoPreview(preparation.videoFile ?? video);
        setVideoInfo(preparation);
        const durationRaw = typeof video.duration === 'number' ? video.duration : 0;
        const normalized = durationRaw > 600 ? durationRaw / 1000 : durationRaw;
        const safeDuration = Math.max(normalized || 0, MIN_TRIM_DURATION);
        setVideoDuration(safeDuration);
        setTrimStart(0);
        setTrimEnd(safeDuration);

        const defaultThumbnailTime = Math.min(1.5, Math.max(safeDuration / 2, 0));
        await handleGenerateThumbnail(defaultThumbnailTime, video);

        const defaultSlowStart = Math.max(0, safeDuration * 0.25);
        const defaultSlowEnd = Math.min(safeDuration, defaultSlowStart + Math.max(2, safeDuration * 0.3));
        setSlowMotionStart(defaultSlowStart);
        setSlowMotionEnd(defaultSlowEnd);
        setSlowMotionFactor(1);
        setTargetFrameRate(30);
        setUploadProgress(0);
        setUploadStatus('Vídeo selecionado! Ajuste os detalhes antes de postar.');
        setShowEditorModal(true);

        const qualityCheck = await uploadService.validateVideoQuality(video);
        if (qualityCheck?.warning) {
          Alert.alert('Atenção', qualityCheck.warning);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar vídeo:', error);

      if (
        Platform.OS === 'ios' &&
        typeof error?.message === 'string' &&
        error.message.includes('PHPhotosErrorDomain')
      ) {
        Alert.alert(
          'Vídeo precisa ser baixado',
          'Esse vídeo está apenas no iCloud. Abra o app Fotos, baixe o arquivo e tente novamente.'
        );
        setUploadStatus('Vídeo indisponível no dispositivo. Baixe do iCloud e tente novamente.');
        return;
      }

      Alert.alert('Erro', 'Não foi possível selecionar o vídeo.');
      setUploadStatus('Aguardando seleção de vídeo');
    }
  }, [handleGenerateThumbnail]);

  const handleRemoveVideo = useCallback(() => {
    setVideoPreview(null);
    setVideoInfo(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setThumbnailTime(0);
    setThumbnailPreview(null);
    setSlowMotionStart(0);
    setSlowMotionEnd(0);
    setSlowMotionFactor(1);
    setTargetFrameRate(30);
    setShowEditorModal(false);
    editorReadyRef.current = false;
    setUploadProgress(0);
    setUploadStatus('Aguardando seleção de vídeo');
  }, []);

  const handleResetSlowMotion = useCallback(() => {
    setSlowMotionFactor(1);
    setSlowMotionStart(trimStart);
    setSlowMotionEnd(trimEnd);
  }, [trimStart, trimEnd]);

  const handleCloseEditor = useCallback(() => {
    try {
      editorVideoRef.current?.pauseAsync?.();
    } catch (error) {
      console.warn('Erro ao pausar pré-visualização:', error);
    }
    editorReadyRef.current = false;
    setShowEditorModal(false);
  }, []);

  const handleSelectDifficulty = useCallback(
    (optionId) => {
      if (isUploading) return;
      setSelectedDifficulty((prev) => (prev === optionId ? null : optionId));
    },
    [isUploading]
  );

  const handleSelectPrivacy = useCallback(
    (optionId) => {
      if (isUploading) return;
      setPrivacy(optionId);
    },
    [isUploading]
  );

  const handleSubmit = useCallback(async () => {
    if (isUploading) return;

    if (!videoPreview) {
      Alert.alert('Atenção', 'Selecione um vídeo da galeria antes de postar.');
      return;
    }

    const effectiveManeuverType = (presetUploadConfig?.maneuverType || selectedManeuverType || '').toLowerCase();
    const resolvedManeuverName = presetUploadConfig?.maneuverName || maneuverName;

    if (!effectiveManeuverType || !resolvedManeuverName) {
      Alert.alert('Atenção', 'Selecione um estilo de manobra e defina os detalhes antes de enviar.');
      return;
    }

    if (!selectedPark) {
      Alert.alert('Atenção', 'Escolha o parque onde a sessão foi gravada.');
      return;
    }

    const payloadToSend = presetUploadConfig?.maneuverPayload
      ? ensureManeuverPayload(presetUploadConfig.maneuverPayload)
      : ensureManeuverPayload(componentPayload);

    const displayName = (maneuverDisplayName || '').trim();
    if (displayName) {
      payloadToSend.displayName = displayName;
    }

    const hasAllDivisions = COMPONENT_DIVISIONS.every(
      (division) => payloadToSend[division.id] && payloadToSend[division.id] !== ''
    );

    if (!payloadToSend || !hasAllDivisions) {
      Alert.alert(
        'Manobra incompleta',
        'Defina todos os componentes da manobra antes de enviar o vídeo.'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparando upload...');

    try {
      const activeTrimStart = Math.max(0, Math.min(trimStart, trimEnd - MIN_TRIM_DURATION));
      const activeTrimEnd = Math.max(activeTrimStart + MIN_TRIM_DURATION, trimEnd);

      const effectiveFactor = Math.max(0.25, Math.min(2, slowMotionFactor));
      const sanitizedFrameRate = Math.max(15, Math.min(60, targetFrameRate));

      const videoData = {
        videoFile: videoPreview,
        parkId: selectedPark,
        obstacleId: selectedObstacle,
        visibility: privacy,
        challengeId: selectedChallengeId,
        trimStart: activeTrimStart,
        trimEnd: activeTrimEnd,
        thumbnailTime: thumbnailTime,
        targetFrameRate: sanitizedFrameRate,
        slowMotionFactor: effectiveFactor,
        maneuverType: effectiveManeuverType,
        maneuverName: resolvedManeuverName,
        maneuverDisplayName: displayName || resolvedManeuverName,
        trickShortName: displayName || resolvedManeuverName,
        maneuverPayload: payloadToSend,
        questNodeId: presetUploadConfig?.questNodeId || null,
      };

      const uploadResult = await uploadService.uploadVideo(videoData, {
        maxRetries: 3,
        timeout: 180000,
        onProgress: ({ progress, progressPercent, attempt }) => {
          setUploadProgress(progress);
          const progressLabel = Math.round(progressPercent);
          setUploadStatus(
            attempt && attempt > 1
              ? `Tentativa ${attempt} • ${progressLabel}%`
              : `Upload em ${progressLabel}%`
          );
        },
        onRetry: (attempt, delay) => {
          setUploadStatus(`Tentativa ${attempt} reinicia em ${Math.round(delay / 1000)}s...`);
        },
      });

      if (!uploadResult?.success) {
        throw new Error(uploadResult?.error || 'Upload falhou. Tente novamente.');
      }

      const serverProcessing = Boolean(uploadResult?.serverProcessing);

      await videoService.clearFeedCache();

      setVideoPreview(null);
      setVideoInfo(null);
      setSelectedObstacle(null);
      setSelectedDifficulty(null);
      setSelectedChallengeId(null);
      setPresetUploadConfig(null);
      setUploadStatus(
        serverProcessing
          ? 'Vídeo enviado! Processando na nuvem...'
          : 'Vídeo enviado! Continue criando.'
      );
      setComponentPayload(emptyComponentPayload);
      setSelectedManeuverType(null);

      const compressionSavings = Number(uploadResult?.data?.video?.compression_savings ?? 0);
      const completionMessage = serverProcessing
        ? 'Vídeo enviado! Estamos finalizando o processamento e você será notificado em instantes.'
        : compressionSavings > 0
            ? `Vídeo enviado e comprimido em ${compressionSavings}% — mais rápido para carregar e salvar espaço.`
            : 'Vídeo enviado com sucesso. Nenhuma compressão adicional foi aplicada (o arquivo já estava otimizado ou o serviço de compressão estava indisponível).';
      const warningNote = uploadResult?.warning ? `\nDetalhes: ${uploadResult.warning}` : '';

      Alert.alert(serverProcessing ? 'Processando...' : 'Processamento concluído', `${completionMessage}${warningNote}`);
      setCurrentStep(1);
    } catch (error) {
      console.error('Erro no upload:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível completar o upload.');
      setUploadStatus('Erro ao enviar. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  }, [
    isUploading,
    videoPreview,
    selectedPark,
    trimStart,
    trimEnd,
    slowMotionFactor,
    targetFrameRate,
    privacy,
    selectedObstacle,
    selectedChallengeId,
    thumbnailTime,
    componentPayload,
    presetUploadConfig,
    maneuverName,
    selectedManeuverType,
    emptyComponentPayload,
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [parksResponse, obstaclesResponse] = await Promise.all([
          parkService.getParks(),
          parkService.getObstacles(),
        ]);
        setParks(parksResponse?.parks ?? []);
        setObstacles(obstaclesResponse?.obstacles ?? []);
      } catch (error) {
        console.error('Erro ao carregar parques/obstáculos:', error);
        Alert.alert('Erro', 'Não foi possível carregar parques e obstáculos no momento.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!presetChallenge) return;

    if (presetChallenge.parkId) setSelectedPark(presetChallenge.parkId);
    if (presetChallenge.obstacleId) setSelectedObstacle(presetChallenge.obstacleId);
    if (presetChallenge.difficulty) {
      const difficultyId = DIFFICULTY_LABEL_TO_ID[presetChallenge.difficulty] ?? null;
      setSelectedDifficulty(difficultyId);
    }
    if (presetChallenge.challengeId) setSelectedChallengeId(presetChallenge.challengeId);

    const presetPayload = presetChallenge.maneuverPayload
      ? ensureManeuverPayload(presetChallenge.maneuverPayload)
      : null;
    if (presetPayload) {
      setComponentPayload(presetPayload);
    }
    if (presetChallenge.maneuverName) {
      setManeuverDisplayName(presetChallenge.maneuverName);
      setHasEditedDisplayName(true);
    } else {
      setHasEditedDisplayName(false);
    }

    setPresetUploadConfig({
      maneuverPayload: presetPayload,
      maneuverType: presetChallenge.maneuverType || null,
      questNodeId: presetChallenge.questNodeId || null,
      maneuverName: presetChallenge.maneuverName || null,
    });

    if (presetChallenge.maneuverType) {
      setSelectedManeuverType(presetChallenge.maneuverType);
    } else if (presetChallenge.specialization) {
      const map = { slider: 'rail', kicker: 'kicker', surface: 'surface' };
      const inferred = map[presetChallenge.specialization];
      if (inferred) {
        setSelectedManeuverType(inferred);
      }
    }

    setUploadStatus('Manobra aplicada! Agora escolha um vídeo da galeria.');
    navigation.setParams?.({ presetChallenge: undefined });
  }, [presetChallenge, navigation]);

  const filteredObstacles = useMemo(() => {
    if (!selectedPark) return obstacles;
    const filtered = obstacles.filter((obstacle) => obstacle.park_id === selectedPark);
    return filtered.length > 0 ? filtered : obstacles;
  }, [obstacles, selectedPark]);

  const selectedParkData = useMemo(
    () => parks.find((park) => park.id === selectedPark),
    [parks, selectedPark]
  );

  const selectedObstacleData = useMemo(() => {
    if (!selectedObstacle) return null;
    return obstacles.find(
      (obstacle) => obstacle.id === selectedObstacle || obstacle.obstacle_id === selectedObstacle
    );
  }, [obstacles, selectedObstacle]);

  const lookupName = useCallback(
    (division, id) => componentLookup?.[`${division}.${id}`]?.display_name || componentLookup?.[`${division}.${id}`]?.name || '',
    [componentLookup]
  );

  const cleanComponentName = useCallback(
    (division, id) => {
      const raw = lookupName(division, id);
      if (!raw) return '';
      const lower = raw.trim().toLowerCase();
      if (!lower || lower === 'none' || lower.startsWith('sem ')) {
        return '';
      }
      return raw.trim();
    },
    [lookupName]
  );

  const buildAutoDisplayName = useCallback(() => {
    if (!componentLookup) return '';
    const base = cleanComponentName('base_moves', componentPayload.base_moves);
    const spin = cleanComponentName('spins', componentPayload.spins);
    const grab = cleanComponentName('grabs', componentPayload.grabs);
    const modifiers = (componentPayload.modifiers || [])
      .map((id) => cleanComponentName('modifiers', id))
      .filter(Boolean)
      .slice(0, 2);

    const parts = [];
    if (base) parts.push(base);
    if (spin) parts.push(spin);
    if (grab) parts.push(grab);
    if (modifiers.length) parts.push(...modifiers);

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }, [componentLookup, componentPayload, cleanComponentName]);

  useEffect(() => {
    if (hasEditedDisplayName) return;
    const autoName = buildAutoDisplayName();
    if (autoName && autoName !== maneuverDisplayName) {
      setManeuverDisplayName(autoName);
    }
  }, [buildAutoDisplayName, hasEditedDisplayName, maneuverDisplayName]);

  const { maneuverPreview, maneuverName } = useMemo(() => {
    const presetName = presetUploadConfig?.maneuverName?.trim();
    const displayName = (maneuverDisplayName || '').trim();

    if (!componentLookup) {
      return { maneuverPreview: displayName || '', maneuverName: displayName || presetName || '' };
    }

    const parts = [
      cleanComponentName('approach', componentPayload.approach),
      cleanComponentName('entry', componentPayload.entry),
      cleanComponentName('base_moves', componentPayload.base_moves),
      cleanComponentName('spins', componentPayload.spins),
      cleanComponentName('grabs', componentPayload.grabs),
    ].filter(Boolean);

    const modifiersNames = (componentPayload.modifiers || [])
      .map((modifierId) => cleanComponentName('modifiers', modifierId))
      .filter(Boolean);
    if (modifiersNames.length) {
      parts.push(modifiersNames.join(' + '));
    }

    const nameFromComponents =
      cleanComponentName('base_moves', componentPayload.base_moves) ||
      cleanComponentName('spins', componentPayload.spins) ||
      '';

    return {
      maneuverPreview: displayName || parts.join(' • '),
      maneuverName: displayName || presetName || nameFromComponents,
    };
  }, [
    componentLookup,
    componentPayload,
    presetUploadConfig,
    maneuverDisplayName,
    lookupName,
  ]);
  const maneuverTypeLabel = useMemo(() => {
    const found = MANEUVER_TYPES.find((type) => type.id === selectedManeuverType);
    return found ? found.label : null;
  }, [selectedManeuverType]);

  const handleSelectManeuverType = useCallback((typeId) => {
    setSelectedManeuverType((prev) => (prev === typeId ? null : typeId));
  }, []);

  const handleResetManeuvers = useCallback(() => {
    setComponentPayload(emptyComponentPayload);
    setSelectedManeuverType(null);
    setPresetUploadConfig(null);
    setManeuverDisplayName('');
    setHasEditedDisplayName(false);
  }, [emptyComponentPayload]);

  const canAccessStep = useCallback(
    (step) => {
      if (step === 1) return true;
      if (step === 2) return Boolean(selectedManeuverType);
      if (step === 3) return Boolean(videoPreview);
      return false;
    },
    [selectedManeuverType, videoPreview]
  );

  const goToStep = useCallback(
    (step) => {
      if (step === currentStep) return;
      if (!canAccessStep(step)) return;
      setCurrentStep(step);
    },
    [currentStep, canAccessStep]
  );

  const renderParkModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={showParkModal}
      onRequestClose={() => setShowParkModal(false)}
    >
      <View style={styles.modalOverlay}>
        <YupCard style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Escolher parque</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowParkModal(false)}>
              <MaterialIcons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {parks.map((park) => {
              const isSelected = selectedPark === park.id;
              return (
                <TouchableOpacity
                  key={park.id}
                  style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                  onPress={() => {
                    setSelectedPark(park.id);
                    setSelectedObstacle(null);
                    setShowParkModal(false);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.modalRowIcon}>
                    <MaterialIcons name="flag" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.modalRowContent}>
                    <Text style={styles.modalRowTitle}>{park.name}</Text>
                    {park.city ? (
                      <Text style={styles.modalRowSubtitle}>
                        {park.city} • {park.state}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                  ) : (
                    <MaterialIcons name="chevron-right" size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </YupCard>
      </View>
    </Modal>
  );

  const renderEditorModal = () => (
    <Modal
      animationType="slide"
      visible={showEditorModal}
      presentationStyle="fullScreen"
      onRequestClose={handleCloseEditor}
    >
      <SafeAreaView style={styles.editorSafeArea}>
        <View style={[styles.editorTopBar, { paddingTop: safeInsets.top + spacing.md }]}>
          <TouchableOpacity style={styles.editorTopButton} onPress={handleCloseEditor}>
            <MaterialIcons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.editorTopTitle}>Preview</Text>
          <TouchableOpacity style={styles.editorTopButton} onPress={handleCloseEditor}>
            <MaterialIcons name="check" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.editorScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.editorVideoPreview}>
            {videoPreview?.uri ? (
              <Video
                ref={editorVideoRef}
                style={styles.editorVideo}
                source={{ uri: videoPreview.uri }}
                resizeMode="contain"
                shouldPlay
                useNativeControls
                onLoad={handleEditorLoad}
                onPlaybackStatusUpdate={handleEditorStatusUpdate}
              />
            ) : (
              <ImageBackground
                source={previewPlaceholder}
                style={styles.editorVideo}
                imageStyle={styles.editorVideo}
              />
            )}
            <View style={styles.editorVideoOverlay}>
              <MaterialIcons name="timelapse" size={20} color={colors.surface} />
              <Text style={styles.editorVideoOverlayText}>
                {formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}
              </Text>
            </View>
          </View>
          <Text style={styles.editorHint}>
            O vídeo será reproduzido respeitando o corte atual. Ajuste os sliders no editor rápido para refinar.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <YupBadge variant="primary" style={styles.headerBadge}>
            Upload Session
          </YupBadge>
          <Text style={styles.headerTitle}>Fluxo de upload Y'UP</Text>
          <Text style={styles.headerSubtitle}>
            Preencha as etapas para conectar a manobra ao desafio, enviar o vídeo e registrar os detalhes técnicos.
          </Text>
        </View>

        <View style={styles.stepper}>
          {UPLOAD_STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            const reachable = canAccessStep(step.id);
            return (
              <React.Fragment key={step.id}>
                <TouchableOpacity
                  style={styles.stepItem}
                  activeOpacity={reachable ? 0.85 : 1}
                  onPress={() => {
                    if (reachable) goToStep(step.id);
                  }}
                  disabled={!reachable}
                >
                  <View
                    style={[
                      styles.stepBadge,
                      isActive && styles.stepBadgeActive,
                      isComplete && styles.stepBadgeComplete,
                      !reachable && styles.stepBadgeDisabled,
                    ]}
                  >
                    {isComplete ? (
                      <MaterialIcons name="check" size={16} color={colors.background} />
                    ) : (
                      <Text style={styles.stepBadgeText}>{step.id}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isActive || isComplete) && styles.stepLabelActive,
                      !reachable && styles.stepLabelDisabled,
                    ]}
                  >
                    {step.label}
                  </Text>
                </TouchableOpacity>
                {index < UPLOAD_STEPS.length - 1 ? (
                  <View
                    style={[
                      styles.stepConnector,
                      currentStep > step.id && styles.stepConnectorActive,
                    ]}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.stepContent}>
          {currentStep === 1 ? (
            <View style={styles.maneuverStack}>
              <YupCard style={styles.maneuverTypeCard}>
                <YupSectionHeader
                  title="Escolha o estilo"
                  subtitle="Selecione o módulo que deseja detalhar agora."
                />
                <View style={styles.maneuverTypeRow}>
                  {MANEUVER_TYPES.map((type) => {
                    const isActive = selectedManeuverType === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[styles.maneuverTypeOption, isActive && styles.maneuverTypeOptionActive]}
                        activeOpacity={0.85}
                        onPress={() => handleSelectManeuverType(type.id)}
                      >
                        <Text style={[styles.maneuverTypeLabel, isActive && styles.maneuverTypeLabelActive]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </YupCard>

              <YupCard style={styles.componentCard}>
                <YupInput
                  label="Nome de exibição da manobra"
                  placeholder="Ex.: Backroll Indy"
                  value={maneuverDisplayName}
                  onChangeText={(text) => {
                    setManeuverDisplayName(text);
                    setHasEditedDisplayName(true);
                  }}
                  autoCapitalize="words"
                />
                <Text style={styles.displayNameHint}>
                  Esse nome curto aparece no feed. Os detalhes técnicos continuam no payload de componentes.
                </Text>
              </YupCard>

              <YupCard style={styles.componentCard}>
                <View style={styles.componentCardHeader}>
                  <View>
                    <Text style={styles.componentCardTitle}>Componentes da manobra</Text>
                    <Text style={styles.componentCardSubtitle}>
                      Escolha um componente em cada divisão para alinhar com o sistema do dashboard.
                    </Text>
                  </View>
                  <YupButton
                    variant="secondary"
                    title="Resetar"
                    onPress={handleResetManeuvers}
                    style={styles.resetButton}
                    textStyle={styles.resetButtonText}
                  />
                </View>

                {componentError ? (
                  <Text style={styles.componentError}>{componentError}</Text>
                ) : null}

                {componentsLoading ? (
                  <View style={styles.componentLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.componentLoadingText}>Carregando componentes...</Text>
                  </View>
                ) : componentOptions ? (
                  <>
                    {COMPONENT_DIVISIONS.map((division) => {
                      const options = componentOptions?.[division.id] || [];
                      if (!options.length) return null;
                      return (
                        <View key={division.id} style={styles.componentDivision}>
                          <Text style={styles.componentDivisionTitle}>{division.label}</Text>
                          <Text style={styles.componentDivisionHint}>
                            {DIVISION_HINTS[division.id]}
                          </Text>
                          <View style={styles.componentOptionList}>
                            {options.map((option) => {
                              const isActive =
                                componentPayload[division.id] === option.component_id;
                              return (
                                <TouchableOpacity
                                  key={option.component_id}
                                  style={[
                                    styles.componentOption,
                                    isActive && styles.componentOptionActive,
                                  ]}
                                  onPress={() =>
                                    handleSelectComponentOption(division.id, option.component_id)
                                  }
                                  activeOpacity={0.8}
                                >
                                  <Text
                                    style={[
                                      styles.componentOptionName,
                                      isActive && styles.componentOptionNameActive,
                                    ]}
                                  >
                                    {option.name}
                                  </Text>
                                  <Text style={styles.componentOptionXp}>
                                    {option.xp} XP
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}

                    {(componentOptions.modifiers || []).length ? (
                      <View style={styles.componentDivision}>
                        <Text style={styles.componentDivisionTitle}>Modifiers</Text>
                        <Text style={styles.componentDivisionHint}>
                          Combine modificadores extras para enriquecer a manobra.
                        </Text>
                        <View style={styles.componentOptionList}>
                          {(componentOptions.modifiers || []).map((modifier) => {
                            const isActive = componentPayload.modifiers.includes(
                              modifier.component_id
                            );
                            return (
                              <TouchableOpacity
                                key={modifier.component_id}
                                style={[
                                  styles.componentOption,
                                  isActive && styles.componentOptionActive,
                                ]}
                                onPress={() => toggleModifier(modifier.component_id)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.componentOptionName,
                                    isActive && styles.componentOptionNameActive,
                                  ]}
                                >
                                  {modifier.name}
                                </Text>
                                <Text style={styles.componentOptionXp}>{modifier.xp} XP</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.maneuverPlaceholderText}>
                    Nenhum componente carregado. Tente novamente mais tarde.
                  </Text>
                )}
              </YupCard>
            </View>
          ) : null}

          {currentStep === 2 ? (
            <View style={styles.uploadStack}>
              <YupCard style={styles.videoCard}>
                <YupSectionHeader
                  title="Vídeo da sessão"
                  subtitle="Selecione o arquivo e acompanhe o status antes de seguir para a edição."
                />

                <TouchableOpacity
                  style={styles.videoPreview}
                  activeOpacity={videoPreview ? 0.9 : 1}
                  onPress={() => {
                    if (videoPreview) {
                      setShowEditorModal(true);
                    }
                  }}
                >
                  <ImageBackground
                    source={videoPreview?.uri ? { uri: videoPreview.uri } : previewPlaceholder}
                    style={styles.previewBackground}
                    imageStyle={styles.previewImage}
                  >
                    <View style={styles.previewOverlay}>
                      <Icon
                        name={videoPreview ? 'movie' : 'photo-library'}
                        size={26}
                        color={colors.textPrimary}
                      />
                      <Text style={styles.previewLabel}>
                        {videoPreview ? 'Vídeo selecionado' : 'Selecione um vídeo da galeria'}
                      </Text>
                      <Text style={styles.previewStatus}>{uploadStatus}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>

                <View style={styles.videoActions}>
                  <YupButton
                    title="Escolher mídia"
                    onPress={handleVideoSelection}
                    icon={<MaterialIcons name="upload" size={18} color={colors.textPrimary} />}
                  />
                  {videoPreview ? (
                    <YupButton
                      title="Abrir editor"
                      variant="secondary"
                      onPress={() => setShowEditorModal(true)}
                      icon={<MaterialIcons name="content-cut" size={18} color={colors.textPrimary} />}
                    />
                  ) : null}
                </View>

                {maneuverPreview ? (
                  <View style={styles.maneuverSummary}>
                    <MaterialIcons name="insights" size={16} color={colors.primary} />
                    <View style={styles.maneuverSummaryCopy}>
                      <Text style={styles.maneuverSummaryLabel}>Manobra selecionada</Text>
                      {maneuverTypeLabel ? (
                        <Text style={styles.maneuverSummaryType}>{maneuverTypeLabel}</Text>
                      ) : null}
                      <Text style={styles.maneuverSummaryText}>{maneuverPreview}</Text>
                    </View>
                  </View>
                ) : selectedManeuverType ? (
                  <View style={styles.maneuverSummaryPlaceholder}>
                    <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.maneuverSummaryPlaceholderText}>Finalize a configuração da manobra para gerar a prévia textual.</Text>
                  </View>
                ) : null}

                {videoInfo ? (
                  <View style={styles.videoMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="schedule" size={16} color={colors.primary} />
                      <Text style={styles.metaText}>{Math.round(videoDuration)}s</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="sd-card" size={16} color={colors.primary} />
                      <Text style={styles.metaText}>
                        {(videoInfo.sizeMB ?? 0).toFixed(1)} MB
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="high-quality" size={16} color={colors.primary} />
                      <Text style={styles.metaText}>{videoInfo.resolution ?? '1080p'}</Text>
                    </View>
                  </View>
                ) : null}

                {isUploading ? (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.max(uploadProgress * 100, 6)}%` },
                      ]}
                    />
                  </View>
                ) : null}

                {videoPreview ? (
                  <TouchableOpacity style={styles.removeButton} onPress={handleRemoveVideo}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.removeButtonText}>Remover vídeo</Text>
                  </TouchableOpacity>
                ) : null}
              </YupCard>

              <YupCard style={styles.metadataCard}>
                <YupSectionHeader
                  title="Metadados"
                  subtitle="Assinale o parque, obstáculo e visibilidade do clipe."
                />

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Parque</Text>
                  <TouchableOpacity
                    style={styles.selector}
                    onPress={() => setShowParkModal(true)}
                    activeOpacity={0.85}
                    disabled={isLoadingData}
                  >
                    <MaterialIcons name="place" size={18} color={colors.primary} />
                    <Text style={styles.selectorText}>
                      {selectedParkData
                        ? `${selectedParkData.name}${selectedParkData.city ? ` • ${selectedParkData.city}` : ''}`
                        : isLoadingData
                        ? 'Carregando parques...'
                        : 'Selecionar parque'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Obstáculo</Text>
                  {selectedPark ? (
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          !selectedObstacle && styles.chipActive,
                        ]}
                        onPress={() => setSelectedObstacle(null)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            !selectedObstacle && styles.chipTextActive,
                          ]}
                        >
                          Nenhum
                        </Text>
                      </TouchableOpacity>
                      {filteredObstacles.map((obstacle) => {
                        const isActive =
                          obstacle.id === selectedObstacle ||
                          obstacle.obstacle_id === selectedObstacle;
                        return (
                          <TouchableOpacity
                            key={obstacle.id ?? obstacle.obstacle_id}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => setSelectedObstacle(obstacle.id ?? obstacle.obstacle_id)}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[styles.chipText, isActive && styles.chipTextActive]}
                            >
                              {obstacle.name || obstacle.title || `Obstáculo ${obstacle.id}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.obstaclePlaceholder}>
                      <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.obstaclePlaceholderText}>
                        Selecione um parque para listar os obstáculos disponíveis.
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Dificuldade</Text>
                  <View style={styles.chipRow}>
                    {DIFFICULTY_OPTIONS.map((option) => {
                      const isActive = selectedDifficulty === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.chip, isActive && styles.chipActive]}
                          onPress={() => handleSelectDifficulty(option.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Privacidade</Text>
                  <View style={styles.chipRow}>
                    {PRIVACY_OPTIONS.map((option) => {
                      const isActive = privacy === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.chip, isActive && styles.chipActive]}
                          onPress={() => handleSelectPrivacy(option.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </YupCard>
            </View>
          ) : null}

          {currentStep === 3 ? (
            <View style={styles.editStack}>
              <YupCard style={styles.editorCard}>
                <YupSectionHeader
                  title="Editor rápido"
                  subtitle="Ajuste os cortes, gere thumbnail e configure slow motion antes de publicar."
                />

                <View style={styles.editorSection}>
                  <View style={styles.editorHeader}>
                    <MaterialIcons name="content-cut" size={18} color={colors.primary} />
                    <Text style={styles.editorTitle}>Corte do vídeo</Text>
                  </View>
                  <View style={styles.trimRow}>
                    <View style={styles.trimTime}>
                      <Text style={styles.trimLabel}>Início</Text>
                      <Text style={styles.trimValue}>{formatTimestamp(trimStart)}</Text>
                    </View>
                    <Slider
                      style={styles.trimSlider}
                      minimumValue={0}
                      maximumValue={Math.max(videoDuration, MIN_TRIM_DURATION)}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.surfaceMuted}
                      thumbTintColor={colors.primary}
                      step={1}
                      value={trimStart}
                      onValueChange={(value) =>
                        setTrimStart(Math.min(value, trimEnd - MIN_TRIM_DURATION))
                      }
                      onSlidingComplete={(value) =>
                        setTrimStart(Math.min(value, trimEnd - MIN_TRIM_DURATION))
                      }
                    />
                  </View>
                  <View style={styles.trimRow}>
                    <View style={styles.trimTime}>
                      <Text style={styles.trimLabel}>Fim</Text>
                      <Text style={styles.trimValue}>{formatTimestamp(trimEnd)}</Text>
                    </View>
                    <Slider
                      style={styles.trimSlider}
                      minimumValue={MIN_TRIM_DURATION}
                      maximumValue={Math.max(videoDuration, MIN_TRIM_DURATION)}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.surfaceMuted}
                      thumbTintColor={colors.primary}
                      step={1}
                      value={trimEnd}
                      onValueChange={(value) =>
                        setTrimEnd(Math.max(value, trimStart + MIN_TRIM_DURATION))
                      }
                      onSlidingComplete={(value) =>
                        setTrimEnd(Math.max(value, trimStart + MIN_TRIM_DURATION))
                      }
                    />
                  </View>
                  <View style={styles.trimSummary}>
                    <MaterialIcons name="timelapse" size={16} color={colors.textSecondary} />
                    <Text style={styles.trimSummaryText}>
                      Duração estimada: {formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}
                    </Text>
                  </View>
                </View>

                <View style={styles.editorSection}>
                  <View style={styles.editorHeader}>
                    <MaterialIcons name="photo" size={18} color={colors.primary} />
                    <Text style={styles.editorTitle}>Thumbnail personalizada</Text>
                  </View>

                  <View style={styles.thumbnailPreviewArea}>
                    {thumbnailPreview ? (
                      <ImageBackground
                        source={{ uri: thumbnailPreview }}
                        style={styles.thumbnailImage}
                        imageStyle={styles.thumbnailImage}
                      >
                        <View style={styles.thumbnailOverlay}>
                          <MaterialIcons name="collections" size={18} color={colors.surface} />
                          <Text style={styles.thumbnailOverlayText}>
                            {formatTimestamp(thumbnailTime)}
                          </Text>
                        </View>
                      </ImageBackground>
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <MaterialIcons name="image" size={24} color={colors.textSecondary} />
                        <Text style={styles.thumbnailPlaceholderText}>Gerar thumbnail</Text>
                      </View>
                    )}
                  </View>

                  <Slider
                    style={styles.thumbnailSlider}
                    minimumValue={trimStart}
                    maximumValue={trimEnd}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.surfaceMuted}
                    thumbTintColor={colors.primary}
                    step={1}
                    value={thumbnailTime}
                    onValueChange={(value) => setThumbnailTime(value)}
                    onSlidingComplete={(value) => handleGenerateThumbnail(value)}
                  />

                  <YupButton
                    title={isGeneratingThumbnail ? 'Gerando thumbnail...' : 'Atualizar thumbnail'}
                    onPress={() => handleGenerateThumbnail(thumbnailTime)}
                    isLoading={isGeneratingThumbnail}
                    disabled={isGeneratingThumbnail}
                    variant="secondary"
                  />
                </View>

                <View style={styles.editorSection}>
                  <View style={styles.editorHeader}>
                    <MaterialIcons name="slow-motion-video" size={18} color={colors.primary} />
                    <Text style={styles.editorTitle}>Frame rate & slow motion</Text>
                  </View>

                  <View style={styles.frameRateRow}>
                    <View style={styles.frameRateInfo}>
                      <Text style={styles.trimLabel}>Frame rate alvo</Text>
                      <Text style={styles.trimValue}>{`${targetFrameRate} fps`}</Text>
                    </View>
                    <Slider
                      style={styles.frameRateSlider}
                      minimumValue={15}
                      maximumValue={60}
                      step={5}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.surfaceMuted}
                      thumbTintColor={colors.primary}
                      value={targetFrameRate}
                      onValueChange={(value) => setTargetFrameRate(Math.round(value))}
                    />
                  </View>

                  <View style={styles.frameRateRow}>
                    <View style={styles.frameRateInfo}>
                      <Text style={styles.trimLabel}>Fator slow motion</Text>
                      <Text style={styles.trimValue}>
                        {slowMotionFactor === 1 ? 'Normal' : `${slowMotionFactor.toFixed(2)}x`}
                      </Text>
                    </View>
                    <Slider
                      style={styles.frameRateSlider}
                      minimumValue={0.25}
                      maximumValue={2}
                      step={0.05}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.surfaceMuted}
                      thumbTintColor={colors.primary}
                      value={slowMotionFactor}
                      onValueChange={(value) =>
                        setSlowMotionFactor(Number(value.toFixed(2)))
                      }
                    />
                  </View>

                  <View style={styles.speedSummary}>
                    <View>
                      <Text style={styles.speedSummaryTitle}>Trecho em slow</Text>
                      {hasSlowMotion ? (
                        <Text style={styles.speedSummarySubtitle}>
                          {formatTimestamp(slowMotionStart)} → {formatTimestamp(slowMotionEnd)} (
                          {formatTimestamp(slowMotionDuration)})
                        </Text>
                      ) : (
                        <Text style={styles.speedSummarySubtitle}>
                          Ajuste os controles para aplicar slow motion.
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.speedSummaryButton,
                        !hasSlowMotion && styles.speedSummaryButtonDisabled,
                      ]}
                      onPress={handleResetSlowMotion}
                      disabled={!hasSlowMotion}
                    >
                      <MaterialIcons name="restart-alt" size={18} color={colors.textPrimary} />
                      <Text style={styles.speedSummaryButtonText}>Resetar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <YupButton
                  title="Abrir editor em tela cheia"
                  variant="ghost"
                  onPress={() => setShowEditorModal(true)}
                  icon={<MaterialIcons name="open-in-full" size={18} color={colors.primary} />}
                />
              </YupCard>

              <YupButton
                title={isUploading ? 'Enviando...' : 'Publicar vídeo'}
                onPress={handleSubmit}
                isLoading={isUploading}
                disabled={isUploading}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
      {renderParkModal()}
      {renderEditorModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing['2xl'],
    gap: spacing['3xl'],
  },
  header: {
    gap: spacing.sm,
  },
  headerBadge: {
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    maxWidth: '92%',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  stepBadgeComplete: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepBadgeDisabled: {
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceMuted,
  },
  stepBadgeText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  stepLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  stepLabelDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  stepConnector: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  stepConnectorActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    gap: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },
  maneuverStack: {
    gap: spacing['2xl'],
  },
  maneuverTypeCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maneuverTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  maneuverTypeOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexBasis: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maneuverTypeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  maneuverTypeLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  maneuverTypeLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  maneuverPlaceholderCard: {
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maneuverPlaceholderTitle: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  maneuverPlaceholderText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  componentCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  displayNameHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  componentCardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  componentCardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  componentCardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    marginTop: spacing.xs / 2,
  },
  componentError: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
  },
  componentLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  componentLoadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  componentDivision: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  componentDivisionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  componentDivisionHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  componentOptionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  componentOption: {
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs / 2,
  },
  componentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  componentOptionName: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  componentOptionNameActive: {
    color: colors.primary,
  },
  componentOptionXp: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  formField: {
    gap: spacing.xs,
  },
  formLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  maneuverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  maneuverTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  resetButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  uploadStack: {
    gap: spacing['2xl'],
  },
  videoCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  videoPreview: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBackground: {
    height: 180,
    justifyContent: 'flex-end',
  },
  previewImage: {
    resizeMode: 'cover',
  },
  previewOverlay: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewLabel: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  previewStatus: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  videoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  maneuverSummary: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maneuverSummaryCopy: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  maneuverSummaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  maneuverSummaryType: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  maneuverSummaryText: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
  },
  maneuverSummaryPlaceholder: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maneuverSummaryPlaceholderText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  videoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  removeButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  removeButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  metadataCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  selectorText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  editStack: {
    gap: spacing['2xl'],
  },
  editorCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editorSection: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editorTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  trimRow: {
    gap: spacing.sm,
  },
  trimTime: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trimLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  trimValue: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  trimSlider: {
    width: '100%',
  },
  trimSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trimSummaryText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  thumbnailPreviewArea: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailImage: {
    height: 140,
    width: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  thumbnailOverlayText: {
    fontSize: typography.sizes.sm,
    color: colors.surface,
  },
  thumbnailPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  thumbnailPlaceholderText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  thumbnailSlider: {
    width: '100%',
  },
  frameRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  frameRateInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  frameRateSlider: {
    flex: 2,
  },
  speedSummary: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  speedSummaryTitle: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  speedSummarySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  speedSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  speedSummaryButtonDisabled: {
    backgroundColor: colors.border,
  },
  speedSummaryButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalList: {
    maxHeight: 360,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalRowSelected: {
    backgroundColor: colors.surfaceMuted,
  },
  modalRowIcon: {
    width: 32,
    alignItems: 'center',
  },
  modalRowContent: {
    flex: 1,
  },
  modalRowTitle: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  modalRowSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  editorSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editorTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  editorTopButton: {
    padding: spacing.xs,
  },
  editorTopTitle: {
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  editorScroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  editorVideoPreview: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  editorVideo: {
    height: 240,
  },
  editorVideoOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  editorVideoOverlayText: {
    fontSize: typography.sizes.sm,
    color: colors.surface,
  },
  editorHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
});
