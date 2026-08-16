'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Construction, Mail, PartyPopper, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';

const AUTH_ESCAPE_PATHS = ['/login', '/ask-reset-password', '/reset-password'];

/**
 * Écran plein écran au-dessus de toute la page pendant la maintenance.
 * Les Super Admin connectés (et les routes login) voient un bandeau discret.
 */
export default function MaintenanceOverlay() {
  const { site, ready } = usePlatformSite();
  const { user } = useAuth();
  const pathname = usePathname() || '';

  if (!ready || !site.maintenanceMode) return null;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAuthEscape = AUTH_ESCAPE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isSuperAdmin || isAuthEscape) {
    return (
      <div
        role="status"
        className="fixed top-0 inset-x-0 z-[10060] border-b border-amber-500/40 bg-amber-950/95 text-amber-50 px-4 py-2.5 backdrop-blur-md"
      >
        <div className="page-container flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
          <p className="font-semibold flex items-center gap-2">
            <Construction className="w-4 h-4 shrink-0 text-amber-300" />
            {isSuperAdmin
              ? 'Mode maintenance actif — accès Super Admin'
              : 'Mode maintenance — connexion administrateur uniquement'}
          </p>
          <p className="text-xs text-amber-100/75 sm:text-right max-w-xl leading-relaxed">
            {site.maintenanceMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-desc"
      className="fixed inset-0 z-[10060] flex items-center justify-center p-5 sm:p-8"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(145deg, var(--auth-from, #312e81) 0%, var(--auth-via, #1e1b4b) 45%, #020617 100%)`,
        }}
      />
      <div
        className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] opacity-35 pointer-events-none"
        style={{ background: `rgb(var(--auth-glow, 79, 70, 229))` }}
      />
      <div
        className="absolute bottom-[-25%] right-[-15%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{ background: `rgb(var(--auth-glow, 79, 70, 229))` }}
      />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, white 0.5px, transparent 0.5px), radial-gradient(circle at 80% 60%, white 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-lg text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center gap-2.5 mx-auto">
          <div className="bg-primary p-2.5 rounded-[var(--radius-button)] text-white shadow-lg">
            <PartyPopper className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xl text-white tracking-tight">{site.platformName}</span>
        </div>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300">
          <Construction className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <span className="inline-flex text-[10px] bg-amber-400/15 border border-amber-300/25 text-amber-100 font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
            Maintenance en cours
          </span>
          <h1 id="maintenance-title" className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Nous revenons très bientôt
          </h1>
          <p id="maintenance-desc" className="text-sm sm:text-[15px] text-white/70 leading-relaxed max-w-md mx-auto">
            {site.maintenanceMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
          <a href={`mailto:${site.supportEmail}`}>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/15"
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Contacter le support
            </Button>
          </a>
          <Link href="/login">
            <Button type="button" className="w-full sm:w-auto" leftIcon={<ShieldCheck className="w-4 h-4" />}>
              Accès administrateur
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-white/40">
          {site.supportHours ? `Support : ${site.supportHours}` : 'Merci de votre patience.'}
        </p>
      </div>
    </div>
  );
}
