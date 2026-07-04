import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EventWorkflowState } from '../../lib/eventWorkflow';
import { colors } from '../../theme/colors';

interface Props {
  workflow: EventWorkflowState;
}

export function EventWorkflowStrip({ workflow }: Props) {
  const current = workflow.steps.find((s) => s.status === 'current');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Parcours événement</Text>
        <Text style={styles.percent}>{workflow.progressPercent}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${workflow.progressPercent}%` }]} />
      </View>
      <Text style={styles.meta}>
        {workflow.completedCount}/{workflow.totalCount} étapes
        {current ? ` · ${current.title}` : ''}
      </Text>
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
    gap: 10,
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
  percent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  track: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
