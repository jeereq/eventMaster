'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { 
  Calendar, Mail, Lock, Loader2, AlertCircle, ArrowLeft, 
  PartyPopper, Sun, Moon, CheckCircle2, ShieldCheck, Sparkles, 
  Users, Table, MessageSquare, Phone
} from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Le jeton de réinitialisation est manquant ou invalide.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password
      });
      setSuccess(response.message || 'Votre mot de passe a été réinitialisé avec succès !');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la réinitialisation de votre mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="font-bold text-sm">Lien invalide</span>
        </div>
        <p className="text-xs leading-relaxed font-medium">
          Ce lien de réinitialisation de mot de passe est invalide ou a expiré. Veuillez effectuer une nouvelle demande.
        </p>
        <div className="pt-2">
          <Link 
            href="/ask-reset-password" 
            className="inline-flex items-center justify-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-150"
          >
            Faire une nouvelle demande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Nouveau mot de passe</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Définissez votre nouveau mot de passe sécurisé pour vous connecter.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-bold text-sm">Mot de passe réinitialisé !</span>
          </div>
          <p className="text-xs leading-relaxed font-medium">
            {success} Redirection vers la page de connexion en cours...
          </p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition text-sm font-semibold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition text-sm font-semibold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              'Réinitialiser le mot de passe'
            )}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* SECTION GAUCHE : Description des fonctionnalités de la plateforme */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-grid-slate-100/[0.03] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
            <PartyPopper className="w-6 h-6" />
          </div>
          <span className="font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">EventMaster</span>
        </div>

        {/* Feature List */}
        <div className="space-y-8 my-auto relative z-10 max-w-lg">
          <div className="space-y-3">
            <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Sécurité</span>
            <h1 className="text-4xl font-black tracking-tight leading-tight">
              Récupérez l'accès à votre compte en toute sécurité.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Saisissez votre nouveau mot de passe pour reprendre le contrôle de votre espace d'organisation et de vos événements.
            </p>
          </div>

          <div className="space-y-5">
            {[
              {
                icon: Calendar,
                title: "Gestion d'Événements & RSVP",
                desc: "Créez vos événements, envoyez des invitations par e-mail ou WhatsApp et suivez les réponses en temps réel."
              },
              {
                icon: Table,
                title: "Planificateur de Table Immersif",
                desc: "Placez vos invités sur des tables rondes, rectangulaires ou carrées grâce à un outil de glisser-déposer intuitif."
              },
              {
                icon: MessageSquare,
                title: "Fil d'Actualité & Livre d'Or",
                desc: "Permettez à vos invités de partager des photos, vidéos, commentaires et likes comme sur un réseau social privé."
              },
              {
                icon: Sparkles,
                title: "Statistiques & Analyses",
                desc: "Visualisez les régimes alimentaires, les réponses personnalisées et exportez vos listes d'invités en un clic."
              }
            ].map((feat, idx) => (
              <div key={idx} className="flex gap-4 items-start bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] p-4 rounded-2xl transition duration-200">
                <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/10">
                  <feat.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 relative z-10 flex justify-between items-center">
          <span>© 2026 EventMaster. Tous droits réservés.</span>
          <Link href="/contact" className="hover:text-indigo-400 transition">Support technique</Link>
        </div>
      </div>

      {/* SECTION DROITE : Formulaire de réinitialisation */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-20 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />

        {/* Top Actions */}
        <div className="flex justify-end items-center relative z-10 mb-8">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        {/* Form Container */}
        <div className="max-w-md w-full mx-auto my-auto relative z-10 space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-none">
          <div className="flex justify-between items-center mb-2">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à la connexion
            </Link>
          </div>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500">Chargement de la page de réinitialisation...</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Bottom copyright on mobile */}
        <div className="text-center text-xs text-slate-400 lg:hidden mt-8">
          © 2026 EventMaster. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}
