'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Building,
  CreditCard,
  Scale,
  Sparkles,
  ArrowRight,
  Ticket,
  Wallet,
  Heart,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { TERMS_VERSION, PRIVACY_VERSION, REFUND_VERSION } from '@/config/legalConfig';
import { cn } from '@/lib/cn';

type LegalTabId = 'summary' | 'terms' | 'privacy' | 'refund';

const LEGAL_TABS: Array<{
  id: LegalTabId;
  shortLabel: string;
  longLabel: string;
  Icon: typeof Sparkles;
}> = [
  { id: 'summary', shortLabel: 'Synthèse', longLabel: 'Synthèse clé', Icon: Sparkles },
  { id: 'terms', shortLabel: 'CGU', longLabel: `Conditions (v${TERMS_VERSION})`, Icon: FileText },
  { id: 'privacy', shortLabel: 'Données', longLabel: `Confidentialité (v${PRIVACY_VERSION})`, Icon: ShieldCheck },
  { id: 'refund', shortLabel: 'Rembours.', longLabel: `Remboursements (v${REFUND_VERSION})`, Icon: Wallet },
];

interface LegalTermsPreviewModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'summary' | 'refund';
  onAcceptAll: () => void;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  acceptedRefund?: boolean;
}

export default function LegalTermsPreviewModal({
  open,
  onClose,
  initialTab = 'summary',
  onAcceptAll,
  acceptedTerms = false,
  acceptedPrivacy = false,
  acceptedRefund = false,
}: LegalTermsPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTabId>(initialTab);
  const [termsAgreed, setTermsAgreed] = useState(acceptedTerms);
  const [privacyAgreed, setPrivacyAgreed] = useState(acceptedPrivacy);
  const [refundAgreed, setRefundAgreed] = useState(acceptedRefund);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setTermsAgreed(acceptedTerms);
      setPrivacyAgreed(acceptedPrivacy);
      setRefundAgreed(acceptedRefund);
      setReadProgress(0);
    }
  }, [open, initialTab, acceptedTerms, acceptedPrivacy, acceptedRefund]);

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

  const selectTab = (id: LegalTabId) => {
    setActiveTab(id);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = LEGAL_TABS.length - 1;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      next = index === last ? 0 : index + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      next = index === 0 ? last : index - 1;
    } else if (event.key === 'Home') {
      event.preventDefault();
      next = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      next = last;
    } else {
      return;
    }
    selectTab(LEGAL_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const handleConfirm = () => {
    setTermsAgreed(true);
    setPrivacyAgreed(true);
    setRefundAgreed(true);
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
            <Scale className="w-4 h-4" aria-hidden />
          </div>
          <div>
            <span className="block text-base sm:text-lg font-bold text-foreground">
              Conditions d’utilisation &amp; Confidentialité
            </span>
            <p className="text-xs text-muted">
              Lecture et validation requises incluant la billetterie, les dons et les paiements sécurisés
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
                  termsAgreed && privacyAgreed && refundAgreed
                    ? 'text-primary'
                    : 'text-muted',
                )}
              />
              {termsAgreed && privacyAgreed && refundAgreed
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
        <div
          role="tablist"
          aria-label="Documents à lire"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1 bg-surface-muted rounded-xl border border-border"
        >
          {LEGAL_TABS.map((tab, index) => {
            const Icon = tab.Icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`legal-tab-${tab.id}`}
                aria-controls={`legal-panel-${tab.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'flex-1 min-h-11 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selected
                    ? 'bg-surface text-foreground shadow-xs'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.longLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span id="legal-read-progress-label">Défilement du document</span>
          <span className="font-mono font-semibold">{readProgress}% lu</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="legal-read-progress-label"
          aria-valuenow={readProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-border/60 h-1 rounded-full overflow-hidden"
        >
          <div
            className="bg-primary h-full transition-all duration-150"
            style={{ width: `${Math.max(5, readProgress)}%` }}
          />
        </div>

        {/* Contenu textuel scrollable */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="tabpanel"
          id={`legal-panel-${activeTab}`}
          aria-labelledby={`legal-tab-${activeTab}`}
          className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto pr-2 space-y-4 text-xs leading-relaxed text-foreground/90 rounded-xl border border-border p-4 bg-surface"
        >
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-primary" />
                  1. Présentation &amp; Groupe Tekango (RDC)
                </h3>
                <p className="text-muted">
                  <strong>EventMaster</strong> est une plateforme SaaS complète éditée par le{' '}
                  <strong>Groupe Tekango</strong> (Kinshasa, RDC), exploitée conformément au Code du numérique de la RDC. Elle réunit la gestion d’événements, les invitations interactives WhatsApp/e-mail,
                  les plans 2D/3D photoréalistes, le <strong>Simulateur de budget IA (/simulateur)</strong>, la <strong>billetterie en ligne avec présence auto-validée</strong>, les <strong>dons solidaires</strong> et les <strong>paiements sécurisés FlexPay</strong> (Cartes bancaires &amp; Mobile Money).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-primary" />
                  2. Billetterie multi-zones, Présence auto-validée &amp; Personnalisation
                </h3>
                <p className="text-muted">
                  Tarification par zone avec choix de place sur le plan et placement PMR. Tout achat de billet valide immédiatement la présence de l&apos;invité (RSVP « ACCEPTED »). Pour les billets partagés entre proches ou collègues, chaque bénéficiaire peut personnaliser ses nom, prénom, numéro WhatsApp et régimes alimentaires sur son portail. Le jour J, le contrôle d’accès applique la règle du <strong>scan unique</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-primary" />
                  3. Dons Solidaires &amp; Collectes de Fonds
                </h3>
                <p className="text-muted">
                  Collectes à montant libre en Francs Congolais (CDF) pour causes déclarées. EventMaster intervient en qualité d&apos;intermédiaire technique d&apos;encaissement. L&apos;organisateur est seul garant de la sincérité de la cause et de l&apos;affectation des fonds. Les dons confirmés sont des libéralités volontaires irrévocables, non remboursables par la plateforme.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  4. Paiements FlexPay, Abonnements, Jetons IA &amp; Locations
                </h3>
                <p className="text-muted">
                  Paiements sécurisés via <strong>FlexPay</strong> (Visa, Mastercard, M-Pesa, Orange Money, Airtel Money, Afrimoney) en Francs Congolais (CDF) et devises. Recharges de jetons d&apos;IA pour l’aménagement et les invitations. Marketplace de salles, prestataires et locations de matériel (tentes, sono, mobilier). Les recettes nettes de billetterie et de dons sont reversées à l’organisateur (payouts).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  5. Studio IA, Rendu 3D photoréaliste &amp; Normes de sécurité
                </h3>
                <p className="text-muted">
                  Modélisation 2D/3D WebGL (matériaux PBR, caméras cinéma, escaliers droits/hélicoïdaux, estrades et scènes), contextualisation des invitations et respect des visages réels (Google Gemini). L&apos;assistance logicielle aide à l&apos;aménagement mais ne remplace pas les diagnostics d&apos;architecte et les règlements de sécurité ERP/PMR.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  6. Vos données &amp; Cloisonnement étanche
                </h3>
                <p className="text-muted">
                  Chaque organisation dispose d’un environnement sécurisé et isolé (multi-tenant). Vos listes d’invités, plans de table, photos de salle et médias restent votre entière propriété. EventMaster n’exploite pas vos listes d’invités ou données de donateurs à des fins commerciales propres.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface border border-border space-y-2">
                <h3 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-primary" aria-hidden />
                  7. Remboursements &amp; Cautions
                </h3>
                <p className="text-muted">
                  Billets : décision de l’organisateur. Dons solidaires : irrévocables et non remboursables. Abonnements : la période payée va jusqu’à son terme. Jetons IA consommés : non remboursables. Cautions de location de matériel : convenues directement entre parties hors plateforme. Erreurs de paiement : régularisées via numéro de transaction FlexPay.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Conditions Générales d’Utilisation</h3>
                <p className="text-xs text-muted">Version {TERMS_VERSION} · En vigueur au 14 septembre 2026</p>
              </div>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 1 — Objet, Éditeur &amp; Droit applicable</h4>
                <p className="text-muted">
                  La plateforme EventMaster est éditée par le Groupe Tekango (Kinshasa, RDC) conformément au Code du numérique congolais. En créant un compte, en souscrivant un abonnement, en utilisant le Studio IA, en effectuant un don ou en achetant un billet, vous acceptez l’ensemble des présentes conditions d’utilisation.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 2 — Billetterie en ligne, Présence auto-validée &amp; Billets partagés</h4>
                <p className="text-muted">
                  L’organisateur définit ses quotas et ses tarifs (globaux ou par zone/siège avec accessibilité PMR). Tout achat validé émet un e-billet muni d’un QR Code unique et valide automatiquement la présence de l&apos;invité (RSVP « ACCEPTED »). Les bénéficiaires de billets partagés peuvent personnaliser leurs coordonnées sur leur espace dédié. Le scan à l’entrée est unique et bloque toute réutilisation frauduleuse.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 3 — Dons Solidaires &amp; Collectes de Fonds</h4>
                <p className="text-muted">
                  EventMaster fournit l&apos;infrastructure technique d&apos;encaissement des dons libres pour le compte de l&apos;organisation. L&apos;organisation est seule garante de la sincérité de la cause. Tout don confirmé est une libéralité volontaire définitive et irrévocable, non remboursable par la plateforme.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 4 — Paiements sécurisés, Abonnements, Jetons IA &amp; Marketplace</h4>
                <p className="text-muted">
                  Les transactions sont traitées via le processeur agréé FlexPay (Cartes Visa/Mastercard et Mobile Money M-Pesa, Orange Money, Airtel Money, Afrimoney). Le simulateur de budget propose des estimations chiffrées en FC et USD au taux officiel. Le marketplace encadre les salles, prestataires et locations de matériel (tentes, mobilier, sonorisation).
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 5 — Studio IA, Plans 2D/3D &amp; Sécurité spatiale</h4>
                <p className="text-muted">
                  Plans 2D cotés et rendu 3D WebGL photoréaliste (matériaux PBR, caméras cinéma, escaliers droits/tournants/hélicoïdaux, estrades et scènes). L&apos;outil applique des normes physiques (1,40 m entre tables, allées PMR). L&apos;organisateur et l&apos;exploitant demeurent seuls juridiquement responsables de la conformité du plan réel exécuté le jour J au regard des règlements locaux ERP/PMR.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 6 — Reversement des recettes (Payouts)</h4>
                <p className="text-muted">
                  EventMaster collecte les règlements pour le compte de l’organisateur et lui reverse les recettes nettes de billetterie et de dons déduites des frais et commissions convenues, par virement bancaire ou payout Mobile Money FlexPay.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">Article 7 — Responsabilité, Données &amp; Litiges</h4>
                <p className="text-muted">
                  L’organisateur agit en qualité de responsable de traitement pour ses listes d’invités, donateurs et participants. EventMaster agit comme sous-traitant technique. Les litiges relèvent de la compétence des tribunaux de Kinshasa (Gombe).
                </p>
              </section>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Politique de Confidentialité &amp; Données</h3>
                <p className="text-xs text-muted">Version {PRIVACY_VERSION} · En vigueur au 14 septembre 2026</p>
              </div>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">1. Cadre légal RDC &amp; Données traitées</h4>
                <p className="text-muted">
                  Traitements conformes au Code du numérique de la RDC (Loi n° 23/010). Coordonnées des acheteurs, donateurs (option de don anonyme ou nominatif), statut de présence auto-confirmé, personnalisation des billets partagés, identifiants FlexPay et horodatages de scan QR. Les données bancaires sensibles sont traitées directement par FlexPay.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">2. Studio IA, Médias importés &amp; Respect des visages</h4>
                <p className="text-muted">
                  Photographies de salle traitées pour extraire le plan 2D/3D sans reconnaissance faciale de surveillance. Pour les invitations, choix de la source de contexte et respect strict des visages de référence selon les directives Google Gemini (sans retouche artificielle déformante).
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">3. Finalités des traitements</h4>
                <p className="text-muted">
                  Émission des e-billets et pass donateurs, validation automatique de présence, simulation budgétaire en FC/USD, modélisation 2D/3D photoréaliste avec allées PMR, génération d&apos;invitations multilingues (Français, Lingala, Swahili, Kikongo, Tshiluba), contrôle d’accès anti-doublon et conformité LCB-FT.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">4. Sous-traitants agréés</h4>
                <p className="text-muted">
                  Google Cloud / Google Gemini API (intelligence artificielle sans réentraînement public), FlexPay (paiement et Mobile Money), SendGrid (e-mails transactionnels), UltraMsg (WhatsApp OTP) et Cloudinary (médias), soumis à des engagements stricts de sécurité.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">5. Vos droits (Accès, Rectification, Suppression)</h4>
                <p className="text-muted">
                  Conformément au Code du numérique, vous disposez d’un droit d’accès, de rectification, d&apos;opposition et d’effacement de vos données personnelles en contactant notre délégué à la protection des données ou l’organisateur.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Politique de remboursement</h3>
                <p className="text-xs text-muted">Version {REFUND_VERSION} · En vigueur au 14 septembre 2026</p>
              </div>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">1. Billets d’événements</h4>
                <p className="text-muted">
                  L’organisateur est le seul garant de la tenue de l’événement. Les billets achetés confèrent une présence automatiquement confirmée mais demeurent soumis aux conditions de remboursement de l&apos;organisateur. Un billet déjà scanné, falsifié ou revendu hors canal officiel n’est pas remboursable.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">2. Dons Solidaires</h4>
                <p className="text-muted">
                  Les dons solidaires constituent des libéralités volontaires et définitives. Ils sont par nature irrévocables et non remboursables par EventMaster. Tout différend sur l&apos;affectation des fonds doit être adressé à l&apos;organisation bénéficiaire.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">3. Abonnements SaaS &amp; Jetons IA</h4>
                <p className="text-muted">
                  Vous pouvez arrêter le renouvellement à tout moment. L’accès reste actif jusqu’à la fin de la période payée sans remboursement au prorata. Les simulations budgétaires et requêtes IA exécutées ne sont pas remboursables.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">4. Acomptes &amp; Cautions de location marketplace</h4>
                <p className="text-muted">
                  Les acomptes et cautions de location de matériel relèvent de l’accord direct entre l’organisateur et le professionnel. EventMaster n’encaisse pas les cautions et n’intervient pas dans leur restitution.
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-foreground">5. Erreurs de paiement FlexPay</h4>
                <p className="text-muted">
                  Double débit ou montant erroné : contactez le support avec le numéro de transaction. Le délai de régularisation dépend de FlexPay et de votre opérateur Mobile Money ou banque.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Liens externes vers les pages complètes */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted">
          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              target="_blank"
              className="hover:text-primary transition inline-flex items-center gap-1 font-medium rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Consulter la page CGU complète <ExternalLink className="w-3 h-3" aria-hidden />
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              className="hover:text-primary transition inline-flex items-center gap-1 font-medium rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Consulter la page Confidentialité complète <ExternalLink className="w-3 h-3" aria-hidden />
            </Link>
            <Link
              href="/refund"
              target="_blank"
              className="hover:text-primary transition inline-flex items-center gap-1 font-medium rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Consulter la politique de remboursement <ExternalLink className="w-3 h-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
