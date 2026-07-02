'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  User, Mail, Phone, Lock, Building, Loader2, 
  AlertCircle, CheckCircle2, ShieldCheck, Save, Award, Calendar
} from 'lucide-react';
import TeamManagement from '../TeamManagement';
import RoomsManagement from '../RoomsManagement';

export default function ProfilePage() {
  const { user, tenant, updateUserAndTenant } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tenantName, setTenantName] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
    if (tenant) {
      setTenantName(tenant.name || '');
    }
  }, [user, tenant]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.put('/auth/profile', {
        name,
        email,
        phone,
        password: password || undefined,
        tenantName: user?.role !== 'SUPER_ADMIN' ? tenantName : undefined,
      });

      // Update local state and localStorage
      updateUserAndTenant(data.user, data.tenant);
      
      setSuccess(data.message || 'Profil mis à jour avec succès !');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  // Get user initials
  const getInitials = (userName: string) => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mon Compte</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez vos informations personnelles, de contact, de sécurité et visualisez votre statut d'organisation.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute inset-0 bg-grid-slate-100/[0.02] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
            {getInitials(name)}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">{name || 'Utilisateur'}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-slate-300 font-semibold">
              <span className="bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">{user?.role}</span>
              {tenant && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  {tenant.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {tenant && user?.role !== 'SUPER_ADMIN' && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 min-w-[220px] relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonnement Actuel</span>
            </div>
            <div>
              <div className="text-lg font-black text-white">Plan {tenant.plan}</div>
              {tenant.licenseExpiresAt ? (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Expire le : {new Date(tenant.licenseExpiresAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              ) : (
                <div className="text-[11px] text-emerald-400 font-medium mt-1">Licence à vie active</div>
              )}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Information Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <User className="w-5 h-5 text-indigo-600" />
              Informations Personnelles
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nom Complet</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Adresse Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                    placeholder="jean.dupont@exemple.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Numéro de Téléphone (WhatsApp)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                    placeholder="Ex: +243990000000"
                  />
                </div>
              </div>

              {user?.role !== 'SUPER_ADMIN' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nom de l'Organisation</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Building className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                      placeholder="Ma Compagnie"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security / Password Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Lock className="w-5 h-5 text-indigo-600" />
              Sécurité du Compte
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                    placeholder="Laisser vide pour ne pas modifier"
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Confirmer le nouveau mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition"
                    placeholder="Laisser vide pour ne pas modifier"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Règles de sécurité :</p>
                <ul className="list-disc list-inside space-y-0.5 font-medium">
                  <li>Le mot de passe doit comporter au moins 6 caractères.</li>
                  <li>Utilisez des lettres, chiffres et caractères spéciaux pour plus de sécurité.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer les Modifications
              </>
            )}
          </button>
        </div>
      </form>

      {user?.role === 'USER' && tenant && <TeamManagement />}
      {user?.role === 'USER' && tenant && <RoomsManagement />}
    </div>
  );
}
