'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Calendar, Mail, Lock, Loader2, AlertCircle, ArrowLeft,
  PartyPopper, Sun, Moon, CheckCircle2, ShieldCheck, Sparkles,
  Users, Table, MessageSquare, Phone
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects ou problème de connexion.');
      setLoading(false);
    }
  };

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
            <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Plateforme Tout-en-un</span>
            <h1 className="text-4xl font-black tracking-tight leading-tight">
              Organisez des événements privés inoubliables.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              EventMaster simplifie chaque étape de l'organisation de vos mariages, anniversaires, conférences et soirées privées.
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

      {/* SECTION DROITE : Formulaire de connexion */}
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
        <div className="max-w-md w-full mx-auto my-auto relative z-10 space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-none dark:ring-1 dark:ring-slate-800">
          <div className="flex justify-between items-center mb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au site
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-500/20">
              <PartyPopper className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Connexion</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Ravi de vous revoir ! Ou{' '}
              <Link href="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition">
                créez votre compte gratuitement
              </Link>
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Adresse Email ou Numéro WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition text-sm font-semibold"
                    placeholder="nom@exemple.com ou +243..."
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Saisissez votre e-mail d'inscription ou votre numéro de téléphone WhatsApp.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <Link
                    href="/ask-reset-password"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition text-sm font-semibold"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Bottom copyright on mobile */}
        <div className="text-center text-xs text-slate-400 lg:hidden mt-8">
          © 2026 EventMaster. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}
