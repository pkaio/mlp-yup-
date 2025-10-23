import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import YupHeader from '../components/ui/YupHeader';
import YupCard from '../components/ui/YupCard';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { notificationService } from '../services/notificationService';
import { useFocusEffect } from '@react-navigation/native';

function typeIcon(type) {
  switch (type) {
    case 'like':
      return <Icon name="favorite" size={18} color="#EF4444" />;
    case 'comment':
      return <Icon name="chat-bubble" size={18} color="#00BFFF" />;
    case 'follow':
      return <Icon name="person-add-alt-1" size={18} color="#22C55E" />;
    case 'achievement':
      return <Icon name="emoji-events" size={18} color={colors.primary} />;
    case 'xp':
      return <Icon name="trending-up" size={18} color={colors.primary} />;
    default:
      return <Icon name="notifications" size={18} color={colors.textSecondary} />;
  }
}

const formatTime = (isoString) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '—';
  }
};

const NotificationItem = React.memo(function NotificationItem({ item, onMarkRead }) {
  const unread = item.is_read === false;
  const avatarUrl = item.data?.avatar || item.avatar;
  const userName = item.data?.user || item.user;
  const time = formatTime(item.created_at);

  const handlePress = useCallback(() => {
    onMarkRead(item.id, unread);
  }, [onMarkRead, item.id, unread]);

  return (
    <YupCard style={[styles.card, unread && styles.cardUnread]}>
      <View style={styles.row}>
        <View style={styles.leading}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>{typeIcon(item.type)}</View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {userName ? <Text style={styles.user}>{userName} </Text> : null}
            <Text style={styles.message}>
              {item.title || item.message || 'Interação recente'}
            </Text>
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.time}>{time}</Text>
            {unread && <View style={styles.unreadDot} />}
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Marcar como lida"
          onPress={handlePress}
          style={styles.trailing}
        >
          <Icon
            name={unread ? 'mark-email-read' : 'more-vert'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </YupCard>
  );
});

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const footerPad = insets.bottom + spacing['2xl'];

  const loadPage = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (pageNum === 1 && !isRefreshing) setLoading(true);
      if (isRefreshing) setRefreshing(true);

      const res = await notificationService.getNotifications(pageNum, 20);
      const next = res.notifications ?? [];
      setItems((prev) => (pageNum === 1 ? next : [...prev, ...next]));
      setHasMore(Boolean(res.pagination?.hasMore));
      setPage(pageNum);
    } catch (e) {
      console.error('Erro ao carregar notificações', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage(1, true);
    }, [loadPage])
  );

  const onRefresh = useCallback(() => loadPage(1, true), [loadPage]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      loadPage(page + 1);
    }
  }, [loading, hasMore, refreshing, loadPage, page]);

  const handleMarkRead = useCallback(
    async (notificationId, unread) => {
      try {
        if (unread) {
          await notificationService.markAsRead(notificationId);
        }
        setItems((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
      } catch (error) {
        console.error('Erro ao marcar como lida', error);
      }
    },
    []
  );

  const renderItem = useCallback(
    ({ item }) => <NotificationItem item={item} onMarkRead={handleMarkRead} />,
    [handleMarkRead]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderSeparator = useCallback(
    () => <View style={styles.listSeparator} />,
    []
  );
  const renderEmpty = useCallback(
    () => (
      <View style={styles.empty}>
        <Icon name="notifications-none" size={42} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
        <Text style={styles.emptyText}>Interações aparecerão aqui</Text>
      </View>
    ),
    []
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <YupHeader
        title="Notificações"
        subtitle="Acompanhe curtidas, comentários e conquistas"
        status="raised"
        rightAction={
          <TouchableOpacity
            onPress={async () => {
              try {
                await notificationService.markAllAsRead();
                setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
              } catch (e) {
                console.error('Erro ao marcar todas como lidas', e);
              }
            }}
          >
            <Text style={styles.markAll}>Marcar todas</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.screenPadding, paddingBottom: footerPad }}
        ItemSeparatorComponent={renderSeparator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markAll: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii['2xl'], padding: spacing.lg },
  cardUnread: { backgroundColor: colors.surfaceMuted, borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  leading: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 4 },
  title: { color: colors.textPrimary, fontSize: typography.sizes.sm },
  user: { fontWeight: typography.weights.semibold, color: colors.textPrimary },
  message: { color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  trailing: { padding: spacing.sm },
  listSeparator: { height: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, marginTop: spacing['2xl'] },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  emptyText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
});
