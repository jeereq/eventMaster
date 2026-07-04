import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { LegalLinkRow } from '../../src/components/legal/LegalLinks';
import { getLegalUrl } from '../../src/lib/legalLinks';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AboutScreen() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <Stack.Screen options={{ title: 'À propos' }} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
      >
        <View style={[styles.hero, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>EventMaster</Text>
          <Text style={[styles.heroVersion, { color: colors.textMuted }]}>Version {version}</Text>
          <Text style={[styles.heroDesc, { color: colors.textMuted }]}>
            Gestion d&apos;événements privés : invitations, RSVP, protocole jour J et plan de table.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Documents légaux</Text>
        <View style={styles.links}>
          <LegalLinkRow label="Conditions d'utilisation" page="terms" />
          <LegalLinkRow label="Politique de confidentialité" page="privacy" />
        </View>

        <View style={[styles.urlBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.urlLabel, { color: colors.textMuted }]}>Pages web</Text>
          <Text style={[styles.url, { color: colors.primary }]} selectable>
            {getLegalUrl('terms')}
          </Text>
          <Text style={[styles.url, { color: colors.primary }]} selectable>
            {getLegalUrl('privacy')}
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          © {new Date().getFullYear()} EventMaster. Tous droits réservés.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 6,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  heroVersion: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  links: {
    gap: 10,
  },
  urlBox: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  url: {
    fontSize: 12,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
