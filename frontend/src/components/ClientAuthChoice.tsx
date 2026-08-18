'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { clientLoginHref, clientRegisterHref } from '@/lib/safeAppPath';

export default function ClientAuthChoice({
  nextPath,
  description,
  onGuest,
  guestLabel = 'Continuer en invité',
}: {
  nextPath: string;
  description: string;
  onGuest?: () => void;
  guestLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-muted leading-relaxed">{description}</p>
      <Link href={clientLoginHref(nextPath)} className="block">
        <Button type="button" fullWidth className="min-h-11">Se connecter</Button>
      </Link>
      <Link href={clientRegisterHref(nextPath)} className="block">
        <Button type="button" variant="secondary" fullWidth className="min-h-11">Créer un compte client</Button>
      </Link>
      {onGuest ? (
        <button
          type="button"
          onClick={onGuest}
          className="w-full text-sm font-semibold text-primary hover:underline py-1"
        >
          {guestLabel}
        </button>
      ) : null}
    </div>
  );
}
