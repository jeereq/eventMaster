import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Box, MessageCircle, QrCode, Sparkles, Ticket, Globe } from 'lucide-react';

const STEPS = [
  { n: '1', title: 'Créez l’événement', text: 'Date, lieu, nombre d’invités.' },
  { n: '2', title: 'Invitez vos proches', text: 'Chacun reçoit son lien et répond en un geste.' },
  { n: '3', title: 'Accueillez le jour J', text: 'Un scan du QR code à l’entrée suffit.' },
];

const TILES = [
  { href: '/simulateur', icon: Sparkles, title: 'Simulateur de budget', text: 'Une estimation en quelques questions.' },
  { href: '/modeles', icon: MessageCircle, title: 'Invitations WhatsApp', text: 'Envoyées là où vos invités lisent.' },
  { href: '/faq', icon: QrCode, title: 'Contrôle d’accès', text: 'QR code scanné à l’entrée.' },
  { href: '/marketplace/evenements', icon: Ticket, title: 'Billetterie', text: 'Vendez vos places en ligne.' },
];

/**
 * « Comment ça marche » puis « Les outils ». `stepsAction` est l’appel à l’action
 * affiché sous les étapes (dépend de la session, fourni par le parent client).
 */
export default function LandingStepsBento({ stepsAction }: { stepsAction?: ReactNode }) {
  return (
    <>
      <section id="etapes" className="bg-background pt-8 pb-14 sm:pt-12 sm:pb-20 scroll-mt-16 md:scroll-mt-24">
        <div className="page-container">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-xs sm:text-sm font-bold text-primary tracking-[0.06em] uppercase">
                Comment ça marche
              </span>
              <h2 className="em-landing-heading text-3xl sm:text-[2.5rem] font-bold text-foreground">
                Votre fête en 3 étapes
              </h2>
            </div>
            <p className="text-base sm:text-[17px] text-muted max-w-[420px]">
              Pas de formation ni d’appli à installer : on vous guide à chaque étape.
            </p>
          </div>
          <ol className="mt-8 grid gap-3 sm:gap-4 sm:grid-cols-3">
            {STEPS.map((s, index) => (
              <li
                key={s.n}
                className="relative flex sm:flex-col items-start gap-4 sm:gap-0 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6"
              >
                <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d1fae5] text-lg font-bold text-primary">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display sm:mt-4 text-lg sm:text-xl font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{s.text}</p>
                </div>
                {index < STEPS.length - 1 ? (
                  <ArrowRight
                    className="hidden sm:block absolute top-1/2 -right-[1.1rem] z-10 h-6 w-6 -translate-y-1/2 rounded-full border border-border bg-background p-1 text-primary"
                    aria-hidden
                  />
                ) : null}
              </li>
            ))}
          </ol>
          {stepsAction ? <div className="mt-6 flex flex-col min-[420px]:flex-row gap-3">{stepsAction}</div> : null}
        </div>
      </section>

      <section id="outils" className="bg-surface py-14 sm:py-20 scroll-mt-16 md:scroll-mt-24">
        <div className="page-container">
          <span className="text-xs sm:text-sm font-bold text-primary tracking-[0.06em] uppercase">Les outils</span>
          <h2 className="em-landing-heading mt-3 max-w-2xl text-3xl sm:text-[2.5rem] font-bold text-foreground">
            Un seul outil, du premier devis au dernier invité
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
            <Link
              href="/plans-3d"
              className="group relative col-span-2 overflow-hidden rounded-[1.75rem] bg-[#064e3b] p-6 sm:p-7 text-white lg:row-span-2 min-h-[13rem] sm:min-h-[16rem] flex flex-col justify-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-[4rem] border-[2.5rem] border-[#065f46]"
              />
              <Box className="relative h-8 w-8 text-[#6ee7b7]" aria-hidden />
              <h3 className="font-display relative mt-4 text-2xl sm:text-3xl font-bold">Votre salle en 3D</h3>
              <p className="relative mt-2 max-w-sm text-[#d1fae5]">Placez tables et scène avant le jour J.</p>
              <span className="relative mt-5 inline-flex items-center gap-2 font-semibold text-[#6ee7b7] group-hover:gap-3 transition-all">
                Essayer le plan 3D <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
            {TILES.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-background p-4 sm:p-5 transition-colors hover:border-primary/40 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <t.icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="font-display mt-3 text-base sm:text-lg font-semibold text-foreground">{t.title}</h3>
                <p className="mt-1 text-sm text-muted">{t.text}</p>
                <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Découvrir
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] bg-[#ecfdf5] px-5 py-4 text-[15px] text-[#064e3b]">
            <Globe className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              <strong>Zéro installation.</strong> Tout se passe dans le navigateur, sur téléphone comme sur ordinateur.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
