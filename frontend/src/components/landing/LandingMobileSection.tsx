'use client';

import React from 'react';
import Link from 'next/link';
import {
  Smartphone,
  ScanLine,
  Bell,
  Link2,
  Moon,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const MOBILE_FEATURES = [
  {
    icon: ScanLine,
    title: 'Protocole jour J',
    description: 'Scan QR natif via la caméra, check-in et vérification de siège en moins de 3 secondes.',
  },
  {
    icon: Bell,
    title: 'Notifications push',
    description: 'Alertes en temps réel pour les organisateurs (Expo Push, token enregistré côté backend).',
  },
  {
    icon: Link2,
    title: 'Deep links',
    description: 'Liens directs RSVP, événement ou protocole : eventmaster://rsvp/:id, event/:id, protocol/:eventId.',
  },
  {
    icon: Moon,
    title: 'Thème sombre',
    description: 'Interface adaptée au réglage système iOS et Android pour le confort en soirée.',
  },
];

const GUEST_FEATURES = [
  'Portail RSVP sans compte',
  'Badge QR de confirmation',
  'Plan de table (après check-in)',
  'Téléchargement PDF invitation',
  'Fil d\'actualité & consignes invités',
];

const ORG_FEATURES = [
  'Liste événements & invités',
  'Statistiques RSVP',
  'Notifications in-app',
  'Accès protocole dédié',
  'Builds EAS (Android / iOS)',
];

export default function LandingMobileSection() {
  return (
    <section id="mobile" className="py-20 bg-slate-950 text-white relative overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[color-mix(in_srgb,var(--brand-accent,#6366f1)_15%,transparent)] blur-[100px] rounded-full pointer-events-none" />

      <div className="page-container relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/100/10 border border-primary/30 text-primary/80 text-xs font-bold">
              <Smartphone className="w-4 h-4" />
              <span>Application mobile native · iOS & Android</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Le protocole dans votre poche,{' '}
              <span className="bg-gradient-to-r from-primary to-[var(--brand-accent,#818cf8)] bg-clip-text text-transparent">
                le RSVP dans la main de vos invités
              </span>
            </h2>
            <p className="text-slate-400 leading-relaxed max-w-lg">
              L&apos;application EventMaster (React Native + Expo) complète le tableau de bord web :
              scan caméra natif, notifications push, deep links et parcours invité complet — sans dupliquer
              la logique métier côté serveur.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {MOBILE_FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition">
                  <Icon className="w-5 h-5 text-primary mb-2" />
                  <h3 className="font-bold text-sm text-white mb-1">{title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition text-sm"
            >
              Créer mon organisation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary/80 mb-4">
                Parcours invité (mobile)
              </h3>
              <ul className="space-y-2.5">
                {GUEST_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-violet-300 mb-4">
                Organisateur & protocole
              </h3>
              <ul className="space-y-2.5">
                {ORG_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Édition avancée (modèles visuels, plan de table drag-and-drop) disponible sur le web.
              Builds EAS preview & production configurés · CI GitHub Actions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
