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
import { EventListCard } from '../../../src/components/events/EventListCard';
import { fetchEvents } from '../../../src/lib/eventsApi';
import type { EventItem } from '../../../src/types/event';
import { colors } from '../../../src/theme/colors';

export default function EventsTab() {
  const { access } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetchEvents();
    setEvents(res.events);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRefreshing(false);
    }
  };

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: EventItem[] = [];
    const pa: EventItem[] = [];
    for (const e of events) {
      if (new Date(e.date).getTime() >= now) up.push(e);
      else pa.push(e);
    }
    return { upcoming: up, past: pa.reverse() };
  }, [events]);

  const openEvent = (eventId: string) => {
    if (access?.isProtocolOnly) {
      router.push(`/(app)/protocol/${eventId}`);
    } else {
      router.push(`/(app)/events/${eventId}`);
    }
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucun événement</Text>
          <Text style={styles.emptyText}>
            Vous n&apos;avez pas encore d&apos;événement accessible sur ce compte.
          </Text>
        </View>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <Section title={`À venir (${upcoming.length})`}>
              {upcoming.map((event) => (
                <EventListCard
                  key={event.id}
                  event={event}
                  onPress={() => openEvent(event.id)}
                />
              ))}
            </Section>
          ) : null}

          {past.length > 0 ? (
            <Section title={`Passés (${past.length})`}>
              {past.map((event) => (
                <EventListCard
                  key={event.id}
                  event={event}
                  onPress={() => openEvent(event.id)}
                />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: 10,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
