'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Lock,
  Building,
  Users,
  CreditCard,
  Scale,
  Sparkles,
  ArrowRight,
  Ticket,
  ScanLine,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/config/legalConfig';
import { cn } from '@/lib/cn';

interface LegalTermsPreviewModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'summary';
  onAcceptAll: () => void;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
}

export default function LegalTermsPreviewModal({
  open,
  onClose,
  initialTab = 'summary',
  onAcceptAll,
  acceptedTerms = false,
  acceptedPrivacy = false,
}: LegalTermsPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'terms' | 'privacy'>(initialTab);
  const [termsAgreed, setTermsAgreed] = useState(acceptedTerms);
  const [privacyAgreed, setPrivacyAgreed] = useState(acceptedPrivacy);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setTermsAgreed(acceptedTerms);
      setPrivacyAgreed(acceptedPrivacy);
      setReadProgress(0);
    }
  }, [open, initialTab, acceptedTerms, acceptedPrivacy]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setReadProgress(100);
      return;
    }
    const currentProgress = Math.min(100, Math.round((el.scrollTop / maxScroll) * 100));
    setReadProgress(currentProgress);
  };

  const handleConfirm = () => {
    setTermsAgreed(true);
    setPrivacyAgreed(true);
    onAcceptAll();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Conditions d’utilisation & Confidentialité
            </h2>
            <p className="text-xs text-muted">
              Lecture et validation requises incluant la billetterie et les paiements sécurisés
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs text-muted w-full sm:w-auto">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <CheckCircle2
                className={cn(
                  'w-4 h-4',
                  termsAgreed && privacyAgreed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted',
                )}
              />
              {termsAgreed && privacyAgreed
                ? 'Tous les documents sont approuvés'
                : 'Validation requise'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Fermer
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-bold shadow-md shadow-primary/20"
            >
              J’accepte les conditions et je continue
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Onglets de navigation légale */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab('summary');
              if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer',
              activeTab === 'summary'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Synthèse clé</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('terms');
              if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer',
              activeTab === 'terms'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Conditions (v{TERMS_VERSION})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('privacy');
              if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer',
              activeTab === 'privacy'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted hover:text-foreground',
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Confidentialité (v{PRIVACY_VERSION})</span>
          </button>
        </div>

        {/* Barre de progression de lecture */}
        <div className="flex items-center justify-between text-[11px] text-muted px-1">
          <span>Défilement du document</span>
          <span className="font-mono font-semibold">{readProgress}% lu</span>
        </div>
        <div className="w-full bg-border/60 h-1 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-150"
            style={{ width: `${Math.max(5, readProgress)}%` }}
          />
        </div>

        {/* Contenu textuel scrollable */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto pr-2 space-y-4 text-xs leading-relaxed text-foreground/90 rounded-xl border border-border p-4 bg-surface"
        >
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-primary" />
                  1. Présentation & Groupe Tekango
                </h3>
                <p className="text-muted">
                  <strong>EventMaster</strong> est une plateforme SaaS complète éditée par le{' '}
                  <strong>Groupe Tekango</strong>. Elle réunit la gestion d’événements, les invitations interactives WhatsApp/e-mail,
                  les plans 2D/3D, la <strong>billetterie en ligne sécurisée (Ticketing)</strong> et les <strong>paiements FlexPay</strong> (Cartes bancaires &amp; Mobile Money).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  2. Billetterie multi-zones &amp; e-Billets QR
                </h3>
                <p className="text-muted">
                  Tarification par zone (VIP, Carré d’Or, Standard) avec répartition spatiale automatisée. Chaque billet acheté génère instantanément un e-billet nominatif doté d’un <strong>QR Code unique et infalsifiable</strong> (téléchargeable en PDF et disponible dans « Mes billets »). Le jour J, le contrôle d’accès applique la règle du <strong>scan unique</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  3. Paiements sécurisés FlexPay, Abonnements &amp; Jetons IA
                </h3>
                <p className="text-muted">
                  Les paiements sont traités via le prestataire agréé <strong>FlexPay</strong> (Visa, Mastercard, M-Pesa, Orange Money, Airtel Money, Afrimoney). Les recharges de jetons d&apos;intelligence artificielle (Studio IA) sont facturées en Francs Congolais (CDF). EventMaster ne stocke aucun numéro complet de carte bancaire ni code secret. Les recettes nettes de billetterie sont reversées à l’organisateur (payouts).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  4. Studio IA &amp; Sécurité des aménagements
                </h3>
                <p className="text-muted">
                  Modélisation 2D/3D assistée par IA (Google Gemini) depuis des briefs ou photos de salle, invitations en langues nationales (Lingala, Swahili, Kikongo, Tshiluba) et moteur d&apos;espacement physique. L&apos;assistance logicielle ne remplace pas les diagnostics réglementaires ERP/PMR sous la responsabilité de l&apos;organisateur.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  5. Vos données &amp; Cloisonnement étanche
                </h3>
                <p className="text-muted">
                  Chaque organisation dispose d’un environnement sécurisé et isolé (multi-tenant). Vos listes d’invités, plans de table, photos de salle et médias restent votre entière propriété. EventMaster n’exploite pas vos listes d’invités à des fins commerciales propres.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Conditions Générales d’Utilisation</h3>
                <p className="text-[11px] text-muted">Version {TERMS_VERSION} · En vigueur au 7 septembre 2026</p>
              </div>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 1 — Objet &amp; Acceptation</h4>
                <p className="text-muted">
                  La plateforme EventMaster est éditée par le Groupe Tekango. En créant un compte, en souscrivant un abonnement, en utilisant le Studio IA ou en achetant un billet, vous acceptez l’ensemble des présentes conditions d’utilisation.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 2 — Billetterie en ligne &amp; e-Billets (Ticketing)</h4>
                <p className="text-muted">
                  L’organisateur définit ses quotas et ses tarifs (globaux ou par zone/siège). Tout achat validé émet un e-billet muni d’un QR Code unique et infalsifiable. Le scan à l’entrée est unique et bloque toute réutilisation frauduleuse. L’organisateur demeure le seul garant de l’événement et des éventuels remboursements.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 3 — Paiements sécurisés, Abonnements &amp; Jetons IA</h4>
                <p className="text-muted">
                  Les transactions sont traitées via le processeur agréé FlexPay (Cartes Visa/Mastercard et Mobile Money M-Pesa, Orange Money, Airtel Money, Afrimoney). L&apos;accès aux fonctionnalités avancées d&apos;intelligence artificielle (Studio IA, vision sur plans) consomme des jetons d&apos;IA non remboursables une fois le calcul exécuté.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 4 — Studio IA, Plans 2D/3D &amp; Sécurité spatiale</h4>
                <p className="text-muted">
                  L&apos;outil d&apos;optimisation des espacements applique des normes physiques (1,40 m entre tables, dégagement des issues). L&apos;organisateur et l&apos;exploitant de la salle demeurent seuls juridiquement responsables de la conformité du plan réel exécuté le jour J au regard des règlements locaux de sécurité incendie et d&apos;accueil du public (ERP/PMR).
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 5 — Reversement des recettes (Payouts)</h4>
                <p className="text-muted">
                  EventMaster collecte les règlements pour le compte de l’organisateur et lui reverse les recettes nettes déduites des frais et commissions convenues, par virement bancaire ou payout Mobile Money FlexPay.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 6 — Rôles, traçabilité collaborative &amp; données</h4>
                <p className="text-muted">
                  L’organisateur agit en qualité de responsable de traitement pour ses listes d’invités et participants. EventMaster agit comme sous-traitant technique sans commercialiser ces données à des tiers. Les modifications de plans sont tracées dans un journal d&apos;audit contextuel pour la sécurité de l&apos;équipe.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Politique de Confidentialité &amp; Données</h3>
                <p className="text-[11px] text-muted">Version {PRIVACY_VERSION} · En vigueur au 7 septembre 2026</p>
              </div>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">1. Données de billetterie &amp; Paiement</h4>
                <p className="text-muted">
                  Nous traitons les coordonnées des acheteurs (nom, e-mail, téléphone WhatsApp, place réservée), les identifiants de transaction FlexPay et les horodatages de scan QR le jour de l’événement. Les données bancaires sensibles sont traitées directement par FlexPay.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">2. Studio IA &amp; Médias importés</h4>
                <p className="text-muted">
                  Les photographies de salle et croquis téléversés sont traités exclusivement pour extraire les contours et le mobilier du plan. Aucune identification biométrique faciale n&apos;est réalisée sur les personnes pouvant figurer sur les clichés.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">3. Finalités des traitements</h4>
                <p className="text-muted">
                  Les données sont utilisées pour l’émission des e-billets, le traitement des paiements, la modélisation spatiale assistée par IA, la génération d&apos;invitations multilingues (Français, Lingala, Swahili, Kikongo, Tshiluba), la prévention de la fraude au contrôle d’accès et l&apos;édition des justificatifs fiscaux.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">4. Sous-traitants agréés</h4>
                <p className="text-muted">
                  Nos partenaires de confiance comprennent Google Cloud / Google Gemini API (intelligence artificielle avec garantie de non-réentraînement public), FlexPay (paiement et Mobile Money), SendGrid (e-mails transactionnels), UltraMsg (WhatsApp OTP) et Cloudinary (médias), tous soumis à des engagements stricts de sécurité.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">5. Vos droits (Accès, Rectification, Suppression)</h4>
                <p className="text-muted">
                  Vous disposez à tout moment d’un droit d’accès, de rectification et d’effacement de vos données personnelles en contactant notre support technique ou l’organisateur de l’événement.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Liens externes vers les pages complètes */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              target="_blank"
              className="hover:text-primary transition inline-flex items-center gap-1 font-medium"
            >
              Consulter la page CGU complète <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              className="hover:text-primary transition inline-flex items-center gap-1 font-medium"
            >
              Consulter la page Confidentialité complète <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
