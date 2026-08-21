'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { XCircle, Undo, Redo, LayoutTemplate, MessageSquare, Tag } from 'lucide-react';
import { Button, Modal, Input } from '@/components/ui';
import InvitationMessagePreview from './InvitationMessagePreview';
import { toWhatsAppTone } from '@/lib/whatsappTone';
import { applyInvitationGuidelineVariables, formatGuestGuidelinesBlock } from '@/lib/guestGuidelines';
import { normalizeGuestGuidelines, type GuestGuidelines } from '@/lib/guestGuidelines';

export type InvitationFormData = {
  templateId: string;
  channel: string;
  subject: string;
  body: string;
  whatsappBody: string;
};

interface InvitationEditorModalProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  initialData: InvitationFormData;
  templates: Array<{ id: string; name: string; content?: string }>;
  messageTemplates: Array<{ id: string; name: string; content?: string }>;
  eventTitle: string;
  orgName: string;
  guestGuidelines?: GuestGuidelines;
  onSave: (data: InvitationFormData) => Promise<void>;
}

export default function InvitationEditorModal({
  open,
  onClose,
  editingId,
  initialData,
  templates,
  messageTemplates,
  eventTitle,
  orgName,
  guestGuidelines,
  onSave,
}: InvitationEditorModalProps) {
  const [data, setData] = useState<InvitationFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Undo / Redo history
  const [history, setHistory] = useState<InvitationFormData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isTyping = useRef(false);

  // Initialize history when opened
  useEffect(() => {
    if (open) {
      setData(initialData);
      setHistory([initialData]);
      setHistoryIndex(0);
      setError('');
    }
  }, [open, initialData]);

  const pushToHistory = useCallback((nextData: InvitationFormData) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(nextData);
      // Keep last 50 states max
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData(history[newIndex]);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleUndo, handleRedo]);

  const updateField = (field: keyof InvitationFormData, value: string) => {
    const nextData = { ...data, [field]: value };
    
    // Auto-fill WhatsApp body if email body is written and channel includes WA
    if (field === 'body' && !data.whatsappBody.trim() && (data.channel === 'WHATSAPP' || data.channel === 'EMAIL_AND_WHATSAPP')) {
      nextData.whatsappBody = toWhatsAppTone(value);
    }
    
    setData(nextData);
    
    // Debounce pushing to history for text inputs
    if (!isTyping.current) {
      isTyping.current = true;
      setTimeout(() => {
        pushToHistory(nextData);
        isTyping.current = false;
      }, 600);
    }
  };

  const updateSelect = (field: keyof InvitationFormData, value: string) => {
    const nextData = { ...data, [field]: value };
    setData(nextData);
    pushToHistory(nextData);
  };

  const handleApplyMessageTemplate = (id: string) => {
    const mt = messageTemplates.find((t) => t.id === id);
    if (mt) {
      const nextData = { ...data, body: mt.content || '' };
      if (!nextData.whatsappBody.trim() && (nextData.channel === 'WHATSAPP' || nextData.channel === 'EMAIL_AND_WHATSAPP')) {
        nextData.whatsappBody = toWhatsAppTone(mt.content || '');
      }
      setData(nextData);
      pushToHistory(nextData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const channelNeedsEmail = data.channel === 'EMAIL' || data.channel === 'EMAIL_AND_WHATSAPP' || data.channel === 'EMAIL_AND_SMS' || data.channel === 'ALL_CHANNELS';
  const channelNeedsWhatsApp = data.channel === 'WHATSAPP' || data.channel === 'EMAIL_AND_WHATSAPP' || data.channel === 'ALL_CHANNELS';
  const GuidelinesText = guestGuidelines ? formatGuestGuidelinesBlock(normalizeGuestGuidelines(guestGuidelines)) : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full">
          <span className="text-lg font-bold">
            {editingId ? "Modifier l'invitation" : "Créer une invitation"}
          </span>
          <div className="flex items-center gap-2 mr-6 text-muted">
            <button type="button" onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 hover:text-foreground disabled:opacity-30 rounded-lg hover:bg-surface-muted transition" title="Annuler (Ctrl+Z)">
              <Undo className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:text-foreground disabled:opacity-30 rounded-lg hover:bg-surface-muted transition" title="Rétablir (Ctrl+Y)">
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        
        {/* Éditeur */}
        <div className="flex-1 space-y-6">
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          
          {/* Section 1 : Page RSVP */}
          <div className="space-y-4 p-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/30">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              1. Le Formulaire RSVP (La page web)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Modèle de page</span>
                <select 
                  value={data.templateId}
                  onChange={(e) => updateSelect('templateId', e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Formulaire par défaut --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Canal d'envoi</span>
                <select 
                  value={data.channel}
                  onChange={(e) => updateSelect('channel', e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                >
                  <option value="EMAIL">E-mail uniquement</option>
                  <option value="WHATSAPP">WhatsApp uniquement</option>
                  <option value="EMAIL_AND_WHATSAPP">E-mail et WhatsApp</option>
                </select>
              </label>
            </div>
          </div>

          {/* Section 2 : Le Message (E-mail) */}
          {channelNeedsEmail && (
            <div className="space-y-4 p-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  2. Le Message E-mail
                </h4>
                <select 
                  onChange={(e) => handleApplyMessageTemplate(e.target.value)}
                  value=""
                  className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="">-- Modèles pré-rédigés --</option>
                  {messageTemplates.map(mt => (
                    <option key={mt.id} value={mt.id}>{mt.name}</option>
                  ))}
                </select>
              </div>
              <Input 
                label="Objet de l'e-mail"
                value={data.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="ex. Invitation officielle : Gala de Charité d'Élite"
                required
              />
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Corps du message (E-mail)</span>
                <textarea 
                  value={data.body}
                  onChange={(e) => updateField('body', e.target.value)}
                  className="w-full h-32 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Cher(e) {{firstName}}, nous vous invitons..."
                  required
                />
              </label>
            </div>
          )}

          {/* Section 3 : Le Message (WhatsApp) */}
          {channelNeedsWhatsApp && (
            <div className="space-y-4 p-4 rounded-[var(--radius-card)] border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                  {channelNeedsEmail ? '3. Le Message WhatsApp' : '2. Le Message WhatsApp'}
                </h4>
                {channelNeedsEmail && (
                  <button
                    type="button"
                    onClick={() => updateField('whatsappBody', toWhatsAppTone(data.body))}
                    className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition"
                  >
                    Adapter l'e-mail pour WhatsApp
                  </button>
                )}
              </div>
              {!channelNeedsEmail && (
                <Input 
                  label="Référence (interne)"
                  value={data.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="Référence de l'invitation"
                  required
                />
              )}
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-emerald-800/60 dark:text-emerald-400/60 uppercase tracking-wider">Corps du message (WhatsApp)</span>
                <textarea 
                  value={data.whatsappBody}
                  onChange={(e) => updateField('whatsappBody', e.target.value)}
                  className="w-full h-32 px-3.5 py-2.5 bg-surface border border-emerald-500/30 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Coucou {{firstName}} ! On t'invite..."
                  required
                />
              </label>
            </div>
          )}
          
          <div className="flex items-start gap-2 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
            <Tag className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <span className="font-semibold">Variables magiques :</span> {'{{firstName}}'}, {'{{lastName}}'}, {'{{rsvpLink}}'}, {'{{title}}'}, {'{{date}}'}, {'{{location}}'}, {'{{orgName}}'}.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" loading={saving} className="flex-1">Enregistrer l'invitation</Button>
          </div>
        </div>

        {/* Prévisualisation */}
        <div className="lg:w-[400px] shrink-0 border-l border-border pl-6 hidden lg:block">
          <h4 className="text-sm font-bold text-foreground mb-4">Prévisualisation en direct</h4>
          <div className="sticky top-6">
            <InvitationMessagePreview
              channel={data.channel}
              subject={data.subject || 'Sujet de l\'invitation'}
              body={data.body || 'Le message de l\'e-mail apparaîtra ici...'}
              whatsappBody={data.whatsappBody || 'Le message WhatsApp apparaîtra ici...'}
              orgName={orgName}
              guidelinesBlock={GuidelinesText}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
