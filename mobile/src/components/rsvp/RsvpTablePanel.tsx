import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { RsvpTableDetails } from '../../types/rsvp';

interface Props {
  tableDetails: RsvpTableDetails;
}

function shapeLabel(shape: string): string {
  switch (shape) {
    case 'round':
      return 'Ronde';
    case 'rectangular':
      return 'Rectangulaire';
    case 'square':
      return 'Carrée';
    case 'oval':
      return 'Ovale';
    default:
      return shape;
  }
}

export function RsvpTablePanel({ tableDetails }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Votre placement</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Table</Text>
        <Text style={styles.value}>{tableDetails.tableName}</Text>
      </View>

      {tableDetails.seatIndex !== undefined ? (
        <View style={styles.row}>
          <Text style={styles.label}>Siège</Text>
          <Text style={styles.value}>N° {tableDetails.seatIndex + 1}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Forme</Text>
        <Text style={styles.value}>{shapeLabel(tableDetails.shape)}</Text>
      </View>

      {tableDetails.neighbors.length > 0 ? (
        <View style={styles.neighbors}>
          <Text style={styles.neighborsTitle}>Voisins de table</Text>
          {tableDetails.neighbors.map((n) => (
            <Text key={n.id} style={styles.neighbor}>
              • {n.firstName} {n.lastName}
              {n.seatIndex !== undefined ? ` (siège ${n.seatIndex + 1})` : ''}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Les voisins de table seront affichés une fois le plan finalisé.</Text>
      )}
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
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  neighbors: {
    marginTop: 8,
    gap: 6,
  },
  neighborsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  neighbor: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
});
