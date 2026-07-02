'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  Mail, Phone, MapPin, Send, MessageSquare, 
  CheckCircle2, AlertCircle, Loader2, ArrowLeft, PartyPopper, Sparkles
} from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      setSuccessMessage(response.message || 'Votre message a été envoyé avec succès !');
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-10/12 max-w-7xl mx-auto h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PartyPopper className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              EventMaster
            </span>
          </Link>
          <Link 
            href="/" 
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/40 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-100/40 blur-[100px] pointer-events-none" />

        <div className="w-10/12 max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Contactez-nous</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Une question ? Un projet ? Parlons-en !
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Que vous soyez un particulier organisant un mariage ou une entreprise planifiant un gala, notre équipe est là pour vous accompagner.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Contact Info (2 columns) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-8 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-20%] w-48 h-48 rounded-full bg-indigo-500/20 blur-[60px]" />
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold tracking-tight">Nos coordonnées</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    N'hésitez pas à nous joindre directement. Notre équipe commerciale et notre support technique sont à votre écoute.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-800 p-3 rounded-xl text-indigo-400 border border-slate-700/50">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Email</span>
                      <a href="mailto:contact@eventmaster.cd" className="text-sm font-semibold hover:text-indigo-300 transition">
                        contact@eventmaster.cd
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-800 p-3 rounded-xl text-indigo-400 border border-slate-700/50">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Téléphone</span>
                      <a href="tel:+243810000000" className="text-sm font-semibold hover:text-indigo-300 transition">
                        +243 810 000 000
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-800 p-3 rounded-xl text-indigo-400 border border-slate-700/50">
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

                <div className="border-t border-slate-800 pt-6 space-y-3">
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
            <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-lg shadow-slate-100">
              {success ? (
                <div className="py-12 text-center space-y-6 animate-fade-in">
                  <div className="inline-flex items-center justify-center bg-emerald-50 text-emerald-600 p-4 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-slate-900">Message envoyé !</h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      {successMessage}
                    </p>
                  </div>
                  <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-100"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
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
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Votre nom complet</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Jean Dupont"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Votre adresse e-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: jean.dupont@gmail.com"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sujet du message</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Demande de tarif Premium / Question technique"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Votre message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez votre besoin en détail..."
                      rows={5}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition resize-none"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
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
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="w-10/12 max-w-7xl mx-auto text-center sm:flex sm:justify-between sm:items-center">
          <div className="flex items-center justify-center gap-2 mb-4 sm:mb-0">
            <PartyPopper className="w-5 h-5 text-indigo-500" />
            <span className="text-white font-bold">EventMaster</span>
          </div>
          <p className="text-xs">© 2026 EventMaster SaaS. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
