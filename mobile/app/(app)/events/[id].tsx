import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { EventWorkflowStrip } from '../../../src/components/events/EventWorkflowStrip';
import { RsvpStatsBar } from '../../../src/components/events/RsvpStatsBar';
import { GuestListItem } from '../../../src/components/events/GuestListItem';
import {
  fetchEvent,
  fetchEventGuests,
  fetchEventInvitations,
} from '../../../src/lib/eventsApi';
import { computeEventWorkflowState } from '../../../src/lib/eventWorkflow';
import { computeRsvpStats } from '../../../src/types/event';
import type { EventGuest, EventInvitation, EventItem } from '../../../src/types/event';
import { colors } from '../../../src/theme/colors';

type RsvpFilter = 'ALL' | 'ACCEPTED' | 'DECLINED' | 'PENDING';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { access, planFeatures } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const [ev, g, inv] = await Promise.all([
      fetchEvent(id),
      fetchEventGuests(id),
      fetchEventInvitations(id),
    ]);
    setEvent(ev);
    setGuests(g);
    setInvitations(inv);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setError('Événement introuvable.');
      setLoading(false);
      return;
    }
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => computeRsvpStats(guests), [guests]);

  const workflow = useMemo(
    () =>
      computeEventWorkflowState({
        guests,
        invitations,
        tablePlan: event?.tablePlan ?? null,
        eventDate: event?.date,
        isProtocolOnly: access?.isProtocolOnly,
      }),
    [guests, invitations, event, access],
  );

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      const matchesFilter = rsvpFilter === 'ALL' || g.rsvp === rsvpFilter;
      const matchesSearch =
        !q ||
        `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [guests, rsvpFilter, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Événement introuvable'}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.metaCard}>
          <Text style={styles.metaDate}>
            {new Date(event.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={styles.metaLoc}>📍 {event.location}</Text>
          {event.room?.name ? <Text style={styles.metaRoom}>Salle : {event.room.name}</Text> : null}
          {event.description ? <Text style={styles.metaDesc}>{event.description}</Text> : null}
        </View>

        <EventWorkflowStrip workflow={workflow} />
        <RsvpStatsBar stats={stats} />

        {planFeatures?.protocolQr !== false ? (
          <Pressable
            style={styles.protocolBtn}
            onPress={() => router.push(`/(app)/protocol/${id}`)}
          >
            <Text style={styles.protocolBtnEmoji}>📱</Text>
            <View style={styles.protocolBtnText}>
              <Text style={styles.protocolBtnTitle}>Protocole jour J</Text>
              <Text style={styles.protocolBtnSub}>
                Scan QR, confirmation de présence et vérification des sièges
              </Text>
            </View>
            <Text style={styles.protocolBtnArrow}>›</Text>
          </Pressable>
        ) : null}

        {invitations.length > 0 ? (
          <View style={styles.inviteCard}>
            <Text style={styles.sectionTitle}>Invitations ({invitations.length})</Text>
            {invitations.map((inv) => (
              <View key={inv.id} style={styles.inviteRow}>
                <Text style={styles.inviteSubject} numberOfLines={1}>
                  {inv.subject}
                </Text>
                <Text style={styles.inviteChannel}>{inv.channel}</Text>
                {inv.template?.name ? (
                  <Text style={styles.inviteTemplate}>Modèle : {inv.template.name}</Text>
                ) : null}
              </View>
            ))}
            <Text style={styles.webHint}>
              Envoi et édition des invitations : utilisez le dashboard web.
            </Text>
          </View>
        ) : null}

        <View style={styles.guestsCard}>
          <Text style={styles.sectionTitle}>Invités ({guests.length})</Text>

          <TextInput
            style={styles.search}
            placeholder="Rechercher un invité…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />

          <View style={styles.filters}>
            {(['ALL', 'ACCEPTED', 'DECLINED', 'PENDING'] as RsvpFilter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setRsvpFilter(f)}
                style={[styles.filterChip, rsvpFilter === f && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, rsvpFilter === f && styles.filterTextActive]}>
                  {f === 'ALL'
                    ? 'Tous'
                    : f === 'ACCEPTED'
                      ? 'Confirmés'
                      : f === 'DECLINED'
                        ? 'Déclinés'
                        : 'En attente'}
                </Text>
              </Pressable>
            ))}
          </View>

          {filteredGuests.length === 0 ? (
            <Text style={styles.noGuests}>Aucun invité pour ce filtre.</Text>
          ) : (
            filteredGuests.map((guest) => (
              <GuestListItem
                key={guest.id}
                guest={guest}
                onPress={() => router.push(`/rsvp/${guest.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  protocolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigo900,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  protocolBtnEmoji: {
    fontSize: 28,
  },
  protocolBtnText: {
    flex: 1,
    gap: 2,
  },
  protocolBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  protocolBtnSub: {
    fontSize: 12,
    color: '#c7d2fe',
    lineHeight: 18,
  },
  protocolBtnArrow: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '300',
  },
  metaDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  metaLoc: {
    fontSize: 14,
    color: colors.text,
  },
  metaRoom: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
  },
  metaDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 4,
  },
  inviteCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  inviteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 2,
  },
  inviteSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  inviteChannel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inviteTemplate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  webHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  guestsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#f8fafc',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.primary,
  },
  noGuests: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
