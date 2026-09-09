'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { buildReferralRegisterUrl } from '@/lib/referralLink';

interface ReferralShareButtonsProps {
  referralCode: string;
  className?: string;
}

export default function ReferralShareButtons({ referralCode, className = '' }: ReferralShareButtonsProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registerUrl = useMemo(() => buildReferralRegisterUrl(referralCode), [referralCode]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const flash = (kind: 'code' | 'link') => {
    setCopied(kind);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => {
      setCopied(null);
      flashTimeoutRef.current = null;
    }, 2000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    flash('code');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(registerUrl);
    flash('link');
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
      <Button
        type="button"
        variant="secondary"
        onClick={copyCode}
        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
      >
        {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied === 'code' ? 'Code copié' : 'Copier le code'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={copyLink}
        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
      >
        {copied === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {copied === 'link' ? 'Lien copié' : "Copier le lien d'inscription"}
      </Button>
    </div>
  );
}
