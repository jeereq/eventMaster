'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Undo, Redo, LayoutTemplate, MessageSquare, Tag, Bold, Italic, Strikethrough,
  Eye, Edit3, Mail, Check, Sparkles, ArrowRight, RefreshCw, Shirt, AlertCircle,
  Copy, CheckCircle2,
} from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import InvitationMessagePreview from './InvitationMessagePreview';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import { toWhatsAppTone } from '@/lib/whatsappTone';
import { formatGuestGuidelinesBlock, normalizeGuestGuidelines, type GuestGuidelines } from '@/lib/guestGuidelines';
import { cn } from '@/lib/cn';

const INVITATION_VARIABLES = [
  { tag: '{{rsvpLink}}', label: 'Lien RSVP', desc: 'Indispensable pour confirmer & accéder au QR pass', isCrucial: true },
  { tag: '{{firstName}}', label: 'Prénom', desc: 'Prénom de l’invité' },
  { tag: '{{lastName}}', label: 'Nom', desc: 'Nom de famille' },
  { tag: '{{title}}', label: 'Événement', desc: 'Titre de la réception' },
  { tag: '{{date}}', label: 'Date', desc: 'Date et heure de l’événement' },
  { tag: '{{location}}', label: 'Lieu', desc: 'Salle ou adresse' },
  { tag: '{{orgName}}', label: 'Organisateur', desc: 'Votre organisation ou nom' },
];

const QUICK_EMOJIS = ['🎉', '🥂', '📍', '📅', '✨', '✉️', '👗', '💍', '💼', '❤️'];

export type MessageTemplateItem = {
  id: string;
  name: string;
  subject?: string;
  body?: string;
  content?: string;
  whatsappBody?: string;
};

export type GraphicTemplateItem = {
  id: string;
  name: string;
  content?: any;
};

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
  templates: GraphicTemplateItem[];
  messageTemplates: MessageTemplateItem[];
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
  const [activeChannelTab, setActiveChannelTab] = useState<'email' | 'whatsapp'>('email');
  const [activeField, setActiveField] = useState<'subject' | 'body' | 'whatsappBody'>('body');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [previewGraphicModalOpen, setPreviewGraphicModalOpen] = useState(false);

  const selectedGraphicTemplate = templates.find((t) => t.id === data.templateId);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const whatsappBodyRef = useRef<HTMLTextAreaElement>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<InvitationFormData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Initialize data and history when modal opens
  useEffect(() => {
    if (open) {
      const normalizedInitial: InvitationFormData = {
        templateId: initialData.templateId || '',
        channel: initialData.channel || 'EMAIL_AND_WHATSAPP',
        subject: initialData.subject || (eventTitle ? `Invitation : ${eventTitle}` : ''),
        body: initialData.body || '',
        whatsappBody: initialData.whatsappBody || '',
      };

      setData(normalizedInitial);
      setHistory([normalizedInitial]);
      setHistoryIndex(0);
      setError('');
      setFeedbackMessage(null);
      setMobileTab('editor');

      if (normalizedInitial.channel === 'WHATSAPP') {
        setActiveChannelTab('whatsapp');
        setActiveField('whatsappBody');
      } else {
        setActiveChannelTab('email');
        setActiveField('body');
      }
    }
  }, [open, initialData, eventTitle]);

  const pushToHistory = useCallback((nextData: InvitationFormData) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(nextData);
      if (newHistory.length > 50) newHistory.shift();
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

    // Si on rédige le corps de l'email pour la première fois et que WhatsApp est vide, générer une version WhatsApp adaptée
    if (field === 'body' && !data.whatsappBody.trim() && (data.channel === 'WHATSAPP' || data.channel === 'EMAIL_AND_WHATSAPP')) {
      nextData.whatsappBody = toWhatsAppTone(value);
    }

    setData(nextData);

    // Debounce précis pour enregistrer fidèlement l'état final dans l'historique Undo/Redo
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      pushToHistory(nextData);
    }, 450);
  };

  const setChannel = (newChannel: string) => {
    const nextData = { ...data, channel: newChannel };
    setData(nextData);
    pushToHistory(nextData);

    if (newChannel === 'WHATSAPP') {
      setActiveChannelTab('whatsapp');
      setActiveField('whatsappBody');
    } else if (newChannel === 'EMAIL') {
      setActiveChannelTab('email');
      setActiveField('body');
    }
  };

  const handleSelectGraphicTemplate = (templateId: string) => {
    const selectedT = templates.find((t) => t.id === templateId);
    const nextData = {
      ...data,
      templateId,
      subject: data.subject.trim() || (eventTitle ? `Invitation : ${eventTitle}` : 'Invitation officielle'),
    };
    setData(nextData);
    pushToHistory(nextData);

    if (selectedT) {
      setFeedbackMessage({
        text: `Faire-part graphique « ${selectedT.name} » sélectionné pour la page RSVP.`,
        type: 'info',
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // APPLICATION D'UN MODÈLE DE MESSAGE PRÊT À L'EMPLOI
  const handleApplyMessageTemplate = (templateId: string) => {
    const mt = messageTemplates.find((t) => t.id === templateId);
    if (!mt) return;

    const templateSubject = mt.subject || (eventTitle ? `Invitation : ${eventTitle}` : 'Invitation officielle');
    const templateBody = mt.body || mt.content || '';
    const templateWhatsApp = mt.whatsappBody || (templateBody ? toWhatsAppTone(templateBody) : '');

    const nextData: InvitationFormData = {
      ...data,
      subject: templateSubject,
      body: templateBody,
      whatsappBody: templateWhatsApp,
    };

    setData(nextData);
    pushToHistory(nextData);

    setFeedbackMessage({
      text: `Modèle « ${mt.name} » appliqué pour l'E-mail et WhatsApp !`,
      type: 'success',
    });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Synchronisation E-mail -> WhatsApp
  const handleSyncToWhatsApp = () => {
    if (!data.body.trim()) return;
    const converted = toWhatsAppTone(data.body);
    const nextData = { ...data, whatsappBody: converted };
    setData(nextData);
    pushToHistory(nextData);
    setActiveChannelTab('whatsapp');
    setActiveField('whatsappBody');

    setFeedbackMessage({
      text: 'Message adapté avec succès pour WhatsApp !',
      type: 'success',
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Synchronisation WhatsApp -> E-mail
  const handleSyncToEmail = () => {
    if (!data.whatsappBody.trim()) return;
    const cleaned = data.whatsappBody
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1')
      .replace(/~([^~\n]+)~/g, '$1');

    const nextData = { ...data, body: cleaned };
    setData(nextData);
    pushToHistory(nextData);
    setActiveChannelTab('email');
    setActiveField('body');

    setFeedbackMessage({
      text: 'Message WhatsApp recopié vers le modèle E-mail !',
      type: 'success',
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const insertTextAtCursor = (field: 'subject' | 'body' | 'whatsappBody', textToInsert: string) => {
    const currentVal = data[field] || '';
    const ref = field === 'body'
      ? bodyRef.current
      : field === 'whatsappBody'
        ? whatsappBodyRef.current
        : subjectRef.current;

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

  const handleInsertGuidelines = (field: 'body' | 'whatsappBody') => {
    if (!guestGuidelines) return;
    const block = formatGuestGuidelinesBlock(normalizeGuestGuidelines(guestGuidelines));
    if (block) {
      insertTextAtCursor(field, `\n\n${block}\n`);
      setFeedbackMessage({
        text: 'Consignes d’accueil et dress code ajoutés !',
        type: 'success',
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (channelNeedsEmail && !data.body.trim()) {
      setError('Veuillez renseigner le message e-mail ou choisir un modèle pré-rédigé.');
      setActiveChannelTab('email');
      return;
    }
    if (channelNeedsWhatsApp && !data.whatsappBody.trim()) {
      setError('Veuillez renseigner le message WhatsApp ou cliquer sur « Adapter l’e-mail pour WhatsApp ».');
      setActiveChannelTab('whatsapp');
      return;
    }

    setSaving(true);
    try {
      await onSave(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement de l’invitation.');
    } finally {
      setSaving(false);
    }
  };

  const channelNeedsEmail = data.channel === 'EMAIL' || data.channel === 'EMAIL_AND_WHATSAPP' || data.channel === 'ALL_CHANNELS';
  const channelNeedsWhatsApp = data.channel === 'WHATSAPP' || data.channel === 'EMAIL_AND_WHATSAPP' || data.channel === 'ALL_CHANNELS';
  const hasGuidelines = Boolean(
    guestGuidelines && (
      guestGuidelines.dressCode?.enabled ||
      (guestGuidelines.recommendations && guestGuidelines.recommendations.length > 0) ||
      guestGuidelines.additionalNotes
    )
  );
  const GuidelinesText = guestGuidelines ? formatGuestGuidelinesBlock(normalizeGuestGuidelines(guestGuidelines)) : '';

  // Vérification de la présence de la variable critique {{rsvpLink}}
  const isRsvpLinkMissing = Boolean(
    (activeChannelTab === 'whatsapp' && channelNeedsWhatsApp && !data.whatsappBody.includes('{{rsvpLink}}')) ||
    (activeChannelTab === 'email' && channelNeedsEmail && !data.body.includes('{{rsvpLink}}'))
  );

  const emailWordCount = (data.body || '').trim().split(/\s+/).filter(Boolean).length;
  const whatsappWordCount = (data.whatsappBody || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Mail className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <span className="text-lg font-bold text-foreground block leading-tight">
                {editingId ? "Modifier l'invitation" : "Créer une invitation"}
              </span>
              <span className="text-xs text-muted block mt-0.5">
                {eventTitle ? `Pour : ${eventTitle}` : 'Personnalisation des messages aux invités'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mr-6 text-muted">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="min-h-11 min-w-11 p-2.5 flex items-center justify-center text-muted hover:text-foreground disabled:opacity-30 rounded-xl hover:bg-surface-muted transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Annuler (Ctrl+Z)"
              aria-label="Annuler la modification"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="min-h-11 min-w-11 p-2.5 flex items-center justify-center text-muted hover:text-foreground disabled:opacity-30 rounded-xl hover:bg-surface-muted transition touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
      {/* Switcher mobile Éditer / Aperçu */}
      <div className="flex lg:hidden rounded-xl bg-surface-muted p-1 border border-border mb-4" role="tablist" aria-label="Mode d'affichage">
        <button
          id="mobile-tab-editor"
          type="button"
          role="tab"
          aria-selected={mobileTab === 'editor'}
          aria-controls="mobile-panel-editor"
          onClick={() => setMobileTab('editor')}
          className={cn(
            'flex-1 min-h-11 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer touch-manipulation',
            mobileTab === 'editor' ? 'bg-surface text-foreground shadow-2xs' : 'text-muted hover:text-foreground',
          )}
        >
          <Edit3 className="w-3.5 h-3.5" aria-hidden />
          <span>Rédiger le message</span>
        </button>
        <button
          id="mobile-tab-preview"
          type="button"
          role="tab"
          aria-selected={mobileTab === 'preview'}
          aria-controls="mobile-panel-preview"
          onClick={() => setMobileTab('preview')}
          className={cn(
            'flex-1 min-h-11 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer touch-manipulation',
            mobileTab === 'preview' ? 'bg-surface text-foreground shadow-2xs' : 'text-muted hover:text-foreground',
          )}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden />
          <span>Aperçu en direct</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        {/* Colonne Principale d'Édition */}
        <div
          id="mobile-panel-editor"
          role="tabpanel"
          aria-labelledby="mobile-tab-editor"
          className={`flex-1 space-y-5 min-w-0 ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}
        >
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {feedbackMessage && (
            <div className={cn(
              'p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in-50 duration-200',
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-primary/10 border-primary/20 text-primary',
            )}>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              ÉTAPE 1 : CANAL D'ENVOI & FAIRE-PART GRAPHIQUE
          ══════════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 rounded-2xl border border-border bg-surface-muted/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-solid text-primary-foreground text-xs font-bold inline-flex items-center justify-center shrink-0">1</span>
                Canal de diffusion & Page RSVP
              </span>
            </div>

            {/* Sélecteur de canal visuel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setChannel('EMAIL_AND_WHATSAPP')}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-16 cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100',
                  data.channel === 'EMAIL_AND_WHATSAPP'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border bg-surface hover:bg-surface-muted/60',
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-xs sm:text-sm">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>+</span>
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">
                    Recommandé
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">E-mail & WhatsApp</p>
                  <p className="text-xs text-muted mt-0.5">Couverture maximale des invités</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-16 cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100',
                  data.channel === 'WHATSAPP'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-border bg-surface hover:bg-surface-muted/60',
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  {data.channel === 'WHATSAPP' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">WhatsApp seul</p>
                  <p className="text-xs text-muted mt-0.5">Direct sur smartphone & pass QR</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition flex flex-col justify-between min-h-16 cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100',
                  data.channel === 'EMAIL'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-border bg-surface hover:bg-surface-muted/60',
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Mail className="w-4 h-4 text-blue-500" />
                  {data.channel === 'EMAIL' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">E-mail seul</p>
                  <p className="text-xs text-muted mt-0.5">Lettre d'invitation classique</p>
                </div>
              </button>
            </div>

            {/* Faire-part graphique & Page RSVP */}
            <div className="pt-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                  Modèle graphique de la page RSVP
                </span>
                <p className="text-xs text-muted leading-tight">
                  Le design affiché lorsque l'invité clique sur le lien pour confirmer sa venue.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  aria-label="Sélectionner le modèle graphique de la page RSVP"
                  value={data.templateId}
                  onChange={(e) => handleSelectGraphicTemplate(e.target.value)}
                  className="flex-1 min-h-11 px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 text-foreground cursor-pointer sm:max-w-xs"
                >
                  <option value="">-- Page RSVP standard EventMaster --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      🎨 {t.name}
                    </option>
                  ))}
                </select>

                {selectedGraphicTemplate && (
                  <button
                    type="button"
                    onClick={() => setPreviewGraphicModalOpen(true)}
                    className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition cursor-pointer shrink-0 active:scale-[0.98] motion-reduce:active:scale-100 touch-manipulation"
                    title="Voir l'aperçu du faire-part graphique"
                    aria-label={`Voir l'aperçu du modèle graphique ${selectedGraphicTemplate.name}`}
                  >
                    <Eye className="w-4 h-4" aria-hidden />
                    <span>Aperçu</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              ÉTAPE 2 : MODÈLES DE MESSAGES PRÊTS À L'EMPLOI (1-CLIC)
          ══════════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-surface to-primary/5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                Modèles de message pré-rédigés (cliquez pour appliquer) :
              </span>
              <span className="text-xs text-muted">
                Remplit l'Objet, le message E-mail et WhatsApp instantanément
              </span>
            </div>

            {/* Puces de modèles à 1 clic */}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {messageTemplates.map((mt) => (
                <button
                  key={mt.id}
                  type="button"
                  onClick={() => handleApplyMessageTemplate(mt.id)}
                  className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:border-primary hover:bg-primary/10 text-xs font-semibold text-foreground transition touch-manipulation cursor-pointer shadow-2xs active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  <span>{mt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              ÉTAPE 3 : RÉDACTION DES MESSAGES (ONGLETS & OUTILS CONTEXTUELS)
          ══════════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 rounded-2xl border border-border bg-surface-muted/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-solid text-primary-foreground text-xs font-bold inline-flex items-center justify-center shrink-0">2</span>
                Rédaction du message
              </span>

              {/* Onglets E-mail / WhatsApp pour les canaux mixtes */}
              {channelNeedsEmail && channelNeedsWhatsApp && (
                <div
                  id="invitation-channel-tabs"
                  role="tablist"
                  aria-label="Canal du message"
                  className="flex items-center p-1 rounded-xl bg-surface border border-border"
                >
                  <button
                    id="channel-tab-email"
                    type="button"
                    role="tab"
                    aria-selected={activeChannelTab === 'email'}
                    aria-controls="channel-panel-email"
                    onClick={() => {
                      setActiveChannelTab('email');
                      setActiveField('body');
                    }}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer touch-manipulation',
                      activeChannelTab === 'email'
                        ? 'bg-primary-solid text-primary-foreground shadow-2xs'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Version E-mail</span>
                  </button>
                  <button
                    id="channel-tab-whatsapp"
                    type="button"
                    role="tab"
                    aria-selected={activeChannelTab === 'whatsapp'}
                    aria-controls="channel-panel-whatsapp"
                    onClick={() => {
                      setActiveChannelTab('whatsapp');
                      setActiveField('whatsappBody');
                    }}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer touch-manipulation',
                      activeChannelTab === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Version WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* Barre d'insertion des Variables Magiques */}
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Variables magiques :
                </span>
                <span className="text-xs text-muted">
                  S'insère dans : <strong className="text-primary">{activeField === 'whatsappBody' ? 'Message WhatsApp' : activeField === 'subject' ? 'Objet' : 'Message E-mail'}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {INVITATION_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertTextAtCursor(activeField, v.tag)}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition touch-manipulation cursor-pointer shadow-2xs active:scale-[0.98] motion-reduce:active:scale-100',
                      v.isCrucial
                        ? 'bg-primary-solid text-primary-foreground border border-primary shadow-xs hover:bg-primary-solid-hover'
                        : 'bg-surface-muted hover:bg-primary/10 hover:text-primary text-foreground border border-border',
                    )}
                    title={v.desc}
                  >
                    <span>{v.label}</span>
                    <span className={cn('text-xs font-mono', v.isCrucial ? 'text-primary-foreground/90 font-bold' : 'text-muted')}>
                      {v.tag}
                    </span>
                  </button>
                ))}

                {hasGuidelines && (
                  <button
                    type="button"
                    onClick={() => handleInsertGuidelines(activeChannelTab === 'whatsapp' ? 'whatsappBody' : 'body')}
                    className="inline-flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-muted text-foreground border border-border text-xs font-medium hover:bg-surface transition cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                    title="Insérer les consignes d'accueil et le dress code de l'événement"
                  >
                    <Shirt className="w-3.5 h-3.5 text-muted" aria-hidden />
                    <span>+ Consignes & Dress code</span>
                  </button>
                )}
              </div>
            </div>

            {/* Alerte si le lien RSVP est manquant dans le message en cours */}
            {isRsvpLinkMissing && (
              <div className="p-3.5 rounded-xl border border-border bg-surface text-foreground text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in-50">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <span className="text-muted leading-relaxed">
                    <strong className="text-foreground font-semibold">Pensez au lien RSVP :</strong> ajoutez <code className="text-foreground bg-surface-muted px-1 py-0.5 rounded border border-border">{"{{rsvpLink}}"}</code> pour que vos invités puissent confirmer leur présence et recevoir leur pass QR.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(activeChannelTab === 'whatsapp' ? 'whatsappBody' : 'body', '\n\n{{rsvpLink}}\n')}
                  className="px-3 py-1.5 min-h-8 rounded-lg bg-surface-muted hover:bg-surface border border-border text-foreground text-xs font-medium transition shrink-0 cursor-pointer touch-manipulation self-start sm:self-auto"
                >
                  + Insérer le lien RSVP
                </button>
              </div>
            )}

            {/* ── SOUS-SECTION E-MAIL ── */}
            {((channelNeedsEmail && activeChannelTab === 'email') || (!channelNeedsWhatsApp && channelNeedsEmail)) && (
              <div
                id="channel-panel-email"
                role="tabpanel"
                aria-labelledby="channel-tab-email"
                className="space-y-3.5 animate-in fade-in-50 duration-150"
              >
                <div className="space-y-1">
                  <label htmlFor="invitation-subject-input" className="text-xs font-semibold text-muted uppercase tracking-wider block">
                    Objet de l'e-mail
                  </label>
                  <input
                    id="invitation-subject-input"
                    ref={subjectRef}
                    value={data.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    onFocus={() => setActiveField('subject')}
                    placeholder="Ex : Invitation officielle : Gala d'Élite"
                    className="w-full min-h-11 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="invitation-body-input" className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Corps du message (E-mail)
                    </label>
                    <span className="text-xs text-muted font-mono">
                      {data.body.length} car. · {emailWordCount} mot{emailWordCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <textarea
                    id="invitation-body-input"
                    ref={bodyRef}
                    value={data.body}
                    onChange={(e) => updateField('body', e.target.value)}
                    onFocus={() => setActiveField('body')}
                    className="w-full min-h-[160px] px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm resize-y focus:ring-2 focus:ring-primary/20 text-foreground leading-relaxed"
                    placeholder="Cher(e) {{firstName}}, nous avons l'immense joie de vous inviter..."
                    required
                  />
                </div>

                {channelNeedsWhatsApp && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSyncToWhatsApp}
                      className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Adapter et synchroniser pour WhatsApp</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── SOUS-SECTION WHATSAPP ── */}
            {((channelNeedsWhatsApp && activeChannelTab === 'whatsapp') || (!channelNeedsEmail && channelNeedsWhatsApp)) && (
              <div
                id="channel-panel-whatsapp"
                role="tabpanel"
                aria-labelledby="channel-tab-whatsapp"
                className="space-y-3.5 animate-in fade-in-50 duration-150"
              >
                {!channelNeedsEmail && (
                  <div className="space-y-1">
                    <label htmlFor="invitation-ref-input" className="text-xs font-semibold text-muted uppercase tracking-wider block">
                      Titre / Référence interne de l'invitation
                    </label>
                    <input
                      id="invitation-ref-input"
                      ref={subjectRef}
                      value={data.subject}
                      onChange={(e) => updateField('subject', e.target.value)}
                      onFocus={() => setActiveField('subject')}
                      placeholder="Ex : Invitation WhatsApp - Soirée Anniversaire"
                      className="w-full min-h-11 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
                      required
                    />
                  </div>
                )}

                {/* Barre d'outils de formatage WhatsApp */}
                <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-surface border border-emerald-500/20 text-xs">
                  <span className="text-xs text-muted font-bold px-1">Mise en forme :</span>
                  <button
                    type="button"
                    onClick={() => wrapWhatsAppFormat('*')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 min-h-9 rounded-lg border border-border hover:bg-surface-muted text-foreground transition font-bold cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                    title="Mettre en gras (*texte*)"
                    aria-label="Mettre en gras"
                  >
                    <Bold className="w-3.5 h-3.5" /> Gras
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapWhatsAppFormat('_')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 min-h-9 rounded-lg border border-border hover:bg-surface-muted text-foreground transition italic cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                    title="Mettre en italique (_texte_)"
                    aria-label="Mettre en italique"
                  >
                    <Italic className="w-3.5 h-3.5" /> Italique
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapWhatsAppFormat('~')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 min-h-9 rounded-lg border border-border hover:bg-surface-muted text-foreground transition line-through cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                    title="Barrer le texte (~texte~)"
                    aria-label="Barrer le texte"
                  >
                    <Strikethrough className="w-3.5 h-3.5" /> Barré
                  </button>
                  <span className="w-px h-5 bg-border mx-1" />
                  <span className="text-xs text-muted font-bold">Émojis :</span>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertTextAtCursor('whatsappBody', emoji)}
                      className="p-1 min-h-9 min-w-9 rounded-lg hover:bg-surface-muted transition text-sm flex items-center justify-center cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                      title={`Insérer ${emoji}`}
                      aria-label={`Insérer ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="invitation-whatsapp-input" className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Corps du message (WhatsApp)
                    </label>
                    <span className="text-xs text-muted font-mono">
                      {data.whatsappBody.length} car. · {whatsappWordCount} mot{whatsappWordCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <textarea
                    id="invitation-whatsapp-input"
                    ref={whatsappBodyRef}
                    value={data.whatsappBody}
                    onChange={(e) => updateField('whatsappBody', e.target.value)}
                    onFocus={() => setActiveField('whatsappBody')}
                    className="w-full min-h-[160px] px-3.5 py-2.5 bg-surface border border-emerald-500/30 rounded-xl text-sm resize-y focus:ring-2 focus:ring-emerald-500/30 text-foreground font-sans leading-relaxed"
                    placeholder="Bonjour {{firstName}} ! On vous invite à {{title}}..."
                    required
                  />
                </div>

                {channelNeedsEmail && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSyncToEmail}
                      className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-bold text-foreground transition cursor-pointer touch-manipulation active:scale-[0.98] motion-reduce:active:scale-100"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted" />
                      <span>Copier ce texte vers le message E-mail</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Boutons d'action finaux */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button variant="secondary" onClick={onClose} className="flex-1 min-h-11">
              Annuler
            </Button>
            <Button type="submit" loading={saving} className="flex-1 min-h-11" leftIcon={<Check className="w-4 h-4" />}>
              {editingId ? "Enregistrer les modifications" : "Créer l'invitation"}
            </Button>
          </div>
        </div>

        {/* Colonne de Prévisualisation Temps Réel */}
        <div
          id="mobile-panel-preview"
          role="tabpanel"
          aria-labelledby="mobile-tab-preview"
          className={`lg:w-[400px] shrink-0 lg:border-l lg:border-border lg:pl-6 ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span>Aperçu en direct</span>
            </h4>
            <span className="text-xs font-semibold text-muted">
              {data.channel === 'EMAIL_AND_WHATSAPP' ? 'Multi-canal' : data.channel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'}
            </span>
          </div>

          <div className="sticky top-6">
            <InvitationMessagePreview
              channel={data.channel}
              subject={data.subject || 'Sujet de l’invitation'}
              body={data.body || 'Le message de l’e-mail apparaîtra ici après rédaction ou choix d’un modèle...'}
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
                leftIcon={<Edit3 className="w-4 h-4" />}
              >
                Retour à la rédaction du message
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>

    {selectedGraphicTemplate && (
      <TemplatePreviewModal
        open={previewGraphicModalOpen}
        onClose={() => setPreviewGraphicModalOpen(false)}
        template={{
          id: selectedGraphicTemplate.id,
          name: selectedGraphicTemplate.name,
          content: selectedGraphicTemplate.content,
          createdAt: '',
        }}
        isOwnerOrManager={true}
      />
    )}
  </>
  );
}
