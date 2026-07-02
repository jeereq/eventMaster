'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Calendar, Mail, Lock, User, Building, Loader2, AlertCircle, ArrowLeft, PartyPopper, Phone, MessageSquare, Sun, Moon } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (verificationMethod === 'WHATSAPP' && !phone) {
      setError('Le numéro de téléphone est obligatoire pour la confirmation par WhatsApp.');
      setLoading(false);
      return;
    }

    try {
      const res = await register(email, password, name, tenantName, phone, verificationMethod);
      setSuccessMessage(res.message);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la création du compte.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />

      {/* Bouton Retour à l'accueil */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </div>

      {/* Bouton Thème */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-sm"
          aria-label="Changer de thème"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-none relative z-10 my-8">
        {successMessage ? (
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30 p-4 rounded-full text-emerald-600 dark:text-emerald-400 mb-2 shadow-inner">
              {verificationMethod === 'WHATSAPP' ? (
                <MessageSquare className="w-12 h-12" />
              ) : (
                <Mail className="w-12 h-12" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {verificationMethod === 'WHATSAPP' ? 'Vérifiez votre WhatsApp' : 'Vérifiez votre boîte mail'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {successMessage}
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg dark:shadow-none shadow-indigo-100"
              >
                Aller à la page de connexion
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="inline-flex items-center justify-center bg-indigo-600 p-3 rounded-2xl text-white mb-4 shadow-lg dark:shadow-none shadow-indigo-100">
                <PartyPopper className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Inscription SaaS</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Ou{' '}
                <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition">
                  connectez-vous à votre espace existant
                </Link>
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Votre Nom Complet
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition sm:text-sm"
                      placeholder="Jean Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tenantName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom de l'Organisation / Entreprise (SaaS Tenant)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Building className="w-5 h-5" />
                    </div>
                    <input
                      id="tenantName"
                      name="tenantName"
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition sm:text-sm"
                      placeholder="Ma Compagnie Evénementielle"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition sm:text-sm"
                      placeholder="nom@exemple.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition sm:text-sm"
                      placeholder="Minimum 6 caractères"
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Numéro de Téléphone (WhatsApp)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition sm:text-sm"
                      placeholder="Ex: +243990000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Méthode de confirmation du compte
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('EMAIL')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-bold transition cursor-pointer ${verificationMethod === 'EMAIL' ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <Mail className="w-4 h-4" />
                      Par E-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('WHATSAPP')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-bold transition cursor-pointer ${verificationMethod === 'WHATSAPP' ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Par WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300 rounded transition cursor-pointer"
                  />
                </div>
                <div className="ml-3 text-xs text-slate-600 dark:text-slate-400">
                  <label htmlFor="terms" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    J'accepte les Conditions Générales d'Utilisation et certifie l'isolation de mes données.
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg dark:shadow-none shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Création du compte...
                    </>
                  ) : (
                    'Créer mon espace SaaS'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
