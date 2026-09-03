'use client';

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import LegalAcceptanceModal from '@/components/LegalAcceptanceModal';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import GuestBrandSync from '@/components/GuestBrandSync';
import CelebrateMood from '@/components/CelebrateMood';
import { usePlatformSite } from '@/context/PlatformSiteContext';

interface GuestLegalStatus {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  requiresAcceptance: boolean;
  branding?: {
    primary?: string;
    accent?: string;
    sidebar?: string;
  } | null;
  organizationName?: string;
}

export default function GuestPortalGate({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const { site } = usePlatformSite();
  const guestId = params.guestId as string;
  const isPrint = Boolean(pathname?.endsWith('/print'));

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [legalStatus, setLegalStatus] = useState<GuestLegalStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLegalStatus() {
      if (!guestId) return;
      setLoading(true);
      try {
        const data = await api.get(`/rsvp/${guestId}/legal-status`);
        if (cancelled) return;
        setLegalStatus(data);
        setError('');
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Impossible de vérifier les conditions d\'utilisation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLegalStatus();
    return () => {
      cancelled = true;
    };
  }, [guestId]);

  const retryLegalStatus = async () => {
    if (!guestId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/rsvp/${guestId}/legal-status`);
      setLegalStatus(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de vérifier les conditions d\'utilisation.');
    } finally {
      setLoading(false);
    }
  };
  const handleAccept = async (acceptTerms: boolean, acceptPrivacy: boolean) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post(`/rsvp/${guestId}/legal-accept`, {
        acceptTerms,
        acceptPrivacy,
      });
      setLegalStatus((prev) => ({
        ...data,
        branding: data.branding || prev?.branding,
        organizationName: data.organizationName || prev?.organizationName,
      }));
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer votre acceptation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !isPrint) {
    return (
      <div
        className="min-h-screen em-guest-page flex items-center justify-center"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden />
        <span className="sr-only">Chargement de votre espace invité…</span>
      </div>
    );
  }

  if (!isPrint && error && !legalStatus) {
    return (
      <div className="min-h-screen em-guest-page flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-4" role="alert">
          <p className="text-sm text-foreground leading-relaxed">
            {error || 'Impossible de charger votre espace invité.'}
          </p>
          <button
            type="button"
            onClick={() => void retryLegalStatus()}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-[var(--radius-button)] bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const requiresAcceptance = !isPrint && (legalStatus?.requiresAcceptance ?? true);

  return (
    <>
      {!isPrint && <CelebrateMood />}
      <GuestBrandSync branding={legalStatus?.branding} />
      <LegalAcceptanceModal
        open={requiresAcceptance}
        title="Bienvenue dans votre espace invité"
        subtitle={
          legalStatus?.organizationName
            ? `Avant d’accéder à vos invitations de ${legalStatus.organizationName}, veuillez accepter les conditions d’utilisation et la politique de confidentialité.`
            : `Avant d’accéder à vos invitations sur ${site.platformName}, veuillez accepter les conditions d’utilisation et la politique de confidentialité.`
        }
        submitting={submitting}
        error={error}
        onAccept={handleAccept}
      />

      {!requiresAcceptance && children}

      {!isPrint && !requiresAcceptance && (
        <PWAInstallPrompt storageKey={`pwa_install_guest_${guestId}`} variant="guest" />
      )}
    </>
  );
}
