import { useEffect, useState } from 'react';
import { api } from './api';
import type { VerificationMethod } from '../types/auth';

/**
 * Canaux de communication activés par le superadmin (réglages plateforme).
 * Un canal désactivé n’est ni mentionné ni proposé dans l’application.
 */
export type PlatformChannels = {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  /** Méthodes de validation proposées par l’application (e-mail / WhatsApp). */
  otpMethods: VerificationMethod[];
};

type PublicSite = { notificationChannels?: string[]; authOtpChannels?: string };

// Prudence tant que la plateforme n’a pas répondu : aucun canal téléphone n’est annoncé.
const FALLBACK: PlatformChannels = { email: true, whatsapp: false, sms: false, otpMethods: ['EMAIL'] };

let cache: PlatformChannels | null = null;
let pending: Promise<PlatformChannels> | null = null;

function otpMethodsFrom(authOtpChannels: string | undefined, whatsapp: boolean): VerificationMethod[] {
  const raw = String(authOtpChannels || 'BOTH').toUpperCase();
  const allowsEmail = ['EMAIL', 'BOTH', 'EMAIL_WHATSAPP', 'EMAIL_SMS', 'ALL'].includes(raw);
  const allowsWhatsApp = ['WHATSAPP', 'BOTH', 'EMAIL_WHATSAPP', 'WHATSAPP_SMS', 'ALL'].includes(raw);
  const methods: VerificationMethod[] = [];
  if (allowsEmail) methods.push('EMAIL');
  if (allowsWhatsApp && whatsapp) methods.push('WHATSAPP');
  return methods.length > 0 ? methods : ['EMAIL'];
}

export function loadPlatformChannels(): Promise<PlatformChannels> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api
      .get<PublicSite>('/public/site')
      .then((site) => {
        const set = new Set((site.notificationChannels || []).map((c) => String(c).toUpperCase()));
        const whatsapp = set.has('WHATSAPP');
        cache = {
          email: set.size === 0 || set.has('EMAIL'),
          whatsapp,
          sms: set.has('SMS'),
          otpMethods: otpMethodsFrom(site.authOtpChannels, whatsapp),
        };
        return cache;
      })
      .catch(() => FALLBACK)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function usePlatformChannels(): PlatformChannels {
  const [channels, setChannels] = useState<PlatformChannels>(cache ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    void loadPlatformChannels().then((next) => {
      if (alive) setChannels(next);
    });
    return () => {
      alive = false;
    };
  }, []);
  return channels;
}
