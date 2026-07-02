'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Calendar, Mail, Lock, Loader2, ArrowLeft,
  PartyPopper, Sun, Moon, Sparkles,
  Table, MessageSquare,
} from 'lucide-react';
import { Button, Alert, Input, Card } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Identifiants incorrects ou problème de connexion.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Panneau marketing — desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
            <PartyPopper className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight">EventMaster</span>
        </div>

        <div className="space-y-8 my-auto relative z-10 max-w-lg">
          <div className="space-y-3">
            <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Plateforme tout-en-un
            </span>
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              Organisez des événements privés inoubliables.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              EventMaster simplifie chaque étape de l&apos;organisation de vos mariages, anniversaires, conférences et soirées privées.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Calendar, title: "Gestion d'événements & RSVP", desc: 'Invitations par e-mail ou WhatsApp, suivi des réponses en temps réel.' },
              { icon: Table, title: 'Planificateur de table', desc: 'Placez vos invités sur un plan 2D intuitif par glisser-déposer.' },
              { icon: MessageSquare, title: "Fil d'actualité & livre d'or", desc: 'Photos, vidéos et commentaires dans un espace privé pour vos invités.' },
              { icon: Sparkles, title: 'Statistiques & analyses', desc: 'Régimes alimentaires, réponses personnalisées et exports en un clic.' },
            ].map((feat) => (
              <div key={feat.title} className="flex gap-4 items-start bg-white/[0.03] border border-white/[0.06] hover:border-white/10 p-4 rounded-xl transition duration-200">
                <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl">
                  <feat.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 relative z-10 flex justify-between items-center">
          <span>© 2026 EventMaster</span>
          <Link href="/contact" className="hover:text-indigo-400 transition">Support</Link>
        </div>
      </div>

      {/* Formulaire */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-12 lg:p-16 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        <div className="max-w-md w-full mx-auto space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au site
          </Link>

          <Card padding="lg" className="shadow-xl dark:shadow-none dark:ring-1 dark:ring-slate-800">
            <div className="text-center lg:text-left mb-6">
              <div className="inline-flex lg:hidden items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-500/20">
                <PartyPopper className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Connexion</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Ravi de vous revoir !{' '}
                <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Créez votre compte
                </Link>
              </p>
            </div>

            {error && <Alert variant="error" className="mb-5">{error}</Alert>}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email ou numéro WhatsApp"
                id="identifier"
                name="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nom@exemple.com ou +243…"
                hint="Utilisez votre e-mail d'inscription ou votre numéro WhatsApp."
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Mot de passe
                  </label>
                  <Link href="/ask-reset-password" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </div>

              <Button type="submit" fullWidth loading={loading} size="lg">
                {loading ? 'Connexion en cours…' : 'Se connecter'}
              </Button>
            </form>
          </Card>

          <p className="text-center text-xs text-slate-400 lg:hidden">© 2026 EventMaster</p>
        </div>
      </div>
    </div>
  );
}
