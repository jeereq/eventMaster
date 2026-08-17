'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import LegalAcceptanceModal from '@/components/LegalAcceptanceModal';
import { useAuth } from '@/context/AuthContext';

interface UserLegalStatus {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  requiresAcceptance: boolean;
  isFirstAcceptance?: boolean;
}

export default function UserLegalGate({ children }: { children: React.ReactNode }) {
  const { supportSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [legalStatus, setLegalStatus] = useState<UserLegalStatus | null>(null);

  useEffect(() => {
    if (supportSession) {
      setLoading(false);
      setLegalStatus({
        termsAccepted: true,
        privacyAccepted: true,
        requiresAcceptance: false,
        isFirstAcceptance: false,
      });
      return;
    }

    async function loadLegalStatus() {
      try {
        const data = await api.get('/auth/legal-status');
        setLegalStatus(data);
      } catch (err: any) {
        console.error('Legal status error:', err);
        setError(err.message || 'Impossible de vérifier les conditions d\'utilisation.');
        setLegalStatus({ termsAccepted: false, privacyAccepted: false, requiresAcceptance: true });
      } finally {
        setLoading(false);
      }
    }

    loadLegalStatus();
  }, [supportSession]);

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

  if (supportSession) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const requiresAcceptance = legalStatus?.requiresAcceptance ?? true;
  const isFirstAcceptance = legalStatus?.isFirstAcceptance ?? true;

  return (
    <>
      <LegalAcceptanceModal
        open={requiresAcceptance}
        title={isFirstAcceptance ? 'Conditions d\'utilisation' : 'Mise à jour des conditions'}
        subtitle={
          isFirstAcceptance
            ? 'Pour accéder à EventMaster après connexion, veuillez accepter nos conditions d\'utilisation et notre politique de confidentialité.'
            : 'Pour continuer à utiliser EventMaster, veuillez accepter la version actuelle de nos conditions et de notre politique de confidentialité.'
        }
        submitting={submitting}
        error={error}
        onAccept={handleAccept}
      />
      {!requiresAcceptance && children}
    </>
  );
}
