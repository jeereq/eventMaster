import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../src/lib/eventsApi';
import type { PlatformNotification } from '../../../src/types/event';
import { Button } from '../../../src/components/ui/Button';
import { colors } from '../../../src/theme/colors';

export default function NotificationsTab() {
  const [items, setItems] = useState<PlatformNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchNotifications();
    setItems(res.items);
    setUnreadCount(res.unreadCount);
  }, []);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    await load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {unreadCount > 0 ? (
        <Button title={`Tout marquer comme lu (${unreadCount})`} onPress={handleReadAll} variant="secondary" />
      ) : null}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyText}>Vous serez alerté ici des activités importantes.</Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => !item.readAt && void handleRead(item.id)}
            style={[styles.card, !item.readAt && styles.cardUnread]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMessage}>{item.message}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
});
