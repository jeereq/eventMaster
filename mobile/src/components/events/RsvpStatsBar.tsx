import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RsvpStats } from '../../types/event';
import { colors } from '../../theme/colors';

interface Props {
  stats: RsvpStats;
}

export function RsvpStatsBar({ stats }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistiques RSVP</Text>
        <Text style={styles.rate}>{stats.responseRate}% réponses</Text>
      </View>
      <View style={styles.grid}>
        <StatBox label="Total" value={stats.total} color={colors.text} />
        <StatBox label="Confirmés" value={stats.accepted} color="#047857" />
        <StatBox label="Déclinés" value={stats.declined} color="#be123c" />
        <StatBox label="En attente" value={stats.pending} color="#b45309" />
      </View>
      {stats.checkedIn > 0 ? (
        <Text style={styles.checkedIn}>{stats.checkedIn} invité(s) déjà accueilli(s)</Text>
      ) : null}
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  rate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  checkedIn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
});
