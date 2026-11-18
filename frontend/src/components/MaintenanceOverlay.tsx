'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Construction, Mail, ShieldCheck } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';
import { BrandLogoIcon } from '@/components/SiteBrandMark';

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
        className="fixed top-0 inset-x-0 z-[10060] border-b border-amber-500/40 bg-amber-950/95 text-amber-50 px-4 py-2.5"
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
          background: 'var(--stage)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center gap-2.5 mx-auto">
          <BrandLogoIcon className="w-9 h-9" />
          <span className="font-semibold text-xl text-white tracking-tight">{site.platformName}</span>
        </div>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300">
          <Construction className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <span className="inline-flex text-xs bg-amber-400/15 border border-amber-300/25 text-amber-100 font-semibold px-2.5 py-1 rounded-md ">
            Maintenance en cours
          </span>
          <h1 id="maintenance-title" className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Nous revenons très bientôt
          </h1>
          <p id="maintenance-desc" className="text-sm sm:text-base text-white/70 leading-relaxed max-w-md mx-auto">
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

        <p className="text-xs text-white/40">
          {site.supportHours ? `Support : ${site.supportHours}` : 'Merci de votre patience.'}
        </p>
      </div>
    </div>
  );
}
