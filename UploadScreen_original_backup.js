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
  const [trick, setTrick] = useState('');
  const [privacy, setPrivacy] = useState(PRIVACY_OPTIONS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  const [parks, setParks] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [selectedObstacle, setSelectedObstacle] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('Aguardando seleção de vídeo');

  const [showParkModal, setShowParkModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const editorVideoRef = useRef(null);
  const editorReadyRef = useRef(false);
  const trimConfigRef = useRef({
    start: 0,
    end: 0,
    slowFactor: 1,
  });
  const hasSlowMotion =
    slowMotionFactor !== 1 && slowMotionEnd - slowMotionStart >= MIN_TRIM_DURATION;
  const slowMotionDuration = Math.max(0, slowMotionEnd - slowMotionStart);

  const normalizedDuration = useMemo(() => {
    if (!videoPreview?.duration) return videoDuration;
    const raw = videoPreview.duration;
    return raw > 600 ? raw / 1000 : raw;
  }, [videoPreview, videoDuration]);

  const clampedTrimStart = Math.min(trimStart, Math.max(0, trimEnd - MIN_TRIM_DURATION));
  const clampedTrimEnd = Math.max(trimEnd, clampedTrimStart + MIN_TRIM_DURATION);
  const clampedSlowStart = Math.min(
    Math.max(slowMotionStart, clampedTrimStart),
    Math.max(clampedTrimStart, clampedTrimEnd - MIN_TRIM_DURATION)
  );
  const clampedSlowEnd = Math.max(
    Math.min(slowMotionEnd, clampedTrimEnd),
    clampedSlowStart + MIN_TRIM_DURATION
  );
  useEffect(() => {
    if (clampedTrimStart !== trimStart) {
      setTrimStart(clampedTrimStart);
    }
    if (clampedTrimEnd !== trimEnd) {
      setTrimEnd(clampedTrimEnd);
    }
  }, [clampedTrimStart, clampedTrimEnd]);

  useEffect(() => {
    if (thumbnailTime < trimStart) {
      setThumbnailTime(trimStart);
    } else if (thumbnailTime > trimEnd) {
      setThumbnailTime(trimEnd);
    }
  }, [trimStart, trimEnd]);

  useEffect(() => {
    if (clampedSlowStart !== slowMotionStart) {
      setSlowMotionStart(clampedSlowStart);
    }
    if (clampedSlowEnd !== slowMotionEnd) {
      setSlowMotionEnd(clampedSlowEnd);
    }
  }, [clampedSlowStart, clampedSlowEnd]);

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
  const handleEditorStatusUpdate = useCallback(
    (status) => {
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
    },
    []
  );
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
        console.warn('Erro ao pausar preview ao fechar editor:', error);
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

    if (presetChallenge.trick) {
      setTrick(presetChallenge.trick);
    }
    if (presetChallenge.parkId) {
      setSelectedPark(presetChallenge.parkId);
    }
    if (presetChallenge.obstacleId) {
      setSelectedObstacle(presetChallenge.obstacleId);
    }
    if (presetChallenge.difficulty) {
      const difficultyId = DIFFICULTY_LABEL_TO_ID[presetChallenge.difficulty] ?? null;
      setSelectedDifficulty(difficultyId);
    }
    if (presetChallenge.challengeId) {
      setSelectedChallengeId(presetChallenge.challengeId);
    }

    setUploadStatus('Trick aplicada! Agora escolha um vídeo da galeria.');
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
  const handleVideoSelection = async () => {
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
        const defaultSlowEnd = Math.min(
          safeDuration,
          defaultSlowStart + Math.max(2, safeDuration * 0.3)
        );
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
  };

  const handleRemoveVideo = () => {
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
  };

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

  const handleSelectDifficulty = (optionId) => {
    if (isUploading) return;
    setSelectedDifficulty((prev) => (prev === optionId ? null : optionId));
  };

  const handleSelectPrivacy = (optionId) => {
    if (isUploading) return;
    setPrivacy(optionId);
  };

  const handleSubmit = async () => {
    if (isUploading) return;

    if (!videoPreview) {
      Alert.alert('Atenção', 'Selecione um vídeo da galeria antes de postar.');
      return;
    }

    if (!trick.trim()) {
      Alert.alert('Atenção', 'Informe a trick executada no vídeo.');
      return;
    }

    if (!selectedPark) {
      Alert.alert('Atenção', 'Escolha o parque onde a sessão foi gravada.');
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
        description: trick.trim(),
        parkId: selectedPark,
        obstacleId: selectedObstacle,
        visibility: privacy,
        challengeId: selectedChallengeId,
        trimStart: activeTrimStart,
        trimEnd: activeTrimEnd,
        thumbnailTime: thumbnailTime,
        targetFrameRate: sanitizedFrameRate,
        slowMotionFactor: effectiveFactor,
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

      setVideoPreview(null);
      setVideoInfo(null);
      setTrick('');
      setSelectedObstacle(null);
      setSelectedDifficulty(null);
      setSelectedChallengeId(null);
      setUploadStatus('Vídeo enviado! Continue criando.');

      const compressionSavings = Number(uploadResult?.data?.video?.compression_savings ?? 0);
      const completionMessage =
        compressionSavings > 0
          ? `Vídeo enviado e comprimido em ${compressionSavings}% — mais rápido para carregar e salvar espaço.`
          : 'Vídeo enviado com sucesso. Nenhuma compressão adicional foi aplicada (o arquivo já estava otimizado ou o serviço de compressão estava indisponível).';

      Alert.alert('Processamento concluído', completionMessage);
    } catch (error) {
      console.error('Erro no upload:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível completar o upload.');
      setUploadStatus('Erro ao enviar. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

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
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {parks.map((park) => {
              const isSelected = selectedPark === park.id;
              return (
                <TouchableOpacity
                  key={park.id}
                  style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedPark(park.id);
                    setSelectedObstacle(null);
                    setShowParkModal(false);
                  }}
                >
                  <View style={styles.modalRowIcon}>
                    <Icon name="place" size={18} color={colors.primary} />
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
                    <Icon name="check-circle" size={18} color={colors.primary} />
                  ) : (
                    <Icon name="chevron-right" size={18} color={colors.textSecondary} />
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
      onRequestClose={handleCloseEditor}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.editorSafeArea}>
        <View
          style={[
            styles.editorTopBar,
            { paddingTop: safeInsets.top + spacing.md },
          ]}
        >
          <TouchableOpacity style={styles.editorTopButton} onPress={handleCloseEditor}>
            <Icon name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.editorTopTitle}>Editor de vídeo</Text>
          <TouchableOpacity style={styles.editorTopButton} onPress={handleCloseEditor}>
            <Icon name="check" size={22} color={colors.primary} />
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
                style={styles.editorVideoImage}
                source={{ uri: videoPreview.uri }}
                resizeMode="contain"
                shouldPlay={showEditorModal}
                useNativeControls
                onLoad={handleEditorLoad}
                onPlaybackStatusUpdate={handleEditorStatusUpdate}
              />
            ) : (
              <ImageBackground
                source={previewPlaceholder}
                style={styles.editorVideoImage}
                imageStyle={styles.editorVideoImage}
              />
            )}
            <View style={styles.editorVideoOverlay}>
              <Icon name="movie" size={26} color={colors.surface} />
              <Text style={styles.editorVideoDuration}>
                {formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}
              </Text>
            </View>
          </View>
          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <Icon name="content-cut" size={18} color={colors.primary} />
              <Text style={styles.editorTitle}>Corte seu vídeo</Text>
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
              />
            </View>
            <View style={styles.trimSummary}>
              <Icon name="timelapse" size={16} color={colors.textSecondary} />
              <Text style={styles.trimSummaryText}>
                Duração final: {formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}
              </Text>
            </View>
          </View>
          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <Icon name="photo" size={18} color={colors.primary} />
              <Text style={styles.editorTitle}>Thumbnail personalizada</Text>
            </View>
            <View style={styles.thumbnailPreviewArea}>
              {thumbnailPreview ? (
                <ImageBackground
                  source={{ uri: thumbnailPreview }}
                  style={styles.thumbnailImage}
                  imageStyle={styles.thumbnailImage}
                  <View style={styles.thumbnailOverlay}>
                    <Icon name="collections" size={20} color={colors.surface} />
                    <Text style={styles.thumbnailOverlayText}>
                      {formatTimestamp(thumbnailTime)}
                    </Text>
                </ImageBackground>
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Icon name="image" size={28} color={colors.textSecondary} />
                  <Text style={styles.thumbnailPlaceholderText}>Thumbnail indisponível</Text>
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
              disabled={isGeneratingThumbnail}
              variant="secondary"
          </View>

          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <Icon name="slow-motion-video" size={18} color={colors.primary} />
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

            <View style={styles.frameRateRow}>
              <View style={styles.frameRateInfo}>
                <Text style={styles.trimLabel}>Fator de slow motion</Text>
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
                onValueChange={(value) => setSlowMotionFactor(Number(value.toFixed(2)))}
            <Text style={styles.frameRateHint}>
              {`O vídeo será processado para ${targetFrameRate} fps. Aplicar slow motion aumenta a duração final proporcionalmente ao fator escolhido (duração estimada: ${formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}).`}
            </Text>
          </View>

          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <Icon name="schedule" size={18} color={colors.primary} />
              <Text style={styles.editorTitle}>Segmento em slow motion</Text>
            </View>

            <View style={styles.frameRateRow}>
              <View style={styles.frameRateInfo}>
                <Text style={styles.trimLabel}>Início do slow</Text>
                <Text style={styles.trimValue}>{formatTimestamp(slowMotionStart)}</Text>
              </View>
              <Slider
                style={styles.frameRateSlider}
                minimumValue={trimStart}
                maximumValue={trimEnd - MIN_TRIM_DURATION}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.surfaceMuted}
                thumbTintColor={colors.primary}
                step={1}
                value={slowMotionStart}
                onValueChange={(value) =>
                  setSlowMotionStart(Math.min(value, slowMotionEnd - MIN_TRIM_DURATION))
                }
              />
            <View style={styles.frameRateRow}>
              <View style={styles.frameRateInfo}>
                <Text style={styles.trimLabel}>Fim do slow</Text>
                <Text style={styles.trimValue}>{formatTimestamp(slowMotionEnd)}</Text>
              </View>
              <Slider
                style={styles.frameRateSlider}
                minimumValue={trimStart + MIN_TRIM_DURATION}
                maximumValue={trimEnd}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.surfaceMuted}
                thumbTintColor={colors.primary}
                step={1}
                value={slowMotionEnd}
                onValueChange={(value) =>
                  setSlowMotionEnd(Math.max(value, slowMotionStart + MIN_TRIM_DURATION))
                }
            <View
              style={[
                styles.speedSummaryCard,
                hasSlowMotion ? styles.speedSummaryCardActive : styles.speedSummaryCardMuted,
              ]}
            >
              <View style={styles.speedSummaryInfo}>
                <Text style={styles.speedSummaryTitle}>
                  {hasSlowMotion ? 'Slow motion ativo' : 'Nenhum slow motion aplicado'}
                </Text>
                {hasSlowMotion ? (
                  <>
                    <Text style={styles.speedSummarySubtitle}>
                      {formatTimestamp(slowMotionStart)} → {formatTimestamp(slowMotionEnd)} (
                      {formatTimestamp(slowMotionDuration)})
                    </Text>
                    <View style={styles.speedSummaryPill}>
                      <Text style={styles.speedSummaryPillText}>
                        {slowMotionFactor.toFixed(2)}x
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.speedSummarySubtitle}>
                    Ajuste os controles acima para adicionar um trecho em slow motion.
                )}
              <TouchableOpacity
                onPress={handleResetSlowMotion}
                disabled={!hasSlowMotion}
                style={[
                  styles.speedSummaryButton,
                  !hasSlowMotion && styles.speedSummaryButtonDisabled,
                ]}
              >
                <Icon name="restart-alt" size={18} color={colors.textPrimary} />
                <Text style={styles.speedSummaryButtonText}>Resetar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <YupBadge variant="primary" style={styles.headerBadge}>
            Upload Session
          </YupBadge>
          <Text style={styles.headerTitle}>Compartilhe sua próxima session</Text>
          <Text style={styles.headerSubtitle}>
            Envie seu vídeo, marque o parque e ganhe XP extra com desafios semanais.
          </Text>
        </View>
        <YupCard style={styles.videoCard}>
          <View style={styles.videoPreview}>
            <ImageBackground
              source={videoPreview?.uri ? { uri: videoPreview.uri } : previewPlaceholder}
              style={styles.previewBackground}
              imageStyle={styles.previewImage}
            >
              <View style={styles.previewGradient} />
              <View style={styles.previewOverlay}>
                <Icon name="motion-photos-on" size={28} color={colors.textPrimary} />
                <Text style={styles.previewLabel}>
                  {videoPreview ? 'Vídeo pronto para upload' : 'Selecione um vídeo da galeria'}
                </Text>
                <Text style={styles.previewStatus}>{uploadStatus}</Text>
            </ImageBackground>
          </View>
          <View style={styles.videoButtons}>
            <YupButton
              title="Escolher mídia"
              onPress={handleVideoSelection}
              icon={<Icon name="photo-library" size={20} color={colors.textPrimary} />}
            />
          </View>
          {videoInfo ? (
            <View style={styles.videoMeta}>
              <View style={styles.metaItem}>
                <Icon name="high-quality" size={18} color={colors.primary} />
                <Text style={styles.metaText}>{Math.round(videoDuration)}s</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="sd-card" size={18} color={colors.primary} />
                <Text style={styles.metaText}>
                  {(videoInfo.sizeMB ?? 0).toFixed(1)} MB
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="movie" size={18} color={colors.primary} />
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
          ) : null}

          {videoPreview ? (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveVideo}>
              <Icon name="delete-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.removeButtonText}>Remover vídeo</Text>
            </TouchableOpacity>
          ) : null}
        </YupCard>

        {videoPreview ? (
          <YupCard style={styles.editorCard}>
            <YupSectionHeader
              title="Editor rápido"
              subtitle="Ajuste o início e fim do vídeo, escolha a thumbnail e configure slow motion."
            />

            <View style={styles.editorSection}>
              <View style={styles.editorHeader}>
              <Icon name="content-cut" size={18} color={colors.primary} />
                <Text style={styles.editorTitle}>Corte seu vídeo</Text>
              </View>
              <View style={styles.trimRow}>
                <View style={styles.trimTime}>
                  <Text style={styles.trimLabel}>Início</Text>
                  <Text style={styles.trimValue}>{formatTimestamp(trimStart)}</Text>
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
                <Icon name="timelapse" size={16} color={colors.textSecondary} />
                <Text style={styles.trimSummaryText}>
                  Duração final: {formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}
            <View style={styles.editorSection}>



            </View>

            <View style={styles.editorSection}>
              <View style={styles.editorHeader}>
                <Icon name="slow-motion-video" size={18} color={colors.primary} />
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
                  <Text style={styles.trimLabel}>Fator de slow motion</Text>
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
                  onValueChange={(value) => setSlowMotionFactor(Number(value.toFixed(2)))}
                />
              </View>

              <Text style={styles.frameRateHint}>
                {`O vídeo será processado para ${targetFrameRate} fps. Aplicar slow motion aumenta a duração final proporcionalmente ao fator escolhido (duração estimada: ${formatTimestamp((trimEnd - trimStart) * slowMotionFactor)}).`}
              </Text>
          </YupCard>
        <YupCard style={styles.formCard}>
              onChangeText={setTrick}
            </View>
          <YupButton
            title={isUploading ? 'Enviando...' : 'Publicar vídeo'}
            onPress={handleSubmit}
            isLoading={isUploading}
            disabled={isUploading}
          />
        </YupCard>
        <YupCard style={styles.xpCard}>
          <View style={styles.xpIcon}>
