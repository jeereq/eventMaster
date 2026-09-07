'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { XCircle, Undo, Redo, LayoutTemplate, MessageSquare, Tag, Bold, Italic, Strikethrough, Smile, Eye, Edit3 } from 'lucide-react';
import { Button, Modal, Input } from '@/components/ui';
import InvitationMessagePreview from './InvitationMessagePreview';
import { toWhatsAppTone } from '@/lib/whatsappTone';
import { applyInvitationGuidelineVariables, formatGuestGuidelinesBlock } from '@/lib/guestGuidelines';
import { normalizeGuestGuidelines, type GuestGuidelines } from '@/lib/guestGuidelines';

const INVITATION_VARIABLES = [
  { tag: '{{firstName}}', label: 'Prénom' },
  { tag: '{{lastName}}', label: 'Nom' },
  { tag: '{{rsvpLink}}', label: 'Lien RSVP' },
  { tag: '{{title}}', label: 'Événement' },
  { tag: '{{date}}', label: 'Date' },
  { tag: '{{location}}', label: 'Lieu' },
  { tag: '{{orgName}}', label: 'Organisation' },
];

const QUICK_EMOJIS = ['🎉', '🥂', '📍', '📅', '✨', '✉️', '👗', '💍'];

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
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [activeField, setActiveField] = useState<'subject' | 'body' | 'whatsappBody'>('body');

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const whatsappBodyRef = useRef<HTMLTextAreaElement>(null);

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
      setMobileTab('editor');
    }
  }, [open, initialData]);

  const pushToHistory = useCallback((nextData: InvitationFormData) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(nextData);
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

  const insertTextAtCursor = (field: 'subject' | 'body' | 'whatsappBody', textToInsert: string) => {
    const currentVal = data[field] || '';
    const ref = field === 'body' ? bodyRef.current : field === 'whatsappBody' ? whatsappBodyRef.current : null;

    if (ref && typeof ref.selectionStart === 'number' && typeof ref.selectionEnd === 'number') {
      const start = ref.selectionStart;
      const end = ref.selectionEnd;
      const nextVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
      updateField(field, nextVal);
      setTimeout(() => {
        ref.focus();
        ref.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
    } else {
      const nextVal = currentVal ? `${currentVal} ${textToInsert}` : textToInsert;
      updateField(field, nextVal);
    }
  };

  const wrapWhatsAppFormat = (symbol: '*' | '_' | '~') => {
    const ref = whatsappBodyRef.current;
    const currentVal = data.whatsappBody || '';
    if (ref && typeof ref.selectionStart === 'number' && typeof ref.selectionEnd === 'number') {
      const start = ref.selectionStart;
      const end = ref.selectionEnd;
      if (start !== end) {
        const selectedText = currentVal.substring(start, end);
        const nextVal = currentVal.substring(0, start) + `${symbol}${selectedText}${symbol}` + currentVal.substring(end);
        updateField('whatsappBody', nextVal);
        setTimeout(() => {
          ref.focus();
          ref.setSelectionRange(start + 1, end + 1);
        }, 0);
        return;
      }
    }
    insertTextAtCursor('whatsappBody', `${symbol}mot${symbol}`);
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

  const emailWordCount = (data.body || '').trim().split(/\s+/).filter(Boolean).length;
  const whatsappWordCount = (data.whatsappBody || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full">
          <span className="text-lg font-bold text-foreground">
            {editingId ? "Modifier l'invitation" : "Créer une invitation"}
          </span>
          <div className="flex items-center gap-1.5 mr-6 text-muted">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="min-h-11 min-w-11 p-2.5 flex items-center justify-center text-muted hover:text-foreground disabled:opacity-30 rounded-xl hover:bg-surface-muted transition touch-manipulation active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler la modification"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="min-h-11 min-w-11 p-2.5 flex items-center justify-center text-muted hover:text-foreground disabled:opacity-30 rounded-xl hover:bg-surface-muted transition touch-manipulation active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Rétablir (Ctrl+Y)"
              aria-label="Rétablir la modification"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      }
      size="xl"
    >
      {/* Mobile Switcher Éditer / Aperçu */}
      <div className="flex lg:hidden rounded-xl bg-surface-muted p-1 border border-border mb-4" role="tablist" aria-label="Mode d'affichage">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'editor'}
          onClick={() => setMobileTab('editor')}
          className={`flex-1 min-h-11 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
            mobileTab === 'editor' ? 'bg-surface text-foreground shadow-2xs' : 'text-muted hover:text-foreground'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" aria-hidden />
          Rédiger le message
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'preview'}
          onClick={() => setMobileTab('preview')}
          className={`flex-1 min-h-11 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
            mobileTab === 'preview' ? 'bg-surface text-foreground shadow-2xs' : 'text-muted hover:text-foreground'
          }`}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden />
          Aperçu en direct
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        {/* Éditeur */}
        <div className={`flex-1 space-y-5 ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          
          {/* Section 1 : Page RSVP */}
          <div className="space-y-4 p-4 rounded-[var(--radius-card)] border border-border bg-surface-muted/30">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              1. Formulaire RSVP & Canal de diffusion
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Modèle de formulaire</span>
                <select 
                  value={data.templateId}
                  onChange={(e) => updateSelect('templateId', e.target.value)}
                  className="w-full min-h-11 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
                >
                  <option value="">-- Formulaire par défaut --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Canal d’envoi</span>
                <select 
                  value={data.channel}
                  onChange={(e) => updateSelect('channel', e.target.value)}
                  className="w-full min-h-11 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
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
                  className="min-h-9 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
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
                onFocus={() => setActiveField('subject')}
                placeholder="ex. Invitation officielle : Gala de Charité d'Élite"
                required
              />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Corps du message (E-mail)</span>
                  <span className="text-xs text-muted font-mono">
                    {data.body.length} car. · {emailWordCount} mot{emailWordCount > 1 ? 's' : ''}
                  </span>
                </div>
                <textarea 
                  ref={bodyRef}
                  value={data.body}
                  onChange={(e) => updateField('body', e.target.value)}
                  onFocus={() => setActiveField('body')}
                  className="w-full min-h-[140px] px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm resize-y focus:ring-2 focus:ring-primary/20 text-foreground"
                  placeholder="Cher(e) {{firstName}}, nous vous invitons..."
                  required
                />
              </div>
            </div>
          )}

          {/* Section 3 : Le Message (WhatsApp) */}
          {channelNeedsWhatsApp && (
            <div className="space-y-4 p-4 rounded-[var(--radius-card)] border border-emerald-500/25 bg-emerald-500/5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                  {channelNeedsEmail ? '3. Le Message WhatsApp' : '2. Le Message WhatsApp'}
                </h4>
                <div className="flex items-center gap-2">
                  {channelNeedsEmail && (
                    <button
                      type="button"
                      onClick={() => updateField('whatsappBody', toWhatsAppTone(data.body))}
                      className="min-h-9 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition"
                    >
                      Adapter l'e-mail pour WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {!channelNeedsEmail && (
                <Input 
                  label="Référence (interne)"
                  value={data.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  onFocus={() => setActiveField('subject')}
                  placeholder="Référence de l'invitation"
                  required
                />
              )}

              {/* Barre d'outils de mise en forme WhatsApp */}
              <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-lg bg-surface border border-emerald-500/20 text-xs">
                <span className="text-xs text-muted font-semibold px-1">Mise en forme :</span>
                <button
                  type="button"
                  onClick={() => wrapWhatsAppFormat('*')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded border border-border hover:bg-surface-muted text-foreground transition font-bold"
                  title="Mettre en gras (*texte*)"
                  aria-label="Mettre en gras"
                >
                  <Bold className="w-3 h-3" /> Gras
                </button>
                <button
                  type="button"
                  onClick={() => wrapWhatsAppFormat('_')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded border border-border hover:bg-surface-muted text-foreground transition italic"
                  title="Mettre en italique (_texte_)"
                  aria-label="Mettre en italique"
                >
                  <Italic className="w-3 h-3" /> Italique
                </button>
                <button
                  type="button"
                  onClick={() => wrapWhatsAppFormat('~')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded border border-border hover:bg-surface-muted text-foreground transition line-through"
                  title="Barrer le texte (~texte~)"
                  aria-label="Barrer le texte"
                >
                  <Strikethrough className="w-3 h-3" /> Barré
                </button>
                <span className="w-px h-4 bg-border mx-1" />
                <span className="text-xs text-muted font-semibold">Émojis :</span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertTextAtCursor('whatsappBody', emoji)}
                    className="p-1 min-h-[32px] min-w-[32px] rounded hover:bg-surface-muted transition text-sm flex items-center justify-center cursor-pointer"
                    title={`Insérer ${emoji}`}
                    aria-label={`Insérer ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800/80 dark:text-emerald-400 uppercase tracking-wider">Corps du message (WhatsApp)</span>
                  <span className="text-xs text-muted font-mono">
                    {data.whatsappBody.length} car. · {whatsappWordCount} mot{whatsappWordCount > 1 ? 's' : ''}
                  </span>
                </div>
                <textarea 
                  ref={whatsappBodyRef}
                  value={data.whatsappBody}
                  onChange={(e) => updateField('whatsappBody', e.target.value)}
                  onFocus={() => setActiveField('whatsappBody')}
                  className="w-full min-h-[140px] px-3.5 py-2.5 bg-surface border border-emerald-500/30 rounded-xl text-sm resize-y focus:ring-2 focus:ring-emerald-500/30 text-foreground"
                  placeholder="Coucou {{firstName}} ! On t'invite..."
                  required
                />
              </div>
            </div>
          )}
          
          {/* Variables magiques interactives */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Variables magiques (cliquez pour insérer) :
              </span>
              <span className="text-xs text-muted">
                Insère dans : <span className="font-semibold text-foreground">{activeField === 'whatsappBody' ? 'WhatsApp' : activeField === 'subject' ? 'Objet' : 'E-mail'}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {INVITATION_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertTextAtCursor(activeField, v.tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-lg bg-surface border border-primary/30 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition cursor-pointer shadow-2xs"
                  title={`Insérer ${v.tag}`}
                >
                  <span>{v.label}</span>
                  <span className="text-[11px] opacity-70 font-mono">{v.tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-border">
            <Button variant="secondary" onClick={onClose} className="flex-1 min-h-11">Annuler</Button>
            <Button type="submit" loading={saving} className="flex-1 min-h-11">Enregistrer l'invitation</Button>
          </div>
        </div>

        {/* Prévisualisation */}
        <div className={`lg:w-[400px] shrink-0 lg:border-l lg:border-border lg:pl-6 ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
          <h4 className="text-sm font-bold text-foreground mb-4 hidden lg:block">Prévisualisation en direct</h4>
          <div className="sticky top-6">
            <InvitationMessagePreview
              channel={data.channel}
              subject={data.subject || 'Sujet de l\'invitation'}
              body={data.body || 'Le message de l\'e-mail apparaîtra ici...'}
              whatsappBody={data.whatsappBody || 'Le message WhatsApp apparaîtra ici...'}
              orgName={orgName}
              guidelinesBlock={GuidelinesText}
            />
            {mobileTab === 'preview' && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMobileTab('editor')}
                className="w-full mt-4 min-h-11 lg:hidden"
              >
                Retour à l'édition du message
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
