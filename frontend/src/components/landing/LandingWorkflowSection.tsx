'use client';

import React from 'react';
import {
  Mail,
  MessageSquare,
  QrCode,
  ScanLine,
  MapPin,
  FileText,
  LayoutGrid,
  ArrowRight,
} from 'lucide-react';

const STEPS = [
  {
    step: 1,
    title: 'Invitation initiale',
    description:
      'Envoi par e-mail ou WhatsApp avec lien RSVP personnalisé. Pas de PDF ni de localisation GPS à ce stade.',
    icon: Mail,
    tone: 'indigo',
  },
  {
    step: 2,
    title: 'Réponse RSVP',
    description:
      'L\'invité confirme ou décline, remplit ses préférences et reçoit son badge QR sur le portail web ou mobile.',
    icon: MessageSquare,
    tone: 'violet',
  },
  {
    step: 3,
    title: 'Check-in protocole',
    description:
      'Scan QR à l\'entrée (navigateur ou app mobile). Confirmation de présence et validation du siège en temps réel.',
    icon: ScanLine,
    tone: 'amber',
  },
  {
    step: 4,
    title: 'Livraison automatique',
    description:
      'PDF personnalisé, plan de table interactif et pin GPS WhatsApp envoyés automatiquement après validation.',
    icon: QrCode,
    tone: 'emerald',
  },
] as const;

const DELIVERABLES = [
  { icon: FileText, label: 'Invitation PDF avec placement' },
  { icon: LayoutGrid, label: 'Plan de table interactif' },
  { icon: MapPin, label: 'Localisation GPS WhatsApp' },
];

const toneClasses: Record<(typeof STEPS)[number]['tone'], string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
  violet: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/50',
  amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
};

export default function LandingWorkflowSection() {
  return (
    <section id="parcours" className="py-20 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900/40 border-t border-slate-200 dark:border-slate-800 scroll-mt-24">
      <div className="page-container">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Parcours invité intelligent
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            De l&apos;invitation à la table, en quatre étapes
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            EventMaster sépare l&apos;invitation RSVP de la livraison sensible (placement, PDF, GPS).
            Les données de table ne sont partagées qu&apos;après confirmation de présence à l&apos;entrée.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative">
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%-0.5rem)] w-[calc(100%-2rem)] z-0">
                    <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-700 mx-auto" />
                  </div>
                )}
                <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-full hover:border-indigo-300 dark:hover:border-indigo-800 transition">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-4 ${toneClasses[item.tone]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Étape {item.step}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1 mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold">Déclenché automatiquement après check-in</h3>
              <p className="text-sm text-indigo-100 max-w-xl leading-relaxed">
                Dès qu&apos;un invité est validé (scan QR ou vérification siège), EventMaster envoie en une fois
                le PDF, le plan de table et la localisation GPS — sans action manuelle de l&apos;organisateur.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {DELIVERABLES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
