'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, MessageSquare, Pencil, RotateCcw, Save, X, Info,
} from 'lucide-react';
import { SkeletonList } from '@/components/ui';

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
      <div className="p-6">
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
          <p className="font-bold">Variables disponibles dans les messages</p>
          <p className="text-indigo-700 dark:text-indigo-300">
            {TEMPLATE_VARIABLES.join(' · ')}
          </p>
          <p className="text-indigo-600/80 dark:text-indigo-400/80">
            Utilisez *texte* pour le gras sur WhatsApp. Ces modèles sont utilisés pour les invitations, rappels, confirmations RSVP et le formulaire de contact.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">{t.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {t.channel}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    t.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {t.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.description || t.type}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing({ ...t })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleReset(t.id)}
                  disabled={resetting === t.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {resetting === t.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  Réinitialiser
                </button>
              </div>
            </div>
            <pre className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto">
              {t.body}
            </pre>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Modifier le modèle</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nom</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                <input
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                />
              </div>
              {editing.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sujet (e-mail)</label>
                  <input
                    value={editing.subject || ''}
                    onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Corps du message</label>
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={14}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono resize-y"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Modèle actif
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
