import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  qrUrl: string;
  guestName: string;
}

export function RsvpBadgePanel({ qrUrl, guestName }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Badge de confirmation de présence</Text>
      <Text style={styles.subtitle}>
        Présentez ce QR code à l&apos;accueil le jour de l&apos;événement, {guestName}.
      </Text>

      <View style={styles.qrWrap}>
        <Image source={{ uri: qrUrl }} style={styles.qr} accessibilityLabel="QR code de confirmation de présence" />
      </View>

      <Text style={styles.hint}>Conservez cet écran ou le lien reçu par e-mail / WhatsApp.</Text>
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
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    alignSelf: 'flex-start',
  },
  qrWrap: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  qr: {
    width: 200,
    height: 200,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
