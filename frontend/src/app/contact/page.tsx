'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SITE_CONTACT } from '@/config/siteContent';
import FaqSection from '@/components/landing/FaqSection';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { 
  Mail, Phone, MapPin, Send, MessageSquare, 
  CheckCircle2, AlertCircle, Loader2, Sparkles,
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased transition-colors duration-200">
      <SiteHeader variant="contact" showServerStatus />

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

        <div className="page-container relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Contactez-nous</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              Une question ? Un projet ? Parlons-en !
            </h1>
            <p className="text-sm sm:text-base text-muted leading-relaxed">
              Que vous soyez un particulier organisant un mariage ou une entreprise planifiant un gala, notre équipe est là pour vous accompagner.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Contact Info (2 columns) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-950 text-white rounded-3xl p-8 shadow-xl space-y-8 relative overflow-hidden border border-slate-900 dark:border-slate-800">
                <div className="absolute top-[-20%] right-[-20%] w-48 h-48 rounded-full bg-primary/25 blur-[60px]" />
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold tracking-tight">Nos coordonnées</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    N'hésitez pas à nous joindre directement. Notre équipe commerciale et notre support technique sont à votre écoute.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-primary border border-slate-800/50">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Email</span>
                      <a href={`mailto:${SITE_CONTACT.email}`} className="text-sm font-semibold hover:text-primary transition">
                        {SITE_CONTACT.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-primary border border-slate-800/50">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Téléphone</span>
                      <a href={SITE_CONTACT.phoneHref} className="text-sm font-semibold hover:text-primary transition">
                        {SITE_CONTACT.phone}
                      </a>
                      <p className="text-[10px] text-slate-500 mt-0.5">{SITE_CONTACT.whatsappNote}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-primary border border-slate-800/50">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Adresse</span>
                      <p className="text-sm font-semibold text-slate-200">
                        {SITE_CONTACT.addressLine1}<br />
                        {SITE_CONTACT.addressLine2}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-6 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pourquoi nous contacter ?</h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      Démonstration personnalisée du produit
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      Offres sur-mesure pour grands comptes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
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
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-xs transition shadow-md dark:shadow-none cursor-pointer"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
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
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-950 transition text-slate-900 dark:text-white"
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
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-950 transition text-slate-900 dark:text-white"
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
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-950 transition text-slate-900 dark:text-white"
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
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-950 transition resize-none text-slate-900 dark:text-white"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold rounded-xl text-xs transition shadow-lg dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
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

      <FaqSection
        id="faq"
        title="Questions fréquentes"
        subtitle="Retrouvez les réponses aux questions les plus courantes avant de nous écrire."
        showContactLink={false}
        className="bg-white dark:bg-slate-950"
      />

      <SiteFooter faqHref="/contact#faq" />
    </div>
  );
}
