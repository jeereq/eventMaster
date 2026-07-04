import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EventGuest } from '../../types/event';
import { colors } from '../../theme/colors';

interface Props {
  guest: EventGuest;
  onPress?: () => void;
}

function rsvpStyle(status: EventGuest['rsvp']) {
  switch (status) {
    case 'ACCEPTED':
      return { bg: '#ecfdf5', color: '#047857', label: 'Confirmé' };
    case 'DECLINED':
      return { bg: '#fff1f2', color: '#be123c', label: 'Décliné' };
    default:
      return { bg: '#fffbeb', color: '#b45309', label: 'En attente' };
  }
}

export function GuestListItem({ guest, onPress }: Props) {
  const badge = rsvpStyle(guest.rsvp);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {guest.firstName[0]}
          {guest.lastName[0]}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {guest.firstName} {guest.lastName}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {guest.email}
        </Text>
        {guest.category ? <Text style={styles.category}>{guest.category}</Text> : null}
      </View>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 12,
    color: colors.textMuted,
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
