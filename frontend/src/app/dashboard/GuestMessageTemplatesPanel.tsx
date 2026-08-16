'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  MessageSquare, Pencil, RotateCcw, Save, Info,
} from 'lucide-react';
import { SkeletonList, Button, Modal, Alert } from '@/components/ui';

interface GuestMessageTemplateItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  channel: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_VARIABLES = [
  '{{firstName}}', '{{lastName}}', '{{title}}', '{{description}}',
  '{{location}}', '{{date}}', '{{rsvpLink}}', '{{statusLabel}}',
  '{{dashboardUrl}}', '{{name}}', '{{email}}', '{{subject}}', '{{message}}',
  '{{preferencesDetails}}',
];

export default function GuestMessageTemplatesPanel() {
  const [templates, setTemplates] = useState<GuestMessageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GuestMessageTemplateItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/message-templates');
      setTemplates(data);
    } catch (err) {
      console.error('Error loading message templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/admin/message-templates/${editing.id}`, {
        name: editing.name,
        description: editing.description,
        channel: editing.channel,
        subject: editing.subject,
        body: editing.body,
        isActive: editing.isActive,
      });
      setEditing(null);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (id: string) => {
    if (!confirm('Réinitialiser ce modèle aux valeurs par défaut ?')) return;
    setResetting(id);
    try {
      await api.post(`/admin/message-templates/${id}/reset`, {});
      if (editing?.id === id) setEditing(null);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setResetting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-5">
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <Alert variant="info" icon={<Info className="w-5 h-5" />}>
        <p className="font-semibold text-sm mb-1">À quoi servent ces modèles ?</p>
        <p className="text-xs leading-relaxed">
          Textes sont les messages système envoyés aux invités (invitation, rappel, confirmation RSVP, contact).
          Variables : {TEMPLATE_VARIABLES.slice(0, 6).join(' · ')}…
          Sur WhatsApp, utilisez *texte* pour le gras.
        </p>
      </Alert>

      <div className="grid gap-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-surface border border-border rounded-[var(--radius-card)] p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-sm text-foreground">{t.name}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-muted border border-border text-muted">
                    {t.channel}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    t.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                      : 'bg-surface-muted text-muted border-border'
                  }`}>
                    {t.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-muted">{t.description || t.type}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button type="button" size="sm" onClick={() => setEditing({ ...t })} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                  Modifier
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleReset(t.id)}
                  loading={resetting === t.id}
                  leftIcon={resetting === t.id ? undefined : <RotateCcw className="w-3.5 h-3.5" />}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
            <pre className="text-xs bg-surface-muted border border-border rounded-[var(--radius-button)] p-3 whitespace-pre-wrap text-foreground/80 max-h-36 overflow-y-auto">
              {t.body}
            </pre>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Modifier le modèle"
        description="Les changements s’appliquent aux prochains envois automatiques."
        size="lg"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              loading={saving}
              onClick={handleSave}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Nom</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
              <input
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            {editing.channel === 'EMAIL' && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Sujet (e-mail)</label>
                <input
                  value={editing.subject || ''}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Corps du message</label>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={12}
                className="w-full px-3 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Modèle actif (utilisé pour les envois)
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
