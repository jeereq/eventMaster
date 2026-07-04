import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { GuestRsvpData } from '../../types/rsvp';

interface Props {
  guest: GuestRsvpData;
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rsvpBadge(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return { label: 'Présence confirmée', bg: '#ecfdf5', color: '#047857' };
    case 'DECLINED':
      return { label: 'Absence confirmée', bg: '#fff1f2', color: '#be123c' };
    default:
      return { label: 'En attente de réponse', bg: '#fffbeb', color: '#b45309' };
  }
}

export function RsvpEventCard({ guest }: Props) {
  const badge = rsvpBadge(guest.rsvp);

  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>
        Bonjour {guest.firstName} {guest.lastName}
      </Text>
      <Text style={styles.title}>{guest.event.title}</Text>
      {guest.event.description ? (
        <Text style={styles.description}>{guest.event.description}</Text>
      ) : null}

      <View style={styles.meta}>
        <Text style={styles.metaLabel}>Date</Text>
        <Text style={styles.metaValue}>{formatEventDate(guest.event.date)}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaLabel}>Lieu</Text>
        <Text style={styles.metaValue}>{guest.event.location || 'Non précisé'}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>

      {guest.rsvpLocked ? (
        <Text style={styles.locked}>
          La date de l&apos;événement est passée — la réponse RSVP n&apos;est plus modifiable.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  meta: {
    gap: 2,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  locked: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 4,
    lineHeight: 18,
  },
});
