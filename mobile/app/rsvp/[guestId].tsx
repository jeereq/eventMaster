import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RsvpEventCard } from '../../src/components/rsvp/RsvpEventCard';
import { GuestGuidelinesCard } from '../../src/components/rsvp/GuestGuidelinesCard';
import { RsvpResponseForm } from '../../src/components/rsvp/RsvpResponseForm';
import { RsvpBadgePanel } from '../../src/components/rsvp/RsvpBadgePanel';
import { RsvpTablePanel } from '../../src/components/rsvp/RsvpTablePanel';
import { Button } from '../../src/components/ui/Button';
import { env } from '../../src/config/env';
import { extractRsvpFieldsFromTemplateContent } from '../../src/lib/rsvpFormFields';
import {
  fetchGuestInvitations,
  fetchGuestRsvp,
  getPdfUrl,
  getQrCodeUrl,
  submitGuestRsvp,
} from '../../src/lib/rsvpApi';
import type { GuestInvitationListItem, GuestRsvpData, RsvpStatus } from '../../src/types/rsvp';
import type { GuestRsvpPreferences } from '../../src/lib/rsvpFormFields';
import { colors } from '../../src/theme/colors';

export default function RsvpGuestScreen() {
  const { guestId } = useLocalSearchParams<{ guestId: string }>();
  const [guest, setGuest] = useState<GuestRsvpData | null>(null);
  const [otherInvites, setOtherInvites] = useState<GuestInvitationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!guestId) return;
    const [data, invites] = await Promise.all([
      fetchGuestRsvp(guestId),
      fetchGuestInvitations(guestId).catch(() => null),
    ]);
    setGuest(data);
    if (invites) {
      setOtherInvites(invites.invitations.filter((i) => !i.isCurrent && !i.eventPassed));
    }
  }, [guestId]);

  useEffect(() => {
    if (!guestId) {
      setError('Lien RSVP invalide.');
      setLoading(false);
      return;
    }

    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Invitation introuvable.'))
      .finally(() => setLoading(false));
  }, [guestId, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de rafraîchissement.');
    } finally {
      setRefreshing(false);
    }
  };

  const rsvpFields = useMemo(() => {
    const templateContent = guest?.event?.invitations?.[0]?.template?.content;
    return extractRsvpFieldsFromTemplateContent(templateContent);
  }, [guest]);

  const handleSubmit = async (rsvp: RsvpStatus, preferences: GuestRsvpPreferences) => {
    if (!guestId) return;
    await submitGuestRsvp(guestId, { rsvp, preferences });
    await load();
  };

  const openPdf = async () => {
    if (!guestId || !guest) return;
    const url = getPdfUrl(guestId, env.apiUrl, guest.seatingInvitationPdfUrl);
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Ouverture de votre invitation…</Text>
      </View>
    );
  }

  if (error || !guest) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Invitation introuvable</Text>
        <Text style={styles.errorText}>{error || 'Ce lien RSVP est invalide ou expiré.'}</Text>
        <Button title="Retour" onPress={() => router.replace('/(auth)/login')} variant="secondary" />
      </View>
    );
  }

  const showBadge = guest.rsvp === 'ACCEPTED';
  const qrUrl = getQrCodeUrl(guest.id, env.webUrl);

  return (
    <>
      <Stack.Screen
        options={{
          title: guest.event.title,
          headerBackTitle: 'Retour',
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <RsvpEventCard guest={guest} />
          <GuestGuidelinesCard guidelines={guest.event.guestGuidelines} />

          <RsvpResponseForm guest={guest} rsvpFields={rsvpFields} onSubmit={handleSubmit} />

          {showBadge ? (
            <RsvpBadgePanel qrUrl={qrUrl} guestName={guest.firstName} />
          ) : null}

          {guest.placementAccessible && guest.tableDetails ? (
            <RsvpTablePanel tableDetails={guest.tableDetails} />
          ) : null}

          {guest.placementAccessible && guest.seatingInvitationPdfUrl ? (
            <View style={styles.pdfCard}>
              <Text style={styles.pdfTitle}>Invitation PDF</Text>
              <Text style={styles.pdfText}>
                Votre invitation avec placement de table, disponible après votre confirmation de présence.
              </Text>
              <Button title="Ouvrir le PDF" onPress={openPdf} variant="secondary" />
            </View>
          ) : guest.rsvp === 'ACCEPTED' && !guest.placementAccessible ? (
            <View style={styles.pdfCard}>
              <Text style={styles.pdfTitle}>Plan de table & PDF</Text>
              <Text style={styles.pdfText}>
                Votre carte de placement et invitation PDF vous seront envoyés après validation à
                l&apos;entrée de l&apos;événement.
              </Text>
            </View>
          ) : null}

          {otherInvites.length > 0 ? (
            <View style={styles.otherCard}>
              <Text style={styles.otherTitle}>Vos autres invitations</Text>
              {otherInvites.map((inv) => (
                <Pressable
                  key={inv.guestId}
                  style={styles.otherRow}
                  onPress={() => router.push(`/rsvp/${inv.guestId}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otherEvent}>{inv.event.title}</Text>
                    <Text style={styles.otherOrg}>{inv.organizationName}</Text>
                  </View>
                  <Text style={styles.otherLink}>Voir →</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  pdfCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  pdfText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  otherCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  otherTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  otherEvent: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  otherOrg: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  otherLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
