import Link from 'next/link';
import { ArrowRight, Box, MessageCircle, QrCode, Sparkles, Ticket, Globe } from 'lucide-react';

const STEPS = [
  { n: '1', title: 'Créez l’événement', text: 'Date, lieu, nombre d’invités.' },
  { n: '2', title: 'Invitez vos proches', text: 'Chacun reçoit son lien et répond en un geste.' },
  { n: '3', title: 'Accueillez le jour J', text: 'Un scan du QR code à l’entrée suffit.' },
];

const TILES = [
  { href: '/simulateur', icon: Sparkles, title: 'Simulateur de budget', text: 'Une estimation en quelques questions.' },
  { href: '/#faq', icon: MessageCircle, title: 'Invitations WhatsApp', text: 'Envoyées là où vos invités lisent.' },
  { href: '/#faq', icon: QrCode, title: 'Contrôle d’accès', text: 'QR code scanné à l’entrée.' },
  { href: '/marketplace/evenements', icon: Ticket, title: 'Billetterie', text: 'Vendez vos places en ligne.' },
];

export default function LandingStepsBento() {
  return (
    <>
      <section id="etapes" className="bg-background py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="em-landing-heading text-3xl sm:text-[2.5rem] font-bold text-foreground">
            Votre fête en 3 étapes
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
                <span className="font-display flex h-11 w-11 items-center justify-center rounded-xl bg-[#d1fae5] text-lg font-bold text-primary">
                  {s.n}
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="outils" className="bg-surface py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="em-landing-heading max-w-2xl text-3xl sm:text-[2.5rem] font-bold text-foreground">
            Un seul outil, du premier devis au dernier invité
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
            <Link
              href="/plans-3d"
              className="group relative overflow-hidden rounded-[1.75rem] bg-[#064e3b] p-7 text-white lg:col-span-2 lg:row-span-2 min-h-[16rem] flex flex-col justify-end"
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
                className="rounded-[var(--radius-card)] border border-border bg-background p-5 transition-colors hover:border-primary/40 hover:bg-card-hover"
              >
                <t.icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="font-display mt-3 text-lg font-semibold text-foreground">{t.title}</h3>
                <p className="mt-1 text-sm text-muted">{t.text}</p>
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
