'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import FaqSection from '@/components/landing/FaqSection';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { Alert, Button, Input } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react';

export default function ContactPage() {
  const { site } = usePlatformSite();
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
        message,
      });

      setSuccess(true);
      const channelNote =
        response.channels?.includes('whatsapp') && response.channels?.includes('email')
          ? ' (e-mail et WhatsApp)'
          : response.channels?.includes('whatsapp')
            ? ' (WhatsApp)'
            : '';
      setSuccessMessage(
        (response.message || 'Votre message a été envoyé avec succès !') + channelNote,
      );
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition disabled:opacity-60';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased transition-colors duration-200">
      <SiteHeader variant="contact" />

      <section className="border-b border-border bg-background">
        <div className="page-container py-12 sm:py-16">
          <div className="max-w-xl space-y-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Contact
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-md">
              Démonstration, forfaits ou support — réponse sous 24–48 h ({site.supportHours}).
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <section className="py-12 sm:py-16">
          <div className="page-container">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-start">
              {/* Coordonnées */}
              <aside className="space-y-4">
                <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 space-y-6">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-foreground tracking-tight">
                      Nos coordonnées
                    </h2>
                    <p className="text-sm text-muted leading-relaxed">
                      Commercial, facturation ou technique — joignez-nous directement ou via le
                      formulaire.
                    </p>
                  </div>

                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] border border-border bg-surface-muted text-primary shrink-0">
                        <Mail className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          E-mail
                        </p>
                        <a
                          href={`mailto:${site.supportEmail}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition break-all"
                        >
                          {site.supportEmail}
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] border border-border bg-surface-muted text-primary shrink-0">
                        <Phone className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Téléphone
                        </p>
                        <a
                          href={site.supportPhoneHref}
                          className="text-sm font-medium text-foreground hover:text-primary transition"
                        >
                          {site.supportPhone}
                        </a>
                        <p className="text-[11px] text-muted mt-0.5">{site.whatsappNote}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] border border-border bg-surface-muted text-primary shrink-0">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Adresse
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {site.addressLine1}
                          <br />
                          {site.addressLine2}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] border border-border bg-surface-muted text-primary shrink-0">
                        <Clock className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          Horaires
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {site.supportHours}
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Pourquoi nous écrire ?</h3>
                  <ul className="space-y-2 text-sm text-muted">
                    {[
                      'Démonstration personnalisée du produit',
                      'Offres sur-mesure pour grands comptes',
                      'Support technique et facturation',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/#tarifs"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
                  >
                    Voir les forfaits
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </aside>

              {/* Formulaire */}
              <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 sm:p-8">
                {success ? (
                  <div className="py-10 text-center space-y-5 animate-fade-in">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-full border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-foreground tracking-tight">
                        Message envoyé
                      </h2>
                      <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                        {successMessage}
                      </p>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setSuccess(false)}>
                      Envoyer un autre message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <MessageSquare className="w-4.5 h-4.5 text-primary" />
                        Écrivez-nous
                      </h2>
                      <p className="text-sm text-muted">
                        Décrivez votre besoin — nous vous répondons rapidement.
                      </p>
                    </div>

                    {error && <Alert variant="error">{error}</Alert>}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Nom complet"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex. Jean Dupont"
                        required
                        disabled={submitting}
                        className="rounded-[var(--radius-button)] bg-surface-muted border-border"
                      />
                      <Input
                        label="Adresse e-mail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex. jean@organisation.com"
                        required
                        disabled={submitting}
                        className="rounded-[var(--radius-button)] bg-surface-muted border-border"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-subject"
                        className="block text-xs font-semibold text-muted"
                      >
                        Sujet
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ex. Demande de démo Premium"
                        className={fieldClass}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-semibold text-muted"
                      >
                        Message
                      </label>
                      <textarea
                        id="contact-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Décrivez votre besoin en détail…"
                        rows={5}
                        className={`${fieldClass} resize-none`}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      fullWidth
                      loading={submitting}
                      leftIcon={!submitting ? <Send className="w-4 h-4" /> : undefined}
                    >
                      {submitting ? 'Envoi en cours…' : 'Envoyer mon message'}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <FaqSection
          id="faq"
          title="Questions fréquentes"
          subtitle="Réponses courantes avant de nous écrire — forfaits, sécurité, protocole QR."
          showContactLink={false}
        />

        {/* CTA aligné landing */}
        <section className="py-16 sm:py-20 bg-foreground text-background">
          <div className="page-container text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-xl mx-auto">
              Créez votre entreprise pour démarrer
            </h2>
            <p className="text-sm text-background/70 max-w-md mx-auto leading-relaxed">
              Un compte entreprise pour centraliser invitations, plan de table et protocole QR.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
              <Link href="/register">
                <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Créer mon entreprise
                </Button>
              </Link>
              <Link href="/#tarifs">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-background/80 hover:text-background hover:bg-background/10 border border-background/20"
                >
                  Voir les tarifs
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter faqHref="/contact#faq" />
    </div>
  );
}
