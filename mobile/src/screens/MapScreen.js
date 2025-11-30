import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator, Image, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { parkService } from '../services/parkService';
import { videoService } from '../services/videoService';
import { colors, radii, spacing, typography } from '../theme/tokens';
const Icon = MaterialIcons;

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [parks, setParks] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [obstaclesByPark, setObstaclesByPark] = useState({});
  const [obstaclesLoadingParkId, setObstaclesLoadingParkId] = useState(null);
  const [visibleObstaclesParkId, setVisibleObstaclesParkId] = useState(null);
  const [activeObstacle, setActiveObstacle] = useState(null);
  const [obstacleModalVisible, setObstacleModalVisible] = useState(false);
  const [obstacleVideos, setObstacleVideos] = useState([]);
  const [obstacleVideosLoading, setObstacleVideosLoading] = useState(false);
  const [obstacleLoadingMore, setObstacleLoadingMore] = useState(false);
  const [obstacleVideosError, setObstacleVideosError] = useState(null);
  const [obstacleVideosPage, setObstacleVideosPage] = useState(1);
  const [obstacleHasMore, setObstacleHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyParks, setNearbyParks] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);
  const [showNearbyWidget, setShowNearbyWidget] = useState(true);
  const [region, setRegion] = useState({
    latitude: -23.1019, // Naga Cable Park
    longitude: -47.1863,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const topInsetPadding = insets.top + spacing['lg'];
  const bottomInsetPadding = insets.bottom + spacing['lg'];
  const horizontalInsetPadding = Math.max(
    spacing['xl'],
    Math.max(insets.left, insets.right),
  );

const computeRegionForPark = (park, obstaclesList) => {
    const parkLat = parseFloat(park?.latitude);
    const parkLng = parseFloat(park?.longitude);

    const coords = (obstaclesList || [])
      .map((obstacle) => ({
        lat: parseFloat(obstacle.latitude),
        lng: parseFloat(obstacle.longitude),
      }))
      .filter(
        (coord) => !Number.isNaN(coord.lat) && !Number.isNaN(coord.lng),
      );

    if (!Number.isNaN(parkLat) && !Number.isNaN(parkLng)) {
      coords.push({ lat: parkLat, lng: parkLng });
    }

    if (coords.length === 0) {
      return { ...region };
    }

    let minLat = coords[0].lat;
    let maxLat = coords[0].lat;
    let minLng = coords[0].lng;
    let maxLng = coords[0].lng;

    coords.forEach(({ lat, lng }) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max((maxLat - minLat) * 1.6, 0.03);
    const longitudeDelta = Math.max((maxLng - minLng) * 1.6, 0.03);

    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };
};

const getObstacleColor = (level) => {
    const difficulty = Number(level);
    switch (difficulty) {
      case 1:
        return '#38BDF8';
      case 2:
        return '#34D399';
      case 3:
        return '#FBBF24';
      case 4:
        return '#F97316';
      case 5:
        return '#EF4444';
      default:
        return colors.primary;
    }
};

const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d atrás`;
    return date.toLocaleDateString('pt-BR');
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

  useEffect(() => {
    loadParks();
    getCurrentLocation();
  }, []);


  const loadParks = async () => {
    try {
      const response = await parkService.getParks();
      setParks(response.parks || []);
    } catch (error) {
      console.error('Erro ao carregar parques:', error);
      Alert.alert('Erro', 'Não foi possível carregar os parques');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua localização');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
      setUserLocation(coords);
      fetchNearbyParks(coords.latitude, coords.longitude);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  };

  const handleParkPress = (park) => {
    setSelectedPark(park);
    setObstacleModalVisible(false);
    setActiveObstacle(null);
    setModalVisible(true);
  };

  const handleNavigateToPark = (park) => {
    setModalVisible(false);
    // In a real app, this would open the default map app with directions
    Alert.alert('Navegação', `Abrindo rota para ${park.name}`);
  };

  const handleCheckin = async (park) => {
    try {
      const result = await parkService.checkin(park.id);
      if (result.error) {
        Alert.alert('Erro', result.error);
      } else {
        Alert.alert('Sucesso', 'Check-in realizado com sucesso!');
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Erro ao fazer check-in:', error);
      Alert.alert('Erro', 'Não foi possível fazer check-in');
    }
  };

  const toggleObstaclesForPark = async (park) => {
    if (!park) return;

    if (visibleObstaclesParkId === park.id) {
      setVisibleObstaclesParkId(null);
      setObstaclesLoadingParkId(null);
      setActiveObstacle(null);
      setObstacleModalVisible(false);
      return;
    }

    setSelectedPark(park);
    setActiveObstacle(null);
    setObstacleModalVisible(false);

    let obstaclesToFocus = obstaclesByPark[park.id];

    if (!obstaclesToFocus) {
      try {
        setObstaclesLoadingParkId(park.id);
        const response = await parkService.getParkObstacles(park.id);
        obstaclesToFocus = response.obstacles || [];
        setObstaclesByPark((previous) => ({
          ...previous,
          [park.id]: obstaclesToFocus,
        }));
      } catch (error) {
        console.error('Erro ao carregar obstáculos:', error);
        Alert.alert('Erro', 'Não foi possível carregar os obstáculos do parque');
        setObstaclesLoadingParkId(null);
        return;
      }
    }

    setObstaclesLoadingParkId(null);

    const nextRegion = computeRegionForPark(park, obstaclesToFocus || []);
    setRegion(nextRegion);

    setVisibleObstaclesParkId(park.id);
    setModalVisible(false);
  };

  const currentObstacles = visibleObstaclesParkId
    ? obstaclesByPark[visibleObstaclesParkId] || []
    : [];
  const selectedParkObstacles = selectedPark
    ? obstaclesByPark[selectedPark.id] || []
    : [];
  const isShowingSelectedObstacles =
    !!selectedPark && visibleObstaclesParkId === selectedPark.id;
  const isLoadingSelectedObstacles =
    !!selectedPark && obstaclesLoadingParkId === selectedPark.id;
  const isShowingAnyObstacles = visibleObstaclesParkId !== null;
  const activeObstaclePark =
    visibleObstaclesParkId
      ? parks.find((park) => park.id === visibleObstaclesParkId) || selectedPark
      : null;

  const handleExitObstacleView = () => {
    setVisibleObstaclesParkId(null);
    setObstaclesLoadingParkId(null);
    setModalVisible(false);
    setSelectedPark(null);
    setActiveObstacle(null);
    setObstacleModalVisible(false);
    setObstacleVideos([]);
    setObstacleVideosError(null);
    setObstacleHasMore(true);
    setObstacleVideosPage(1);
  };

  const fetchObstacleVideos = useCallback(
    async (obstacleId, page = 1, append = false) => {
      if (!obstacleId) return;
      try {
        if (append) {
          setObstacleLoadingMore(true);
        } else {
          setObstacleVideosLoading(true);
        }
        const response = await videoService.getObstacleVideos(obstacleId, page, 10);
        const nextVideos = response?.videos ?? [];
        setObstacleVideos((prev) => (append ? [...prev, ...nextVideos] : nextVideos));
        setObstacleHasMore(response?.pagination?.hasMore ?? false);
        setObstacleVideosPage(page);
        setObstacleVideosError(null);
      } catch (error) {
        console.error('Erro ao carregar vídeos do obstáculo:', error);
        setObstacleVideosError('Não foi possível carregar as manobras deste obstáculo.');
        if (!append) {
          setObstacleVideos([]);
        }
      } finally {
        if (append) {
          setObstacleLoadingMore(false);
        } else {
          setObstacleVideosLoading(false);
        }
      }
    },
    []
  );

  const handleToggleLike = async (video) => {
    if (!video) return;
    try {
      const response = await videoService.likeVideo(video.id);
      if (response?.error) {
        Alert.alert('Erro', response.error);
        return;
      }

      setObstacleVideos((prev) =>
        prev.map((item) => {
          if (item.id !== video.id) return item;
          return {
            ...item,
            user_liked: response.liked,
            likes_count:
              typeof response.likes_count === 'number'
                ? response.likes_count
                : (item.likes_count || 0) + (response.liked ? 1 : -1),
          };
        })
      );
    } catch (error) {
      console.error('Erro ao curtir vídeo:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a curtida.');
    }
  };

  const handleObstaclePress = (obstacle) => {
    setActiveObstacle(obstacle);
    setObstacleModalVisible(true);
    setObstacleVideos([]);
    setObstacleHasMore(true);
    setObstacleVideosPage(1);
    setObstacleVideosError(null);
    fetchObstacleVideos(obstacle.id, 1, false);
  };

  const handleLoadMoreObstacleVideos = () => {
    if (!activeObstacle || obstacleLoadingMore || !obstacleHasMore) return;
    fetchObstacleVideos(activeObstacle.id, obstacleVideosPage + 1, true);
  };

  const handleRefreshObstacleVideos = () => {
    if (!activeObstacle || obstacleVideosLoading) return;
    fetchObstacleVideos(activeObstacle.id, 1, false);
  };

  const handleCloseObstacleModal = () => {
    setObstacleModalVisible(false);
    setActiveObstacle(null);
  };

  const fetchNearbyParks = async (latitude, longitude, radius = 200) => {
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setNearbyError('Não foi possível determinar sua localização atual.');
      return;
    }
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const response = await parkService.getNearbyParks(latitude, longitude, radius);
      setNearbyParks(response?.parks ?? []);
      if (!response?.parks?.length) {
        setNearbyError('Nenhum parque encontrado no raio atual.');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[MapScreen] Erro ao buscar parques próximos:', error);
      }
      const rawMessage = error?.response?.data?.error;
      const message = typeof rawMessage === 'string' && rawMessage.trim().length > 0
        ? rawMessage
        : 'Serviço de parques próximos indisponível no momento. Usando dados aproximados.';

      const fallback = parks
        .map((park) => {
          const parkLat = parseFloat(park.latitude);
          const parkLng = parseFloat(park.longitude);
          if (Number.isNaN(parkLat) || Number.isNaN(parkLng)) {
            return null;
          }
          const distance = calculateDistanceKm(latitude, longitude, parkLat, parkLng);
          return { ...park, distance_km: distance };
        })
        .filter((park) => park && (park.distance_km ?? Infinity) <= radius)
        .sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
        .slice(0, 5);

      if (fallback.length > 0) {
        setNearbyParks(fallback);
        setNearbyError(message);
      } else {
        setNearbyParks([]);
        setNearbyError(message);
      }
    } finally {
      setNearbyLoading(false);
    }
  };

  const renderParkModal = () => {
    if (!selectedPark) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPark.name}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalDescription}>{selectedPark.description}</Text>

              {selectedPark.address && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={18} color={colors.primary} />
                  <Text style={styles.infoText}>{selectedPark.address}</Text>
                </View>
              )}

              {selectedPark.phone && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="phone" size={18} color={colors.accent} />
                  <Text style={styles.infoText}>{selectedPark.phone}</Text>
                </View>
              )}

              <View style={styles.obstacleSection}>
                <View style={styles.obstacleSectionHeader}>
                  <MaterialIcons name="waves" size={18} color={colors.primary} />
                  <Text style={styles.obstacleSectionTitle}>Obstáculos no mapa</Text>
                </View>
                <Text style={styles.obstacleSectionSubtitle}>
                  Ative a visualização para conferir os obstáculos diretamente no mapa.
                </Text>

                <View style={styles.obstacleSectionActions}>
                  <TouchableOpacity
                    onPress={() => toggleObstaclesForPark(selectedPark)}
                    disabled={isLoadingSelectedObstacles}
                    style={[
                      styles.obstacleActionButton,
                      isShowingSelectedObstacles && styles.obstacleActionButtonActive,
                      isLoadingSelectedObstacles && styles.obstacleActionButtonDisabled,
                    ]}
                  >
                    <Icon
                      name={isShowingSelectedObstacles ? 'visibility-off' : 'visibility'}
                      size={18}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.obstacleActionText}>
                      {isShowingSelectedObstacles
                        ? 'Ocultar obstáculos'
                        : 'Mostrar obstáculos no mapa'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoadingSelectedObstacles ? (
                  <View style={styles.obstacleLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.obstacleLoadingText}>Carregando obstáculos...</Text>
                  </View>
                ) : isShowingSelectedObstacles ? (
                  selectedParkObstacles.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.obstacleCards}
                    >
                      {selectedParkObstacles.map((obstacle) => {
                        const obstacleColor = getObstacleColor(obstacle.difficulty_level);
                        return (
                          <View
                            key={obstacle.id}
                            style={[
                              styles.obstacleCard,
                              { borderColor: obstacleColor },
                            ]}
                          >
                            <View style={styles.obstacleCardHeader}>
                              <Text style={styles.obstacleCardTitle} numberOfLines={1}>
                                {obstacle.name}
                              </Text>
                              <View
                                style={[
                                  styles.obstacleDifficultyBadge,
                                  { backgroundColor: obstacleColor },
                                ]}
                              >
                                <Text style={styles.obstacleDifficultyText}>
                                  Nível {obstacle.difficulty_level}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.obstacleCardType}>{obstacle.type}</Text>
                            {obstacle.description ? (
                              <Text style={styles.obstacleCardDescription} numberOfLines={2}>
                                {obstacle.description}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.obstacleEmpty}>
                      <Text style={styles.obstacleEmptyText}>
                        Nenhum obstáculo cadastrado para este parque ainda.
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={styles.obstacleHint}>
                    <Text style={styles.obstacleHintText}>
                      Toque em "Mostrar obstáculos no mapa" para visualizar os pins deste parque.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => handleCheckin(selectedPark)}
              >
                <MaterialIcons name="check-circle" size={20} color={colors.textPrimary} />
                <Text style={styles.primaryButtonText}>Check-in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => handleNavigateToPark(selectedPark)}
              >
                <MaterialIcons name="directions" size={20} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Traçar Rota</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handleNavigateToNearbyPark = (park) => {
    handleParkPress(park);
  };

  const nearbyCountLabel = nearbyParks.length === 1 ? '1 local encontrado' : `${nearbyParks.length} locais encontrados`;

  const renderNearbyWidget = () => (
    <View style={styles.nearbySheet}>
      <View style={styles.nearbyHandle} />
      <View style={styles.nearbyHeaderRow}>
        <View style={styles.nearbyHeaderText}>
          <Text style={styles.nearbyTitle}>Spots Próximos de Você</Text>
          {nearbyLoading ? (
            <Text style={styles.nearbySubtitle}>Buscando locais...</Text>
          ) : nearbyError ? (
            <Text style={styles.nearbySubtitle}>{nearbyError}</Text>
          ) : (
            <Text style={styles.nearbySubtitle}>{nearbyCountLabel}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.nearbyCloseButton}
          onPress={() => setShowNearbyWidget(false)}
        >
          <MaterialIcons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nearbyList}
      >
        {nearbyLoading ? (
          <View style={styles.nearbyLoadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.nearbyLoadingText}>Carregando parques próximos...</Text>
          </View>
        ) : nearbyError ? (
          <TouchableOpacity
            style={styles.nearbyErrorCard}
            activeOpacity={0.85}
            onPress={() => {
              if (userLocation) {
                fetchNearbyParks(userLocation.latitude, userLocation.longitude);
              } else {
                getCurrentLocation();
              }
            }}
          >
            <MaterialIcons name="refresh" size={18} color={colors.warning} />
            <Text style={styles.nearbyErrorText}>Tocar para tentar novamente</Text>
          </TouchableOpacity>
        ) : nearbyParks.length === 0 ? (
          <View style={styles.nearbyEmptyCard}>
            <MaterialIcons name="travel-explore" size={20} color={colors.textSecondary} />
            <Text style={styles.nearbyEmptyText}>
              Explore o mapa ou ajuste o raio para encontrar parques perto de você.
            </Text>
          </View>
        ) : (
          nearbyParks.slice(0, 5).map((park, index) => {
            const distanceKm = park.distance_km ? Number(park.distance_km) : null;
            return (
              <TouchableOpacity
                key={park.id}
                style={styles.nearbyCard}
                activeOpacity={0.88}
                onPress={() => handleNavigateToNearbyPark(park)}
              >
                <View style={styles.nearbyCardImageWrapper}>
                  {park.logo_url ? (
                    <Image source={{ uri: park.logo_url }} style={styles.nearbyCardImage} />
                  ) : (
                    <View style={styles.nearbyCardImageFallback}>
                      <MaterialIcons name="park" size={20} color={colors.primary} />
                    </View>
                  )}
                  {index === 0 ? (
                    <View style={styles.nearbyBadge}>
                      <Text style={styles.nearbyBadgeText}>DESTAQUE</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.nearbyCardContent}>
                  <Text style={styles.nearbyCardTitle} numberOfLines={1}>
                    {park.name}
                  </Text>
                  <View style={styles.nearbyCardTags}>
                    <View style={styles.nearbyTagPill}>
                      <Text style={styles.nearbyTagText}>Cable Park</Text>
                    </View>
                    {distanceKm !== null ? (
                      <Text style={styles.nearbyDistance}>{distanceKm.toFixed(1)} km</Text>
                    ) : null}
                  </View>
                  <Text style={styles.nearbyCardDescription} numberOfLines={2}>
                    {park.description || 'Sem descrição disponível'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  const renderNearbyCollapsedButton = () => (
    <TouchableOpacity
      style={styles.nearbyCollapsedButton}
      activeOpacity={0.85}
      onPress={() => {
        setShowNearbyWidget(true);
        if (!nearbyParks.length && userLocation) {
          fetchNearbyParks(userLocation.latitude, userLocation.longitude);
        }
      }}
    >
      <MaterialIcons name="expand-less" size={18} color={colors.textPrimary} />
      <Text style={styles.nearbyCollapsedText}>Parques próximos</Text>
    </TouchableOpacity>
  );

  const renderObstacleFeedModal = () => {
    if (!activeObstacle) return null;

    const difficultyColor = getObstacleColor(activeObstacle.difficulty_level);

    const renderObstacleVideoItem = ({ item }) => {
      const thumbnail = item.thumbnail_url;
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.obstacleFeedItem}
          onPress={() => {
            handleCloseObstacleModal();
            navigation.navigate('VideoPlayer', { videoId: item.id, video: item });
          }}
        >
          <View style={styles.obstacleFeedThumbnailWrapper}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.obstacleFeedThumbnail} />
            ) : (
              <View style={styles.obstacleFeedThumbnailFallback}>
                <MaterialIcons name="videocam" size={22} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.obstacleFeedThumbnailOverlay}>
              <MaterialIcons name="play-arrow" size={18} color={colors.textPrimary} />
            </View>
          </View>
          <View style={styles.obstacleFeedContent}>
            <View style={styles.obstacleFeedHeader}>
              <Text style={styles.obstacleFeedUsername} numberOfLines={1}>
                @{item.username || 'rider'}
              </Text>
              <Text style={styles.obstacleFeedTimestamp}>{formatTimeAgo(item.created_at)}</Text>
            </View>
            {item.description ? (
              <Text style={styles.obstacleFeedDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : (
              <Text style={styles.obstacleFeedDescriptionMuted} numberOfLines={1}>
                Sem descrição para esta manobra.
              </Text>
            )}
            <View style={styles.obstacleFeedMeta}>
              {item.park_name ? (
                <View style={styles.obstacleFeedMetaItem}>
                  <MaterialIcons name="park" size={14} color={colors.textSecondary} />
                  <Text style={styles.obstacleFeedMetaText}>{item.park_name}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.obstacleFeedMetaItem, styles.obstacleFeedMetaAction]}
                activeOpacity={0.85}
                onPress={() => handleToggleLike(item)}
              >
                <Icon
                  name={item.user_liked ? 'favorite' : 'favorite-border'}
                  size={16}
                  color={item.user_liked ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.obstacleFeedMetaActionText}>
                  {item.user_liked ? 'Curtido' : 'Curtir'}
                </Text>
              </TouchableOpacity>
                <View style={styles.obstacleFeedMetaItem}>
                  <MaterialIcons name="chat-bubble-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.obstacleFeedMetaText}>{item.comments_count ?? 0}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.obstacleFeedMetaItem, styles.obstacleFeedMetaAction]}
                  activeOpacity={0.85}
                  onPress={() => {
                    handleCloseObstacleModal();
                    navigation.navigate('VideoPlayer', {
                      videoId: item.id,
                      video: { ...item, obstacle_name: activeObstacle?.name },
                      showComments: true,
                    });
                  }}
                >
                  <MaterialIcons name="comment" size={16} color={colors.textSecondary} />
                  <Text style={styles.obstacleFeedMetaActionText}>Comentar</Text>
                </TouchableOpacity>
              </View>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={obstacleModalVisible}
        onRequestClose={handleCloseObstacleModal}
      >
        <View style={styles.obstacleModalOverlay}>
          <Text style={styles.obstacleModalHint}>Toque em uma manobra para abrir o vídeo completo. Você também pode curtir ou comentar daqui.</Text>
          <View style={styles.obstacleModalCard}>
            <View style={styles.obstacleModalHeader}>
              <View style={styles.obstacleModalTitleGroup}>
                <View style={[styles.obstacleModalIcon, { backgroundColor: difficultyColor }]}>
                  <MaterialIcons name="waves" size={18} color={colors.textPrimary} />
                </View>
                <View style={styles.obstacleModalTitleText}>
                  <Text style={styles.obstacleModalTitle}>{activeObstacle.name}</Text>
                  <Text style={styles.obstacleModalSubtitle}>
                    {activeObstacle.type || 'Obstáculo'} • Nível {activeObstacle.difficulty_level}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.obstacleModalClose} onPress={handleCloseObstacleModal}>
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.obstacleModalBody}>
              <FlatList
                data={obstacleVideos}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderObstacleVideoItem}
                contentContainerStyle={styles.obstacleFeedList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  obstacleVideosLoading ? (
                    <View style={styles.obstacleFeedEmpty}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.obstacleFeedEmptyText}>Carregando manobras...</Text>
                    </View>
                  ) : obstacleVideosError ? (
                    <View style={styles.obstacleFeedEmpty}>
                      <MaterialIcons name="error-outline" size={22} color={colors.warning} />
                      <Text style={styles.obstacleFeedEmptyText}>{obstacleVideosError}</Text>
                      <TouchableOpacity
                        style={styles.obstacleFeedRetry}
                        onPress={() => fetchObstacleVideos(activeObstacle.id, 1, false)}
                      >
                        <Text style={styles.obstacleFeedRetryText}>Tentar novamente</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.obstacleFeedEmpty}>
                      <MaterialIcons name="movie" size={22} color={colors.textSecondary} />
                      <Text style={styles.obstacleFeedEmptyText}>
                        Nenhum vídeo com este obstáculo ainda. Seja o primeiro!
                      </Text>
                    </View>
                  )
                }
                refreshing={obstacleVideosLoading && obstacleVideosPage === 1}
                onRefresh={handleRefreshObstacleVideos}
                onEndReached={handleLoadMoreObstacleVideos}
                onEndReachedThreshold={0.2}
                ListFooterComponent={
                  obstacleLoadingMore ? (
                    <View style={styles.obstacleFeedFooter}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {parks.map((park) => {
          if (visibleObstaclesParkId === park.id) {
            return null;
          }

          return (
            <Marker
              key={park.id}
              coordinate={{
                latitude: parseFloat(park.latitude),
                longitude: parseFloat(park.longitude),
              }}
              title={park.name}
              onPress={() => handleParkPress(park)}
            >
              <View style={styles.markerContainer}>
                <MaterialIcons name="place" size={30} color={colors.primary} />
              </View>
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{park.name}</Text>
                  <Text style={styles.calloutSubtitle}>
                    Toque para mais informações
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {visibleObstaclesParkId &&
          currentObstacles
            .filter(
              (obstacle) =>
                obstacle.latitude !== undefined &&
                obstacle.longitude !== undefined &&
                obstacle.latitude !== null &&
                obstacle.longitude !== null,
            )
            .map((obstacle) => {
              const latitude = parseFloat(obstacle.latitude);
              const longitude = parseFloat(obstacle.longitude);

              if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
                return null;
              }

              const obstacleColor = getObstacleColor(obstacle.difficulty_level);

              return (
                <Marker
                  key={`obstacle-${obstacle.id}`}
                  coordinate={{ latitude, longitude }}
                  title={obstacle.name}
                  description={obstacle.type}
                  onPress={() => handleObstaclePress(obstacle)}
                >
                  <View style={[styles.obstacleMarker, { backgroundColor: obstacleColor }]}>
                    <MaterialIcons name="waves" size={18} color={colors.textPrimary} />
                  </View>
                </Marker>
              );
            })}
      </MapView>

      <View style={[styles.topBar, { paddingTop: topInsetPadding, paddingHorizontal: horizontalInsetPadding }]}>
        <View style={styles.topBarContent}>
          <View style={styles.topBarText}>
            <Text style={styles.topBarTitle}>Mapa dos Parques</Text>
            <Text style={styles.topBarSubtitle}>Explore os parques ativos ao seu redor</Text>
          </View>
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.bottomOverlay,
          { paddingHorizontal: horizontalInsetPadding, paddingBottom: bottomInsetPadding },
        ]}
      >
        {isShowingAnyObstacles ? (
          <View style={[styles.bottomCard, styles.bottomCardActive]}>
            <View style={styles.bottomCardText}>
              <Text style={styles.bottomCardTitle}>
                {activeObstaclePark ? activeObstaclePark.name : 'Obstáculos visíveis'}
              </Text>
              <Text style={styles.bottomCardSubtitle}>
                {currentObstacles.length > 0
                  ? `${currentObstacles.length} obstáculo${currentObstacles.length > 1 ? 's' : ''} visíveis`
                  : 'Sem obstáculos cadastrados para este parque'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bottomCardButton}
              onPress={handleExitObstacleView}
            >
              <Text style={styles.bottomCardButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        ) : showNearbyWidget ? (
          renderNearbyWidget()
        ) : (
          renderNearbyCollapsedButton()
        )}
      </View>

      {renderParkModal()}
      {renderObstacleFeedModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    paddingBottom: spacing.lg,
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 20,
  },
  topBarContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  topBarText: {
    flex: 1,
    gap: spacing.xs,
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  topBarSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm - 1,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    pointerEvents: 'box-none',
  },
  bottomCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
  },
  bottomCardActive: {
    backgroundColor: colors.surfaceRaised,
  },
  bottomCardText: {
    flex: 1,
    gap: spacing.xs,
  },
  bottomCardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  bottomCardSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  bottomCardButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  bottomCardButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  nearbySheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['xl'],
    gap: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 18,
  },
  nearbyHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nearbyHeaderText: {
    flex: 1,
    gap: spacing.xs / 1.5,
  },
  nearbyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  nearbySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  nearbyCloseButton: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nearbyList: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  nearbyLoadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['xl'],
  },
  nearbyLoadingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  nearbyErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing['xl'],
    paddingVertical: spacing.md,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  nearbyErrorText: {
    color: colors.warning,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  nearbyEmptyCard: {
    width: 240,
    padding: spacing.lg,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    gap: spacing.sm,
  },
  nearbyEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  nearbyCard: {
    width: 260,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  nearbyCardImageWrapper: {
    width: 68,
    height: 68,
    borderRadius: radii['xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  nearbyCardImage: {
    width: '100%',
    height: '100%',
  },
  nearbyCardImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.5,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  nearbyBadgeText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.6,
  },
  nearbyCardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  nearbyCardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  nearbyCardTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nearbyTagPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  nearbyTagText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
  },
  nearbyDistance: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  nearbyCardDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.sm,
  },
  nearbyCollapsedButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
  },
  nearbyCollapsedText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  markerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  calloutContainer: {
    padding: spacing.sm,
    minWidth: 160,
    maxWidth: 240,
    gap: spacing.xs,
  },
  calloutTitle: {
    color: '#111827',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  calloutSubtitle: {
    color: '#4B5563',
    fontSize: typography.sizes.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalBody: {
    maxHeight: 360,
  },
  modalBodyContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes['xl'],
    fontWeight: typography.weights.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  modalDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  obstacleSection: {
    gap: spacing.sm,
  },
  obstacleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  obstacleSectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  obstacleSectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  obstacleSectionActions: {
    marginTop: spacing.sm,
  },
  obstacleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii['2xl'],
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing['2xl'],
  },
  obstacleActionButtonActive: {
    backgroundColor: colors.primary,
  },
  obstacleActionButtonDisabled: {
    opacity: 0.6,
  },
  obstacleActionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  obstacleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  obstacleLoadingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  obstacleCards: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  obstacleCard: {
    width: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  obstacleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  obstacleCardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  obstacleCardType: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  obstacleCardDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.sm * 1.4,
  },
  obstacleDifficultyBadge: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  obstacleDifficultyText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  obstacleEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    padding: spacing['2xl'],
  },
  obstacleEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  obstacleHint: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    padding: spacing['2xl'],
  },
  obstacleHintText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii['2xl'],
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  obstacleMarker: {
    padding: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
  },
  obstacleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  obstacleModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    paddingTop: spacing.lg,
    paddingHorizontal: spacing['xl'],
    paddingBottom: spacing['2xl'],
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    maxHeight: '82%',
    alignSelf: 'stretch',
    width: '100%',
  },
  obstacleModalHint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  obstacleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  obstacleModalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  obstacleModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  obstacleModalTitleText: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  obstacleModalTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  obstacleModalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  obstacleModalClose: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  obstacleModalBody: {
    flex: 1,
  },
  obstacleFeedList: {
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  obstacleFeedItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  obstacleFeedThumbnailWrapper: {
    width: 88,
    height: 88,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
  },
  obstacleFeedThumbnail: {
    width: '100%',
    height: '100%',
  },
  obstacleFeedThumbnailFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  obstacleFeedThumbnailOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  obstacleFeedContent: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  obstacleFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  obstacleFeedUsername: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  obstacleFeedTimestamp: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  obstacleFeedDescription: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.md,
  },
  obstacleFeedDescriptionMuted: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  obstacleFeedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  obstacleFeedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 1.5,
  },
  obstacleFeedMetaText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  obstacleFeedMetaAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  obstacleFeedMetaActionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  obstacleFeedEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  obstacleFeedEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  obstacleFeedRetry: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  obstacleFeedRetryText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  obstacleFeedFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
