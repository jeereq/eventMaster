'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Percent, Wallet } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';

export default function SubscriptionDiscountRequestModal({
  open,
  onClose,
  planName,
  catalogAmount,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  planName: string;
  catalogAmount: number;
  submitting?: boolean;
  onSubmit: (payload: { requestedDiscountPercent?: number; requestedAmount?: number; note: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const [percent, setPercent] = useState('10');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('percent');
    setPercent('10');
    setAmount(catalogAmount > 0 ? String(Math.round(catalogAmount * 0.9)) : '');
    setNote('');
    setError('');
  }, [open, catalogAmount]);

  const preview = useMemo(() => {
    if (mode === 'amount') {
      const final = Math.max(0, Math.round(parseFloat(amount) || 0));
      const discount = Math.max(0, catalogAmount - final);
      const pct = catalogAmount > 0 ? Math.round((discount / catalogAmount) * 1000) / 10 : 0;
      return { final, pct };
    }
    const pct = Math.min(80, Math.max(1, parseFloat(percent) || 0));
    const final = Math.max(0, Math.round(catalogAmount * (1 - pct / 100)));
    return { final, pct };
  }, [mode, amount, percent, catalogAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (note.trim().length < 8) {
      setError('Expliquez le motif de votre demande (8 caractères minimum).');
      return;
    }
    try {
      await onSubmit({
        note: note.trim(),
        ...(mode === 'percent'
          ? { requestedDiscountPercent: preview.pct }
          : { requestedAmount: preview.final }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’envoyer la demande.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Demander un rabais"
      description={`${planName}${catalogAmount > 0 ? ` · catalogue ${formatFc(catalogAmount)}` : ''}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted leading-relaxed">
          Le Superadmin ou le commercial global examine votre demande. S’il l’accepte, vous recevez une notification
          avec un lien de paiement au tarif négocié. La place n’est pas activée tant que le paiement n’est pas validé.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('percent')}
            className={`flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold ${
              mode === 'percent' ? 'bg-primary text-white border-primary' : 'border-border text-muted'
            }`}
          >
            <Percent className="w-3.5 h-3.5" /> Pourcentage
          </button>
          <button
            type="button"
            onClick={() => setMode('amount')}
            className={`flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold ${
              mode === 'amount' ? 'bg-primary text-white border-primary' : 'border-border text-muted'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Montant souhaité
          </button>
        </div>

        {mode === 'percent' ? (
          <Input
            label="Rabais demandé (%)"
            type="number"
            min={1}
            max={80}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            required
          />
        ) : (
          <Input
            label="Montant souhaité (FC)"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        )}

        <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs">
          Tarif demandé : <span className="font-bold text-primary">{formatFc(preview.final)}</span>
          {preview.pct > 0 && <span className="text-muted"> · −{preview.pct} %</span>}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">Motif</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            required
            minLength={8}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
            placeholder="Ex. association, renouvellement fidèle, événement social…"
          />
        </label>

        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" className="flex-1" loading={submitting} disabled={submitting}>
            Envoyer la demande
          </Button>
        </div>
      </form>
    </Modal>
  );
}
