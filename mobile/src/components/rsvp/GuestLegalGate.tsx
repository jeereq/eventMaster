import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../ui/Button';
import { openLegalPage } from '../../lib/legalLinks';
import { acceptGuestLegal, fetchGuestLegalStatus } from '../../lib/rsvpApi';
import { colors } from '../../theme/colors';

interface GuestLegalGateProps {
  guestId: string;
  children: React.ReactNode;
}

export function GuestLegalGate({ guestId, children }: GuestLegalGateProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requiresAcceptance, setRequiresAcceptance] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const status = await fetchGuestLegalStatus(guestId);
        if (!cancelled) {
          setRequiresAcceptance(Boolean(status.requiresAcceptance));
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de vérifier les conditions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError('');
    try {
      const status = await acceptGuestLegal(guestId, {
        acceptTerms: true,
        acceptPrivacy: true,
      });
      setRequiresAcceptance(Boolean(status.requiresAcceptance));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'enregistrer votre acceptation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Vérification des conditions…</Text>
      </View>
    );
  }

  if (requiresAcceptance) {
    return (
      <View style={styles.gate}>
        <Text style={styles.title}>Bienvenue dans votre espace invité</Text>
        <Text style={styles.subtitle}>
          Avant d&apos;accéder à votre invitation sur EventMaster (un projet du Groupe Tekango), acceptez les conditions d&apos;utilisation et la
          politique de confidentialité.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.checkRow} onPress={() => setAcceptTerms((v) => !v)}>
          <View style={[styles.checkbox, acceptTerms && styles.checkboxOn]} />
          <Text style={styles.checkLabel}>
            J&apos;accepte les{' '}
            <Text style={styles.link} onPress={() => openLegalPage('terms')}>
              conditions d&apos;utilisation
            </Text>
          </Text>
        </Pressable>

        <Pressable style={styles.checkRow} onPress={() => setAcceptPrivacy((v) => !v)}>
          <View style={[styles.checkbox, acceptPrivacy && styles.checkboxOn]} />
          <Text style={styles.checkLabel}>
            J&apos;accepte la{' '}
            <Text style={styles.link} onPress={() => openLegalPage('privacy')}>
              politique de confidentialité
            </Text>
          </Text>
        </Pressable>

        <Button
          title="Continuer"
          onPress={handleAccept}
          loading={submitting}
          disabled={!acceptTerms || !acceptPrivacy}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 12,
  },
  gate: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    color: '#be123c',
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
