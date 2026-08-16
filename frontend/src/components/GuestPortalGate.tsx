'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import LegalAcceptanceModal from '@/components/LegalAcceptanceModal';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

interface GuestLegalStatus {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  requiresAcceptance: boolean;
}

export default function GuestPortalGate({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const guestId = params.guestId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [legalStatus, setLegalStatus] = useState<GuestLegalStatus | null>(null);

  useEffect(() => {
    async function loadLegalStatus() {
      if (!guestId) return;
      try {
        const data = await api.get(`/rsvp/${guestId}/legal-status`);
        setLegalStatus(data);
      } catch (err: any) {
        setError(err.message || 'Impossible de vérifier les conditions d\'utilisation.');
      } finally {
        setLoading(false);
      }
    }

    loadLegalStatus();
  }, [guestId]);

  const handleAccept = async (acceptTerms: boolean, acceptPrivacy: boolean) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post(`/rsvp/${guestId}/legal-accept`, {
        acceptTerms,
        acceptPrivacy,
      });
      setLegalStatus(data);
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer votre acceptation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const requiresAcceptance = legalStatus?.requiresAcceptance ?? true;

  return (
    <>
      <LegalAcceptanceModal
        open={requiresAcceptance}
        title="Bienvenue dans votre espace invité"
        subtitle="Avant d'accéder à vos invitations, veuillez accepter nos conditions d'utilisation et notre politique de confidentialité."
        submitting={submitting}
        error={error}
        onAccept={handleAccept}
      />

      {!requiresAcceptance && children}

      {!requiresAcceptance && (
        <PWAInstallPrompt storageKey={`pwa_install_guest_${guestId}`} variant="guest" />
      )}
    </>
  );
}
