'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import LegalAcceptanceModal from '@/components/LegalAcceptanceModal';

interface UserLegalStatus {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  requiresAcceptance: boolean;
}

export default function UserLegalGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [legalStatus, setLegalStatus] = useState<UserLegalStatus | null>(null);

  useEffect(() => {
    async function loadLegalStatus() {
      try {
        const data = await api.get('/auth/legal-status');
        setLegalStatus(data);
      } catch (err) {
        console.error('Legal status error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLegalStatus();
  }, []);

  const handleAccept = async (acceptTerms: boolean, acceptPrivacy: boolean) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post('/auth/legal-accept', {
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
    return <>{children}</>;
  }

  const requiresAcceptance = legalStatus?.requiresAcceptance ?? false;

  return (
    <>
      <LegalAcceptanceModal
        open={requiresAcceptance}
        title="Mise à jour des conditions"
        subtitle="Pour continuer à utiliser EventMaster, veuillez accepter la version actuelle de nos conditions et de notre politique de confidentialité."
        submitting={submitting}
        error={error}
        onAccept={handleAccept}
      />
      {!requiresAcceptance && children}
      {requiresAcceptance && (
        <div className="fixed inset-0 z-[190] bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm" />
      )}
    </>
  );
}
