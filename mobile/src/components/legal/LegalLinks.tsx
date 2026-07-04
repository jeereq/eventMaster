import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { openLegalPage } from '../../lib/legalLinks';
import { useTheme } from '../../theme/ThemeContext';

interface LegalLinksTextProps {
  prefix?: string;
}

export function LegalLinksText({ prefix = 'J\'accepte les ' }: LegalLinksTextProps) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.text, { color: colors.textMuted }]}>
      {prefix}
      <Text style={[styles.link, { color: colors.primary }]} onPress={() => openLegalPage('terms')}>
        conditions d&apos;utilisation
      </Text>
      {' et la '}
      <Text style={[styles.link, { color: colors.primary }]} onPress={() => openLegalPage('privacy')}>
        politique de confidentialité
      </Text>
      .
    </Text>
  );
}

interface LegalLinkRowProps {
  label: string;
  page: 'terms' | 'privacy';
}

export function LegalLinkRow({ label, page }: LegalLinkRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
      onPress={() => openLegalPage(page)}
    >
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowArrow, { color: colors.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
});
