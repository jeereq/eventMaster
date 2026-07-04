import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatDressCodeText,
  getRecommendationLabel,
  getVisibleRecommendations,
  hasVisibleGuestGuidelines,
  normalizeGuestGuidelines,
} from '../../lib/guestGuidelines';
import { colors } from '../../theme/colors';

interface Props {
  guidelines: unknown;
}

export function GuestGuidelinesCard({ guidelines: raw }: Props) {
  const guidelines = normalizeGuestGuidelines(raw);
  if (!hasVisibleGuestGuidelines(guidelines)) return null;

  const dressCode = formatDressCodeText(guidelines);
  const recommendations = getVisibleRecommendations(guidelines);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Infos pratiques</Text>

      {dressCode ? (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Tenue</Text>
          <Text style={styles.blockText}>{dressCode}</Text>
        </View>
      ) : null}

      {recommendations.map((rec) => (
        <View key={rec.id} style={styles.block}>
          <Text style={styles.blockLabel}>{getRecommendationLabel(rec.type, rec.title)}</Text>
          <Text style={styles.blockText}>{rec.content}</Text>
        </View>
      ))}

      {guidelines.additionalNotes?.trim() ? (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Notes</Text>
          <Text style={styles.blockText}>{guidelines.additionalNotes.trim()}</Text>
        </View>
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
    gap: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  block: {
    gap: 4,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  blockText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
