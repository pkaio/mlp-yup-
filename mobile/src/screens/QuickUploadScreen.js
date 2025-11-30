import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import YupBadge from '../components/ui/YupBadge';
import YupButton from '../components/ui/YupButton';
import YupCard from '../components/ui/YupCard';
import YupSectionHeader from '../components/ui/YupSectionHeader';
import uploadService from '../services/uploadService';
import { videoService } from '../services/videoService';
import { parkService } from '../services/parkService';
const Icon = MaterialIcons;

const previewPlaceholder = require('../../assets/splash.png');

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Público', icon: 'public' },
  { id: 'friends', label: 'Amigos', icon: 'groups' },
  { id: 'private', label: 'Privado', icon: 'lock' },
];

/**
 * QuickUploadScreen - Simplified upload flow for BEGINNER users
 *
 * Features:
 * - Single-screen upload (no wizard)
 * - Pre-filled challenge configuration
 * - No advanced editing (uses defaults)
 * - Essential fields only: video + privacy
 */
export default function QuickUploadScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const presetChallenge = route.params?.presetChallenge;
  const onUploadSuccess = route.params?.onUploadSuccess;

  const [videoPreview, setVideoPreview] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [privacy, setPrivacy] = useState(PRIVACY_OPTIONS[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('Toque no botão abaixo para escolher um vídeo');
  const [selectedPark, setSelectedPark] = useState(presetChallenge?.parkId || null);
  const [selectedObstacle, setSelectedObstacle] = useState(presetChallenge?.obstacleId || null);
  const [maneuverDisplayName, setManeuverDisplayName] = useState(presetChallenge?.maneuverName || '');
  const [parks, setParks] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState(null);
  const locationSelectorVisible = !presetChallenge?.parkId || !presetChallenge?.obstacleId;

  const locationReady = Boolean(selectedPark && selectedObstacle);
  const selectedParkData = useMemo(() => {
    if (!selectedPark) return null;
    const match = parks.find((park) => park.id === selectedPark);
    if (match) return match;
    if (presetChallenge?.parkId === selectedPark && presetChallenge?.parkName) {
      return { id: selectedPark, name: presetChallenge.parkName };
    }
    return null;
  }, [parks, selectedPark, presetChallenge?.parkId, presetChallenge?.parkName]);

  const filteredObstacles = useMemo(() => {
    if (!selectedPark) return obstacles;
    return obstacles.filter((obstacle) => {
      const obstacleParkId = obstacle.park_id || obstacle.parkId || obstacle.parkID;
      if (!obstacleParkId) return false;
      return String(obstacleParkId) === String(selectedPark);
    });
  }, [obstacles, selectedPark]);

  const locationNoteText = locationReady
    ? 'Parque, obstáculo e manobra já estão configurados automaticamente.'
    : 'Selecione o parque e o obstáculo antes de enviar este desafio.';
  const parkDisplayName = selectedParkData?.name || presetChallenge?.parkName || null;

  useEffect(() => {
    if (!presetChallenge) {
      Alert.alert(
        'Desafio não encontrado',
        'Esta tela requer um desafio pré-configurado. Por favor, selecione um desafio na tela de Achievements.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    if (!presetChallenge?.maneuverPayload) {
      Alert.alert(
        'Manobra ausente',
        'O desafio selecionado não está associado ao novo sistema de XP. Atualize a manobra no dashboard antes de fazer o upload.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [presetChallenge, navigation]);

  useEffect(() => {
    setSelectedPark(presetChallenge?.parkId || null);
    setSelectedObstacle(presetChallenge?.obstacleId || null);
  }, [presetChallenge?.parkId, presetChallenge?.obstacleId]);

  useEffect(() => {
    let isMounted = true;
    if (!presetChallenge) return;
    if (presetChallenge.parkId && presetChallenge.obstacleId) {
      return;
    }

    const loadLocations = async () => {
      try {
        setLocationsLoading(true);
        setLocationsError(null);
        const [parksResponse, obstaclesResponse] = await Promise.all([
          parkService.getParks(),
          parkService.getObstacles(),
        ]);

        if (!isMounted) return;

        setParks(parksResponse?.parks ?? []);
        const normalizedObstacles = (obstaclesResponse?.obstacles ?? []).map((obstacle) => {
          const parkId = obstacle.park_id || obstacle.parkId || obstacle.parkID || obstacle.park;
          return {
            ...obstacle,
            id: obstacle.id || obstacle.obstacle_id,
            park_id: parkId || null,
          };
        });
        setObstacles(normalizedObstacles);
      } catch (error) {
        if (isMounted) {
          setLocationsError(error?.message || 'Não foi possível carregar parques e obstáculos.');
        }
      } finally {
        if (isMounted) {
          setLocationsLoading(false);
        }
      }
    };

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, [presetChallenge]);

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
          setUploadStatus('Toque no botão abaixo para escolher um vídeo');
          return;
        }

        setVideoPreview(preparation.videoFile ?? video);
        setVideoInfo(preparation);
        setUploadProgress(0);
        setUploadStatus('Vídeo selecionado! Pronto para postar.');

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
      setUploadStatus('Toque no botão abaixo para escolher um vídeo');
    }
  }, []);

  const handleRemoveVideo = useCallback(() => {
    setVideoPreview(null);
    setVideoInfo(null);
    setUploadProgress(0);
    setUploadStatus('Toque no botão abaixo para escolher um vídeo');
  }, []);

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

    if (!presetChallenge) {
      Alert.alert('Erro', 'Desafio não encontrado. Por favor, volte e selecione novamente.');
      return;
    }

    if (!presetChallenge?.maneuverType || !presetChallenge?.maneuverName || !presetChallenge?.maneuverPayload) {
      Alert.alert(
        'Configuração incompleta',
        'Este desafio não possui informações suficientes da manobra. Atualize os desafios e tente novamente ou escolha outro.'
      );
      return;
    }

    if (!selectedPark || !selectedObstacle) {
      Alert.alert(
        'Local obrigatório',
        'Selecione o parque e o obstáculo do desafio antes de publicar o vídeo.'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparando upload...');

    try {
      // Use defaults for quick upload (no trimming, no slow-motion, standard frame rate)
      const videoData = {
        videoFile: videoPreview,
        parkId: selectedPark,
        obstacleId: selectedObstacle,
        visibility: privacy,
        challengeId: presetChallenge.challengeId,
        trimStart: 0,
        trimEnd: videoInfo?.duration ? videoInfo.duration / 1000 : 60,
        thumbnailTime: 0,
        targetFrameRate: 30,
        slowMotionFactor: 1,
        maneuverType: presetChallenge.maneuverType,
        maneuverName: presetChallenge.maneuverName,
        maneuverDisplayName: maneuverDisplayName?.trim() || presetChallenge.maneuverName,
        trickShortName: maneuverDisplayName?.trim() || presetChallenge.maneuverName,
        maneuverPayload: presetChallenge.maneuverPayload,
        questNodeId: presetChallenge.questNodeId || null,
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

      try {
        onUploadSuccess?.();
      } catch (callbackError) {
        console.warn('Erro ao atualizar estado pós-upload:', callbackError);
      }

      setVideoPreview(null);
      setVideoInfo(null);
      setUploadStatus(
        serverProcessing
          ? 'Vídeo enviado! Processando na nuvem...'
          : 'Vídeo enviado! Continue criando.'
      );

      const compressionSavings = Number(uploadResult?.data?.video?.compression_savings ?? 0);
      const completionMessage = serverProcessing
        ? 'Vídeo enviado! Estamos processando e você receberá atualizações em instantes.'
        : compressionSavings > 0
            ? `Vídeo enviado! Comprimido em ${compressionSavings}% para carregar mais rápido.`
            : 'Vídeo enviado com sucesso!';
      const warningNote = uploadResult?.warning ? `\nDetalhes: ${uploadResult.warning}` : '';

      Alert.alert('Sucesso!', `${completionMessage}${warningNote}`, [
        { text: 'Ver no feed', onPress: () => navigation.navigate('Discover') },
        { text: 'Fazer outro', onPress: () => setUploadStatus('Toque no botão abaixo para escolher um vídeo') },
      ]);
    } catch (error) {
      console.error('Erro no upload:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível completar o upload.');
      setUploadStatus('Erro ao enviar. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, videoPreview, videoInfo, privacy, presetChallenge, navigation, selectedPark, selectedObstacle]);

  if (!presetChallenge) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <YupBadge variant="primary" style={styles.headerBadge}>
              Upload Rápido
            </YupBadge>
            <Text style={styles.headerTitle}>Registrar Trick</Text>
            <Text style={styles.headerSubtitle}>
              Desafio pré-configurado. Só escolha o vídeo e poste!
            </Text>
          </View>
        </View>

        {/* Challenge Preview */}
        <YupCard style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <MaterialIcons name="emoji-events" size={20} color={colors.primary} />
            <Text style={styles.challengeHeaderText}>Desafio Selecionado</Text>
          </View>
          <Text style={styles.challengeName}>{presetChallenge.maneuverName}</Text>
          {(presetChallenge.difficulty || parkDisplayName) && (
            <View style={styles.challengeMeta}>
              {presetChallenge.difficulty ? (
                <YupBadge variant="neutral" style={styles.challengeBadge}>
                  {presetChallenge.difficulty}
                </YupBadge>
              ) : null}
              {parkDisplayName && (
                <View style={styles.challengeLocation}>
                  <MaterialIcons name="place" size={14} color={colors.textSecondary} />
                  <Text style={styles.challengeLocationText}>{parkDisplayName}</Text>
                </View>
              )}
            </View>
          )}
          <View style={[styles.challengeNote, !locationReady && styles.challengeNoteWarning]}>
            <MaterialIcons
              name={locationReady ? 'info-outline' : 'warning-amber'}
              size={16}
              color={locationReady ? colors.primary : colors.warning}
            />
            <Text
              style={[
                styles.challengeNoteText,
                !locationReady && styles.challengeNoteWarningText,
              ]}
            >
              {locationNoteText}
            </Text>
          </View>
        </YupCard>

        <YupCard style={styles.nameCard}>
          <YupSectionHeader
            title="Nome de exibição"
            subtitle="Esse nome curto aparece no feed e pode ser ajustado."
          />
          <YupInput
            label="Nome curto"
            placeholder="Ex.: Backroll Indy"
            value={maneuverDisplayName}
            onChangeText={setManeuverDisplayName}
            autoCapitalize="words"
          />
        </YupCard>

        {locationSelectorVisible && (
          <YupCard style={styles.locationCard}>
            <YupSectionHeader
              title="Confirme o local"
              subtitle="Selecione o parque e o obstáculo onde essa manobra foi executada."
            />

            <View style={styles.locationField}>
              <Text style={styles.locationLabel}>Parque</Text>
              {locationsLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.locationLoading} />
              ) : (
                <>
                  <View style={styles.locationChips}>
                    {parks.map((park) => {
                      const isActive = selectedPark === park.id;
                      return (
                        <TouchableOpacity
                          key={park.id}
                          style={[styles.locationChip, isActive && styles.locationChipActive]}
                          onPress={() => {
                            setSelectedPark((prev) => {
                              if (prev !== park.id) {
                                setSelectedObstacle(null);
                              }
                              return park.id;
                            });
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.locationChipText,
                              isActive && styles.locationChipTextActive,
                            ]}
                          >
                            {park.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {parks.length === 0 && !locationsLoading ? (
                    <Text style={styles.locationEmptyText}>
                      Nenhum parque disponível. Atualize e tente novamente.
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.locationField}>
              <Text style={styles.locationLabel}>Obstáculo</Text>
              {selectedPark ? (
                locationsLoading ? (
                  <ActivityIndicator color={colors.primary} style={styles.locationLoading} />
                ) : filteredObstacles.length > 0 ? (
                  <View style={styles.locationChips}>
                    {filteredObstacles.map((obstacle) => {
                      const rawId = obstacle.id || obstacle.obstacle_id;
                      const obstacleId = rawId ? String(rawId) : '';
                      if (!obstacleId) {
                        return null;
                      }
                      const isActive = selectedObstacle === obstacleId;
                      const fallbackLabel = obstacleId
                        ? `Obstáculo ${obstacleId.slice(0, 4)}`
                        : 'Obstáculo';
                      return (
                        <TouchableOpacity
                          key={obstacleId || obstacle.name}
                          style={[styles.locationChip, isActive && styles.locationChipActive]}
                          onPress={() => setSelectedObstacle(obstacleId)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.locationChipText,
                              isActive && styles.locationChipTextActive,
                            ]}
                          >
                            {obstacle.name || fallbackLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.locationEmptyText}>
                    Nenhum obstáculo cadastrado para este parque.
                  </Text>
                )
              ) : (
                <Text style={styles.locationHelper}>
                  Escolha um parque para listar os obstáculos disponíveis.
                </Text>
              )}
            </View>

            {locationsError ? (
              <Text style={styles.locationError}>{locationsError}</Text>
            ) : null}
          </YupCard>
        )}

        {/* Video Selection */}
        <YupCard style={styles.videoCard}>
          <YupSectionHeader
            title="Seu vídeo"
            subtitle="Escolha o vídeo da galeria que mostra você completando este desafio."
          />

          <TouchableOpacity
            style={styles.videoPreview}
            activeOpacity={videoPreview ? 0.9 : 1}
            onPress={videoPreview ? null : handleVideoSelection}
          >
            <ImageBackground
              source={videoPreview?.uri ? { uri: videoPreview.uri } : previewPlaceholder}
              style={styles.previewBackground}
              imageStyle={styles.previewImage}
            >
              <View style={styles.previewOverlay}>
                <Icon
                  name={videoPreview ? 'movie' : 'photo-library'}
                  size={32}
                  color={colors.textPrimary}
                />
                <Text style={styles.previewLabel}>
                  {videoPreview ? 'Vídeo selecionado' : 'Selecione um vídeo'}
                </Text>
                <Text style={styles.previewStatus}>{uploadStatus}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <View style={styles.videoActions}>
            <YupButton
              title="Escolher vídeo"
              onPress={handleVideoSelection}
              icon={<MaterialIcons name="upload" size={18} color={colors.textPrimary} />}
              disabled={isUploading}
            />
          </View>

          {videoInfo && (
            <View style={styles.videoMeta}>
              <View style={styles.metaItem}>
                <MaterialIcons name="schedule" size={16} color={colors.primary} />
                <Text style={styles.metaText}>
                  {Math.round((videoInfo.duration || 0) / 1000)}s
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="sd-card" size={16} color={colors.primary} />
                <Text style={styles.metaText}>{(videoInfo.sizeMB ?? 0).toFixed(1)} MB</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="high-quality" size={16} color={colors.primary} />
                <Text style={styles.metaText}>{videoInfo.resolution ?? '1080p'}</Text>
              </View>
            </View>
          )}

          {isUploading && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(uploadProgress * 100, 6)}%` },
                ]}
              />
            </View>
          )}

          {videoPreview && !isUploading && (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveVideo}>
              <MaterialIcons name="delete-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.removeButtonText}>Remover vídeo</Text>
            </TouchableOpacity>
          )}
        </YupCard>

        {/* Privacy Settings */}
        <YupCard style={styles.privacyCard}>
          <YupSectionHeader
            title="Privacidade"
            subtitle="Escolha quem pode ver seu vídeo."
          />
          <View style={styles.privacyOptions}>
            {PRIVACY_OPTIONS.map((option) => {
              const isActive = privacy === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.privacyOption, isActive && styles.privacyOptionActive]}
                  onPress={() => handleSelectPrivacy(option.id)}
                  activeOpacity={0.85}
                  disabled={isUploading}
                >
                  <Icon
                    name={option.icon}
                    size={20}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.privacyText, isActive && styles.privacyTextActive]}>
                    {option.label}
                  </Text>
                  {isActive && <MaterialIcons name="check-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </YupCard>

        {/* Submit Button */}
        <YupButton
          title={isUploading ? 'Enviando...' : 'Publicar vídeo'}
          onPress={handleSubmit}
          isLoading={isUploading}
          disabled={isUploading || !videoPreview || !locationReady}
          style={styles.submitButton}
        />

        {/* Help Text */}
        <View style={styles.helpCard}>
          <MaterialIcons name="lightbulb-outline" size={20} color={colors.accent} />
          <Text style={styles.helpText}>
            Dica: Se você quiser editar o vídeo (cortar, adicionar slow-motion, etc.), use a opção
            "Upload Manual" na aba Upload.
          </Text>
        </View>
      </ScrollView>
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
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
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
  },
  challengeCard: {
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  challengeHeaderText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weights.semibold,
  },
  challengeName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: typography.sizes.xl * typography.lineHeights.relaxed,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  challengeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  challengeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  challengeLocationText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  challengeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryOutline,
  },
  challengeNoteText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  challengeNoteWarning: {
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderColor: colors.warning,
  },
  challengeNoteWarningText: {
    color: colors.warning,
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    resizeMode: 'cover',
  },
  previewOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  previewStatus: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  videoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  privacyCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyOptions: {
    gap: spacing.sm,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  privacyOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  nameCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  privacyTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
  },
  locationCard: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationField: {
    gap: spacing.sm,
  },
  locationLabel: {
    fontSize: typography.sizes.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  locationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  locationChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.16)',
  },
  locationChipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  locationChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  locationHelper: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
  },
  locationEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
  },
  locationError: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
  },
  locationLoading: {
    marginVertical: spacing.sm,
  },
});
