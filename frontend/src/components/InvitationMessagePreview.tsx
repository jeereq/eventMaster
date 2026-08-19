'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type PreviewTab = 'email' | 'whatsapp';

function wrapWhatsAppPreview(body: string, orgName: string): string {
  const name = orgName.trim() || 'Organisation';
  let text = body.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const firstLine = text.split('\n')[0]?.trim() || '';
  if (firstLine !== `*${name}*` && !firstLine.startsWith(`✨ *${name}*`)) {
    text = `*${name}*\n━━━━━━━━━━\n\n${text}`;
  }
  if (!text.includes(`— ${name}`)) {
    text = `${text}\n\n— ${name}`;
  }
  return text;
}

export default function InvitationMessagePreview({
  subject,
  body,
  whatsappBody,
  channel,
  orgName,
  primary = '#4f46e5',
  accent = '#6366f1',
}: {
  subject: string;
  body: string;
  whatsappBody?: string;
  channel: string;
  orgName: string;
  primary?: string;
  accent?: string;
}) {
  const showEmail = channel !== 'WHATSAPP';
  const showWhatsApp = channel !== 'EMAIL';
  const [tab, setTab] = useState<PreviewTab>(showEmail ? 'email' : 'whatsapp');

  useEffect(() => {
    if (tab === 'email' && !showEmail) setTab('whatsapp');
    if (tab === 'whatsapp' && !showWhatsApp) setTab('email');
  }, [channel, showEmail, showWhatsApp, tab]);

  const whatsappText = useMemo(
    () => wrapWhatsAppPreview((whatsappBody || body).trim(), orgName),
    [body, whatsappBody, orgName],
  );
  const alreadyGreets = /^(bonjour|cher|chère|salut)\b/i.test(body.trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Aperçu</p>
        {showEmail && showWhatsApp ? (
          <div className="inline-flex p-0.5 rounded-lg bg-surface-muted border border-border">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition',
                tab === 'email' ? 'bg-surface text-foreground shadow-sm' : 'text-muted',
              )}
            >
              E-mail
            </button>
            <button
              type="button"
              onClick={() => setTab('whatsapp')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition',
                tab === 'whatsapp' ? 'bg-surface text-foreground shadow-sm' : 'text-muted',
              )}
            >
              WhatsApp
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-muted">
            {showEmail ? 'E-mail' : 'WhatsApp'}
          </span>
        )}
      </div>

      {tab === 'email' && showEmail ? (
        <div className="rounded-2xl border border-border overflow-hidden bg-[#f8fafc]">
          <div
            className="px-4 py-3 text-white text-center"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{orgName}</p>
            <p className="text-sm font-bold mt-0.5">{subject || 'Invitation'}</p>
          </div>
          <div className="bg-white px-4 py-4 space-y-3 text-[13px] text-slate-600 leading-relaxed">
            {!alreadyGreets && (
              <p className="font-bold text-slate-900">Bonjour Marie,</p>
            )}
            <p className="whitespace-pre-line">{body || 'Le texte du message apparaîtra ici.'}</p>
            <div className="text-center pt-1">
              <span
                className="inline-block text-white text-xs font-bold px-4 py-2 rounded-xl"
                style={{ backgroundColor: primary }}
              >
                Confirmer ma présence (RSVP)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-[#efeae2] p-3">
          <div className="max-w-[92%] ml-auto rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2.5 text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
            {whatsappText || 'Le message WhatsApp apparaîtra ici.'}
          </div>
        </div>
      )}
    </div>
  );
}
