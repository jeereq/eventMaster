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
      <div className="min-h-screen em-guest-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
