'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Users, UserPlus, Trash2, Loader2, Crown, Mail, Phone, AlertCircle, CheckCircle2,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  isOwner: boolean;
}

export default function TeamManagement() {
  const { user, tenant } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const isOwner = Boolean(tenant?.managerId && user?.id === tenant.managerId);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await api.get('/team');
      setMembers(data.members || []);
      setIsManager(Boolean(data.isManager));
    } catch (err: any) {
      setError(err.message || 'Impossible de charger l\'équipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'USER' && tenant) {
      loadTeam();
    }
  }, [user, tenant]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/team', { name, email, password, phone: phone || undefined });
      setSuccess('Utilisateur créé avec succès.');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setShowForm(false);
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (member.isOwner) return;
    if (!confirm(`Supprimer l'utilisateur ${member.name || member.email} de l'organisation ?`)) return;
    try {
      await api.delete(`/team/${member.id}`);
      setSuccess('Utilisateur supprimé.');
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  if (user?.role !== 'USER' || !tenant) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Équipe de l&apos;organisation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isOwner
              ? 'Invitez des collaborateurs à gérer les événements avec vous.'
              : 'Membres ayant accès à l\'espace de votre organisation.'}
          </p>
        </div>
        {isManager && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un utilisateur
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {showForm && isManager && (
        <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nouvel utilisateur</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              placeholder="Nom complet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            />
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            />
            <input
              type="tel"
              placeholder="Téléphone (optionnel)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Créer l&apos;utilisateur
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Aucun membre trouvé.</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {member.name || 'Sans nom'}
                  </span>
                  {member.isOwner && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                      <Crown className="w-3 h-3" />
                      Propriétaire
                    </span>
                  )}
                  {member.id === user?.id && !member.isOwner && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">(Vous)</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>
                  {member.phone && (
                    <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>
                  )}
                </div>
              </div>
              {isManager && !member.isOwner && (
                <button
                  type="button"
                  onClick={() => handleDelete(member)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition flex-shrink-0"
                  title="Retirer de l'organisation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
