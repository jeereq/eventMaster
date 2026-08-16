import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { Alert } from '../../../src/components/ui/Alert';
import { Button } from '../../../src/components/ui/Button';
import { QrScanner, QrScannerToggle } from '../../../src/components/protocol/QrScanner';
import {
  addProtocolNote,
  checkInGuest,
  fetchProtocolGuests,
  scanProtocolGuest,
  verifyGuestSeat,
} from '../../../src/lib/protocolApi';
import type { ProtocolGuest } from '../../../src/types/protocol';
import { colors } from '../../../src/theme/colors';
import type { ApiError } from '../../../src/lib/api';

function rsvpLabel(rsvp: string): string {
  if (rsvp === 'ACCEPTED') return 'Confirmé';
  if (rsvp === 'DECLINED') return 'Décliné';
  if (rsvp === 'PENDING') return 'En attente';
  return rsvp;
}

export default function ProtocolScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { planFeatures, tenant } = useAuth();
  const [guests, setGuests] = useState<ProtocolGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<ProtocolGuest | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadGuests = useCallback(async () => {
    if (!eventId) return;
    const data = await fetchProtocolGuests(eventId);
    setGuests(data);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    loadGuests()
      .catch(() => setMessage({ type: 'error', text: 'Impossible de charger les invités protocole.' }))
      .finally(() => setLoading(false));
  }, [eventId, loadGuests]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGuests();
    } finally {
      setRefreshing(false);
    }
  };

  const resolvePayload = useCallback(
    async (payload: string, fromCamera = false) => {
      if (!eventId) return;
      const trimmed = payload.trim();
      if (!trimmed) return;

      setBusy(true);
      setMessage(null);
      if (fromCamera) setCameraActive(false);

      try {
        const data = await scanProtocolGuest(eventId, trimmed);
        setSelectedGuest(data.guest);
        setScanInput(trimmed);
        setMessage({
          type: 'success',
          text: `Invité identifié : ${data.guest.firstName} ${data.guest.lastName}`,
        });
      } catch (err) {
        const apiErr = err as ApiError;
        setMessage({ type: 'error', text: apiErr.message || 'Scan invalide.' });
      } finally {
        setBusy(false);
      }
    },
    [eventId],
  );

  const handleCheckIn = async (guestId: string) => {
    if (!eventId) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await checkInGuest(eventId, guestId);
      let text = data.message;
      if (
        data.placementDelivery?.skippedReason === 'forfait' &&
        !text.includes('forfait')
      ) {
        text +=
          ' Le PDF et le GPS de placement ne sont pas inclus dans votre forfait (Premium ou supérieur requis).';
      }
      setMessage({ type: 'success', text });
      await loadGuests();
      if (selectedGuest?.id === guestId) {
        setSelectedGuest({ ...selectedGuest, checkedInAt: new Date().toISOString() });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setMessage({ type: 'error', text: apiErr.message || 'Confirmation de présence impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySeat = async (guestId: string) => {
    if (!eventId) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await verifyGuestSeat(eventId, guestId);
      let text = data.message;
      if (data.seatMatch && data.notification?.sent && data.notification.channels.length) {
        text += ` L'invité a été notifié par ${data.notification.channels.join(', ')}.`;
      } else if (
        data.seatMatch &&
        data.placementDelivery?.skippedReason === 'forfait' &&
        !text.includes('forfait')
      ) {
        text +=
          ' Le PDF et le GPS de placement ne sont pas inclus dans votre forfait (Premium ou supérieur requis).';
      }
      setMessage({ type: data.seatMatch ? 'success' : 'error', text });
      await loadGuests();
      if (selectedGuest?.id === guestId) {
        setSelectedGuest({ ...selectedGuest, seatVerified: data.seatMatch });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setMessage({ type: 'error', text: apiErr.message || 'Vérification impossible.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAddNote = async (guestId: string) => {
    if (!eventId || !note.trim()) return;
    setBusy(true);
    try {
      await addProtocolNote(eventId, guestId, note.trim());
      setNote('');
      setMessage({ type: 'success', text: 'Commentaire enregistré.' });
      await loadGuests();
    } catch (err) {
      const apiErr = err as ApiError;
      setMessage({ type: 'error', text: apiErr.message || 'Erreur commentaire.' });
    } finally {
      setBusy(false);
    }
  };

  if (!eventId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Événement introuvable.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (planFeatures && !planFeatures.protocolQr) {
    return (
      <>
        <Stack.Screen options={{ title: 'Protocole jour J' }} />
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeEmoji}>📱</Text>
          <Text style={styles.upgradeTitle}>Protocole QR non inclus</Text>
          <Text style={styles.upgradeText}>
            Le scan QR, la confirmation de présence et la vérification des sièges nécessitent le forfait{' '}
            <Text style={styles.upgradeBold}>Business</Text> ou supérieur.
          </Text>
          <Text style={styles.upgradePlan}>Forfait actuel : {tenant?.plan || 'FREE'}</Text>
        </View>
      </>
    );
  }

  const checkedInCount = guests.filter((g) => g.checkedInAt).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Protocole jour J' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.scanCard}>
          <Text style={styles.sectionTitle}>Scanner QR / identifier un invité</Text>

          <QrScannerToggle active={cameraActive} onToggle={() => setCameraActive((v) => !v)} />

          {cameraActive ? (
            <QrScanner
              active={cameraActive}
              onScan={(payload) => resolvePayload(payload, true)}
              onError={(text) => setMessage({ type: 'error', text })}
            />
          ) : null}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou saisie manuelle</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.scanInput}
            value={scanInput}
            onChangeText={setScanInput}
            placeholder="URL RSVP ou ID invité du QR code"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => resolvePayload(scanInput)}
          />
          <Button
            title="Identifier"
            onPress={() => resolvePayload(scanInput)}
            disabled={busy || !scanInput.trim()}
            loading={busy}
          />

          {message ? <Alert variant={message.type} message={message.text} /> : null}
        </View>

        {selectedGuest ? (
          <View style={styles.selectedCard}>
            <Text style={styles.guestName}>
              {selectedGuest.firstName} {selectedGuest.lastName}
            </Text>
            <Text style={styles.guestEmail}>{selectedGuest.email}</Text>
            <Text style={styles.guestMeta}>RSVP : {rsvpLabel(selectedGuest.rsvp)}</Text>
            {selectedGuest.rsvp !== 'ACCEPTED' && !selectedGuest.checkedInAt ? (
              <Text style={styles.rsvpWarn}>
                {selectedGuest.rsvp === 'PENDING'
                  ? 'RSVP en attente : l’invité doit confirmer sur son lien avant le check-in.'
                  : selectedGuest.rsvp === 'DECLINED'
                    ? 'Invitation déclinée — check-in impossible.'
                    : 'RSVP non accepté — check-in bloqué.'}
              </Text>
            ) : null}
            {selectedGuest.assignedSeat ? (
              <Text style={styles.guestSeat}>
                Siège assigné : {selectedGuest.assignedSeat.tableName} — n°
                {selectedGuest.assignedSeat.seatIndex + 1}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Button
                title={
                  selectedGuest.checkedInAt
                    ? 'Déjà confirmé'
                    : selectedGuest.rsvp !== 'ACCEPTED'
                      ? 'Check-in bloqué (RSVP)'
                      : 'Confirmer la présence'
                }
                onPress={() => handleCheckIn(selectedGuest.id)}
                disabled={
                  busy || !!selectedGuest.checkedInAt || selectedGuest.rsvp !== 'ACCEPTED'
                }
                style={styles.actionBtn}
              />
              <Button
                title="Vérifier le siège"
                onPress={() => handleVerifySeat(selectedGuest.id)}
                disabled={busy}
                variant="secondary"
                style={styles.actionBtn}
              />
              {!cameraActive ? (
                <Button
                  title="Rescanner"
                  onPress={() => setCameraActive(true)}
                  disabled={busy}
                  variant="ghost"
                  style={styles.actionBtn}
                />
              ) : null}
            </View>

            <View style={styles.noteRow}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Commentaire protocole…"
                placeholderTextColor="#94a3b8"
                onSubmitEditing={() => handleAddNote(selectedGuest.id)}
              />
              <Button
                title="Commenter"
                onPress={() => handleAddNote(selectedGuest.id)}
                disabled={busy || !note.trim()}
                variant="secondary"
                style={styles.noteBtn}
              />
            </View>

            {selectedGuest.protocolNotes && selectedGuest.protocolNotes.length > 0 ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesTitle}>Commentaires récents</Text>
                {selectedGuest.protocolNotes.map((n) => (
                  <View key={n.id} style={styles.noteItem}>
                    <Text style={styles.noteAuthor}>{n.user?.name || 'Protocole'}</Text>
                    <Text style={styles.noteDate}>
                      {new Date(n.createdAt).toLocaleString('fr-FR')}
                    </Text>
                    <Text style={styles.noteContent}>{n.content}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Suivi protocole</Text>
            <Text style={styles.listCount}>
              {checkedInCount}/{guests.length} confirmés
            </Text>
          </View>

          {guests.length === 0 ? (
            <Text style={styles.emptyList}>Aucun invité pour cet événement.</Text>
          ) : (
            guests.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setSelectedGuest(g)}
                style={[styles.guestRow, selectedGuest?.id === g.id && styles.guestRowSelected]}
              >
                <View style={styles.guestRowMain}>
                  <Text style={styles.guestRowName}>
                    {g.firstName} {g.lastName}
                  </Text>
                  <Text style={styles.guestRowEmail}>{g.email}</Text>
                  {g.assignedSeat ? (
                    <Text style={styles.guestRowSeat}>
                      {g.assignedSeat.tableName} · siège {g.assignedSeat.seatIndex + 1}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.guestRowBadges}>
                  <Text style={g.checkedInAt ? styles.badgeOk : styles.badgePending}>
                    {g.checkedInAt ? '✓' : '○'}
                  </Text>
                  {g.seatVerified ? <Text style={styles.badgeSeat}>🪑</Text> : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  upgradeCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    gap: 10,
  },
  upgradeEmoji: {
    fontSize: 36,
  },
  upgradeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#92400e',
  },
  upgradeText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#78350f',
    textAlign: 'center',
  },
  upgradeBold: {
    fontWeight: '800',
  },
  upgradePlan: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
    marginTop: 4,
  },
  scanCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  scanInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#f8fafc',
  },
  selectedCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    gap: 8,
  },
  guestName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  guestEmail: {
    fontSize: 14,
    color: colors.textMuted,
  },
  guestMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rsvpWarn: {
    fontSize: 12,
    lineHeight: 18,
    color: '#b45309',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  guestSeat: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    minHeight: 46,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'stretch',
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  noteBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
  },
  notesBlock: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#c7d2fe',
    gap: 8,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  noteItem: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  noteDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  noteContent: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyList: {
    padding: 24,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  guestRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  guestRowMain: {
    flex: 1,
    gap: 2,
  },
  guestRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  guestRowEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  guestRowSeat: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  guestRowBadges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  badgeOk: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '800',
  },
  badgePending: {
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: '800',
  },
  badgeSeat: {
    fontSize: 14,
  },
});
