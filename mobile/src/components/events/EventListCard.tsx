import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EventItem } from '../../types/event';
import { colors } from '../../theme/colors';

interface Props {
  event: EventItem;
  onPress: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventListCard({ event, onPress }: Props) {
  const isPast = new Date(event.date).getTime() < Date.now();

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={[styles.badge, isPast ? styles.badgePast : styles.badgeUpcoming]}>
          <Text style={[styles.badgeText, isPast ? styles.badgeTextPast : styles.badgeTextUpcoming]}>
            {isPast ? 'Passé' : 'À venir'}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>{formatDate(event.date)}</Text>
      <Text style={styles.location} numberOfLines={1}>
        📍 {event.location}
      </Text>
      {event.room?.name ? (
        <Text style={styles.room}>Salle : {event.room.name}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeUpcoming: {
    backgroundColor: colors.primaryLight,
  },
  badgePast: {
    backgroundColor: '#f1f5f9',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeTextUpcoming: {
    color: colors.primary,
  },
  badgeTextPast: {
    color: colors.textMuted,
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  location: {
    fontSize: 13,
    color: colors.textMuted,
  },
  room: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
});
