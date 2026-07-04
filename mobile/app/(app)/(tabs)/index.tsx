import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { Button } from '../../../src/components/ui/Button';
import { EventListCard } from '../../../src/components/events/EventListCard';
import { fetchEvents } from '../../../src/lib/eventsApi';
import { fetchNotifications } from '../../../src/lib/eventsApi';
import type { EventItem } from '../../../src/types/event';
import { colors } from '../../../src/theme/colors';

export default function HomeTab() {
  const { user, tenant, access, logout } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [eventsRes, notifs] = await Promise.all([
      fetchEvents(),
      fetchNotifications(10).catch(() => ({ items: [], unreadCount: 0 })),
    ]);
    setEvents(eventsRes.events);
    setUnreadCount(notifs.unreadCount);
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

  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.date).getTime() >= Date.now()).slice(0, 3),
    [events],
  );

  const roleLabel =
    user?.role === 'SUPER_ADMIN'
      ? 'Super administrateur'
      : access?.isProtocolOnly
        ? 'Protocole'
        : access?.level === 'owner'
          ? 'Propriétaire'
          : access?.level === 'manager'
            ? 'Manager'
            : 'Organisateur';

  const openEvent = (eventId: string) => {
    if (access?.isProtocolOnly) {
      router.push(`/(app)/protocol/${eventId}`);
    } else {
      router.push(`/(app)/events/${eventId}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
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
      <View style={styles.hero}>
        <Text style={styles.greeting}>Bonjour, {user?.name?.split(' ')[0] ?? '!'}</Text>
        <Text style={styles.role}>{roleLabel}</Text>
        {tenant ? (
          <View style={styles.tenantBadge}>
            <Text style={styles.tenantName}>{tenant.name}</Text>
            <Text style={styles.tenantPlan}>Forfait {tenant.plan}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.summaryRow}>
        <SummaryTile label="Événements" value={String(events.length)} />
        <SummaryTile label="À venir" value={String(upcoming.length)} />
        <SummaryTile label="Alertes" value={String(unreadCount)} accent={unreadCount > 0} />
      </View>

      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochains événements</Text>
          {upcoming.map((event) => (
            <EventListCard
              key={event.id}
              event={event}
              onPress={() => openEvent(event.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucun événement à venir</Text>
          <Text style={styles.emptyText}>
            Créez et gérez vos événements depuis le tableau de bord web EventMaster.
          </Text>
        </View>
      )}

      <Button title="Voir tous les événements" onPress={() => router.push('/(app)/(tabs)/events')} />
      <Button title="Se déconnecter" onPress={handleLogout} variant="secondary" />
    </ScrollView>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      <Text style={[styles.tileValue, accent && styles.tileValueAccent]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  hero: {
    gap: 6,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  tenantBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312e81',
  },
  tenantPlan: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tileAccent: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  tileValueAccent: {
    color: colors.primary,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
