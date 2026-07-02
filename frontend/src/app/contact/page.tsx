'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { 
  Mail, Phone, MapPin, Send, MessageSquare, 
  CheckCircle2, AlertCircle, Loader2, ArrowLeft, PartyPopper, Sparkles, ArrowRight, Sun, Moon, Menu, X
} from 'lucide-react';

export default function ContactPage() {
  const { user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function checkServer() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/health`);
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    }
    checkServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await api.post('/public/contact', {
        name,
        email,
        subject,
        message
      });

      setSuccess(true);
      const channelNote = response.channels?.includes('whatsapp') && response.channels?.includes('email')
        ? ' (e-mail et WhatsApp)'
        : response.channels?.includes('whatsapp')
          ? ' (WhatsApp)'
          : '';
      setSuccessMessage((response.message || 'Votre message a été envoyé avec succès !') + channelNote);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('Error sending contact message:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="w-10/12 max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <PartyPopper className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                EventMaster
              </span>
            </Link>
            
            {/* Indicateur de connexion API en temps réel */}
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className={`w-2 h-2 rounded-full ${
                serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                serverStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span>
                {serverStatus === 'online' ? 'API Connectée' : 
                 serverStatus === 'offline' ? 'API Déconnectée' : 'Vérification API...'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <Link href="/contact" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Contact
            </Link>
            {user ? (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Connecté en tant que <span className="font-bold text-indigo-600">{user.name}</span> {tenant ? `(${tenant.name})` : ''}
                </span>
                <Link href="/dashboard" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">
                  Tableau de Bord
                </Link>
                <button 
                  onClick={logout}
                  className="text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  Connexion
                </Link>
                <Link href="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4.5 py-2 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">
                  Essai Gratuit
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-6 space-y-4 animate-fade-in shadow-xl dark:shadow-lg">
            <div className="flex flex-col gap-3">
              <Link 
                href="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900"
              >
                Contact
              </Link>
              {user ? (
                <>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold py-1">
                    Connecté en tant que <span className="font-bold text-indigo-600">{user.name}</span> {tenant ? `(${tenant.name})` : ''}
                  </div>
                  <Link 
                    href="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 text-center"
                  >
                    Tableau de Bord
                  </Link>
                  <button 
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 px-4 py-2.5 rounded-xl transition cursor-pointer text-center w-full"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition py-2 border-b border-slate-100 dark:border-slate-900 text-center"
                  >
                    Connexion
                  </Link>
                  <Link 
                    href="/register" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-semibold bg-indigo-600 text-white px-4.5 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 text-center"
                  >
                    Essai Gratuit
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/40 dark:bg-indigo-950/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-100/40 dark:bg-violet-950/20 blur-[100px] pointer-events-none" />

        <div className="w-10/12 max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Contactez-nous</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Une question ? Un projet ? Parlons-en !
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Que vous soyez un particulier organisant un mariage ou une entreprise planifiant un gala, notre équipe est là pour vous accompagner.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Contact Info (2 columns) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-950 text-white rounded-3xl p-8 shadow-xl space-y-8 relative overflow-hidden border border-slate-900 dark:border-slate-800">
                <div className="absolute top-[-20%] right-[-20%] w-48 h-48 rounded-full bg-indigo-500/20 blur-[60px]" />
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold tracking-tight">Nos coordonnées</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    N'hésitez pas à nous joindre directement. Notre équipe commerciale et notre support technique sont à votre écoute.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-indigo-400 border border-slate-800/50">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Email</span>
                      <a href="mailto:mingandajeereq@gmail.com" className="text-sm font-semibold hover:text-indigo-300 transition">
                        mingandajeereq@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-indigo-400 border border-slate-800/50">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Téléphone</span>
                      <a href="tel:+243817125577" className="text-sm font-semibold hover:text-indigo-300 transition">
                        +243 817 125 577
                      </a>
                      <p className="text-[10px] text-slate-500 mt-0.5">WhatsApp disponible</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-indigo-400 border border-slate-800/50">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Adresse</span>
                      <p className="text-sm font-semibold text-slate-200">
                        Boulevard du 30 Juin, Gombe<br />
                        Kinshasa, RD Congo
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pourquoi nous contacter ?</h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      Démonstration personnalisée du produit
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      Offres sur-mesure pour grands comptes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      Support technique 24/7
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Form (3 columns) */}
            <div className="md:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-lg dark:shadow-none shadow-slate-100">
              {success ? (
                <div className="py-12 text-center space-y-6 animate-fade-in">
                  <div className="inline-flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Message envoyé !</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      {successMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md dark:shadow-none cursor-pointer"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                    Écrivez-nous
                  </h3>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                      {error}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Votre nom complet</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Jean Dupont"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition text-slate-900 dark:text-white"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Votre adresse e-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: jean.dupont@gmail.com"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition text-slate-900 dark:text-white"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sujet du message</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Demande de tarif Premium / Question technique"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition text-slate-900 dark:text-white"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Votre message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez votre besoin en détail..."
                      rows={5}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition resize-none text-slate-900 dark:text-white"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition shadow-lg dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer mon message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900 mt-auto">
        <div className="w-10/12 max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/10">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <span className="text-white font-black text-lg">EventMaster</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                La plateforme SaaS multi-tenant de référence pour la planification d'événements d'exception, la gestion d'invités RSVP et la conception de plans de table interactifs en 2D.
              </p>
            </div>

            {/* Column 2: Features */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Fonctionnalités</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="hover:text-white transition cursor-default">Plan de table interactif 2D</span></li>
                <li><span className="hover:text-white transition cursor-default">Portail RSVP personnalisé</span></li>
                <li><span className="hover:text-white transition cursor-default">Badge QR Code d'émargement</span></li>
                <li><span className="hover:text-white transition cursor-default">Import / Export Excel & CSV</span></li>
                <li><span className="hover:text-white transition cursor-default">Fil d'actualité & Livre d'or</span></li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Ressources</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/contact" className="hover:text-white transition">Contact & Support</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Conditions d&apos;utilisation</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Politique de confidentialité</Link></li>
                <li><Link href="/login" className="hover:text-white transition">Connexion Espace Organisateur</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Créer une organisation</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Contact & Support</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                <li>Email: <a href="mailto:mingandajeereq@gmail.com" className="text-slate-400 hover:text-white transition font-medium">mingandajeereq@gmail.com</a></li>
                <li>Téléphone / WhatsApp: <a href="tel:+243817125577" className="text-slate-400 hover:text-white transition font-medium">+243 817 125 577</a></li>
                <li>Adresse: <span className="text-slate-400">Boulevard du 30 Juin, Gombe, Kinshasa, RDC</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>© 2026 EventMaster SaaS. Tous droits réservés.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/terms" className="hover:text-slate-400 transition">Conditions d&apos;utilisation</Link>
              <Link href="/privacy" className="hover:text-slate-400 transition">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
