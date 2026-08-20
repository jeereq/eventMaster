import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
  type NotificationPrefFamily,
  type NotificationPreferences,
} from '../../../src/lib/eventsApi';
import { resolveNotificationRoute } from '../../../src/lib/deepLinks';
import { setBadgeCount } from '../../../src/lib/pushNotifications';
import type { PlatformNotification } from '../../../src/types/event';
import { Button } from '../../../src/components/ui/Button';
import { useTheme } from '../../../src/theme/ThemeContext';

const FAMILY_LABELS: Record<NotificationPrefFamily, string> = {
  billing: 'Facturation',
  commissions: 'Commissions',
  catalog: 'Catalogue',
};

const FAMILIES: NotificationPrefFamily[] = ['billing', 'commissions', 'catalog'];

export default function NotificationsTab() {
  const { colors } = useTheme();
  const [items, setItems] = useState<PlatformNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  const load = useCallback(async () => {
    const [res, nextPrefs] = await Promise.all([
      fetchNotifications(),
      fetchNotificationPreferences().catch(() => null),
    ]);
    setItems(res.items);
    setUnreadCount(res.unreadCount);
    if (nextPrefs) setPrefs(nextPrefs);
    await setBadgeCount(res.unreadCount);
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

  const handlePress = async (item: PlatformNotification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id);
    }
    const route = resolveNotificationRoute(item.metadata ?? undefined);
    if (route) {
      router.push(route as never);
    }
    await load();
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    await load();
  };

  const togglePref = async (
    family: NotificationPrefFamily,
    channel: 'email' | 'whatsapp' | 'push',
    value: boolean,
  ) => {
    if (!prefs) return;
    if (channel === 'whatsapp' && !prefs.hasPhone) return;
    const next = {
      ...prefs,
      families: {
        ...prefs.families,
        [family]: { ...prefs.families[family], [channel]: value },
      },
    };
    setPrefs(next);
    try {
      const saved = await saveNotificationPreferences(next.families);
      setPrefs(saved);
    } catch {
      await load();
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          padding: 16,
          gap: 12,
          paddingBottom: 32,
          backgroundColor: colors.background,
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
        prefsTitle: {
          fontSize: 14,
          fontWeight: '800',
          color: colors.text,
        },
        prefsHint: {
          fontSize: 12,
          color: colors.textMuted,
          lineHeight: 18,
        },
        familyBlock: {
          marginTop: 10,
          gap: 8,
        },
        familyLabel: {
          fontSize: 12,
          fontWeight: '700',
          color: colors.text,
        },
        switchRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        switchLabel: {
          fontSize: 13,
          color: colors.textMuted,
        },
      }),
    [colors],
  );

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

      {prefs ? (
        <View style={styles.card}>
          <Text style={styles.prefsTitle}>Canaux d'alerte</Text>
          <Text style={styles.prefsHint}>
            L'inbox reste active. WhatsApp nécessite un numéro sur le profil.
          </Text>
          {FAMILIES.map((family) => (
            <View key={family} style={styles.familyBlock}>
              <Text style={styles.familyLabel}>{FAMILY_LABELS[family]}</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>E-mail</Text>
                <Switch
                  value={prefs.families[family].email}
                  onValueChange={(value) => void togglePref(family, 'email', value)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>WhatsApp</Text>
                <Switch
                  value={prefs.families[family].whatsapp}
                  disabled={!prefs.hasPhone}
                  onValueChange={(value) => void togglePref(family, 'whatsapp', value)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Push</Text>
                <Switch
                  value={prefs.families[family].push}
                  onValueChange={(value) => void togglePref(family, 'push', value)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>
          ))}
        </View>
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
            onPress={() => void handlePress(item)}
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
