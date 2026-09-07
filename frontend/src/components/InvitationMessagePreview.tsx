'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { wrapBrandedWhatsApp } from '@/lib/whatsappTone';

type PreviewTab = 'email' | 'whatsapp';

type WhatsAppToken =
  | { type: 'text'; value: string }
  | { type: 'bold' | 'italic' | 'strike'; value: string }
  | { type: 'link'; value: string };

function tokenizeWhatsApp(text: string): WhatsAppToken[] {
  const tokens: WhatsAppToken[] = [];
  const pattern =
    /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      tokens.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const chunk = match[0];
    if (chunk.startsWith('http')) {
      tokens.push({ type: 'link', value: chunk });
    } else if (chunk.startsWith('*')) {
      tokens.push({ type: 'bold', value: chunk.slice(1, -1) });
    } else if (chunk.startsWith('_')) {
      tokens.push({ type: 'italic', value: chunk.slice(1, -1) });
    } else {
      tokens.push({ type: 'strike', value: chunk.slice(1, -1) });
    }
    last = match.index + chunk.length;
  }
  if (last < text.length) {
    tokens.push({ type: 'text', value: text.slice(last) });
  }
  return tokens;
}

function WhatsAppFormattedText({ text }: { text: string }) {
  const tokens = useMemo(() => tokenizeWhatsApp(text), [text]);
  return (
    <span className="whitespace-pre-wrap break-words">
      {tokens.map((token, index) => {
        if (token.type === 'bold') {
          return (
            <strong key={index} className="font-semibold">
              {token.value}
            </strong>
          );
        }
        if (token.type === 'italic') {
          return (
            <em key={index} className="italic">
              {token.value}
            </em>
          );
        }
        if (token.type === 'strike') {
          return (
            <s key={index} className="text-slate-500">
              {token.value}
            </s>
          );
        }
        if (token.type === 'link') {
          return (
            <span key={index} className="text-[#027eb5] underline break-all">
              {token.value}
            </span>
          );
        }
        return <React.Fragment key={index}>{token.value}</React.Fragment>;
      })}
    </span>
  );
}

export default function InvitationMessagePreview({
  subject,
  body,
  whatsappBody,
  channel,
  orgName,
  primary = '#059669',
  accent = '#10b981',
  guidelinesBlock,
}: {
  subject: string;
  body: string;
  whatsappBody?: string;
  channel: string;
  orgName: string;
  primary?: string;
  accent?: string;
  guidelinesBlock?: string | null;
}) {
  const showEmail = channel !== 'WHATSAPP';
  const showWhatsApp = channel !== 'EMAIL';
  const [tab, setTab] = useState<PreviewTab>(showEmail ? 'email' : 'whatsapp');

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tab === 'email' && !showEmail) setTab('whatsapp');
    if (tab === 'whatsapp' && !showWhatsApp) setTab('email');
  }, [channel, showEmail, showWhatsApp, tab]);

  const whatsappText = useMemo(
    () =>
      wrapBrandedWhatsApp((whatsappBody || body).trim(), orgName, {
        guidelinesBlock,
      }),
    [body, whatsappBody, orgName, guidelinesBlock],
  );
  const alreadyGreets = /^(bonjour|cher|chère|salut)\b/i.test(body.trim());

  const handleCopy = async () => {
    const textToCopy = tab === 'whatsapp' ? whatsappText : (body || '');
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Aperçu en direct</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted rounded-lg border border-border transition min-h-[32px]"
            title="Copier le texte du message"
            aria-label="Copier le texte du message"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary" aria-hidden />
                <span className="text-primary font-bold">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden />
                <span>Copier</span>
              </>
            )}
          </button>
          {showEmail && showWhatsApp ? (
            <div className="inline-flex p-0.5 rounded-lg bg-surface-muted border border-border" role="tablist" aria-label="Canal d'aperçu">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'email'}
                onClick={() => setTab('email')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  tab === 'email' ? 'bg-surface text-foreground shadow-2xs' : 'text-muted hover:text-foreground',
                )}
              >
                E-mail
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'whatsapp'}
                onClick={() => setTab('whatsapp')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  tab === 'whatsapp' ? 'bg-surface text-foreground shadow-2xs' : 'text-muted hover:text-foreground',
                )}
              >
                WhatsApp
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-muted">
              {showEmail ? 'E-mail' : 'WhatsApp'}
            </span>
          )}
        </div>
      </div>

      {tab === 'email' && showEmail ? (
        <div className="rounded-2xl border border-border overflow-hidden bg-surface-muted/50">
          <div
            className="px-4 py-3.5 text-white text-center"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{orgName}</p>
            <p className="text-base font-bold mt-0.5">{subject || 'Invitation'}</p>
          </div>
          <div className="bg-surface px-4 py-4 space-y-3 text-sm text-foreground/80 leading-relaxed border-t border-border/30">
            {!alreadyGreets && (
              <p className="font-bold text-foreground">Bonjour Marie,</p>
            )}
            <p className="whitespace-pre-line">{body || 'Le texte du message apparaîtra ici.'}</p>
            <div className="text-center pt-2">
              <span
                className="inline-block text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs"
                style={{ backgroundColor: primary }}
              >
                Confirmer ma présence (RSVP)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-[#0b141a]">
          <div className="bg-[#075e54] px-4 py-3 text-white">
            <p className="text-xs uppercase tracking-wider text-white/70">WhatsApp</p>
            <p className="text-sm font-semibold truncate">{orgName || 'Organisation'}</p>
          </div>
          <div
            className="p-3 min-h-[160px]"
            style={{
              backgroundColor: '#efeae2',
              backgroundImage:
                'radial-gradient(rgba(0,0,0,0.04) 0.6px, transparent 0.6px)',
              backgroundSize: '10px 10px',
            }}
          >
            <div className="max-w-[92%] rounded-xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm text-slate-800 leading-relaxed shadow-sm">
              {whatsappText ? (
                <WhatsAppFormattedText text={whatsappText} />
              ) : (
                <span className="text-slate-500">Le message WhatsApp apparaîtra ici.</span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-2">Aperçu en direct tel que reçu par l’invité.</p>
          </div>
        </div>
      )}
    </div>
  );
}
