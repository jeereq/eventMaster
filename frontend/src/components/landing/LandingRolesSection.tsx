'use client';

import React from 'react';
import { Shield, ScanLine, Building2, Briefcase, Users, Mail, Lock, TrendingUp, LayoutGrid, Smartphone } from 'lucide-react';
import { ROLE_HIGHLIGHTS, PLATFORM_PILLARS } from '@/config/landingPricing';

const roleIcons = { shield: Shield, scan: ScanLine, building: Building2, briefcase: Briefcase };
const pillarIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  layout: LayoutGrid,
  qr: ScanLine,
  smartphone: Smartphone,
  users: Users,
  mail: Mail,
  lock: Lock,
  trending: TrendingUp,
};

export default function LandingRolesSection() {
  return (
    <>
      {/* Rôles & permissions */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="w-10/12 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Gouvernance & équipes
              </span>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Chaque rôle voit exactement ce qu&apos;il doit gérer
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Comme Microsoft 365 attribue des licences et des droits par profil, EventMaster distingue
                propriétaire, managers organisationnels, protocoles, responsables de salle ou d&apos;événement,
                et commerciaux parraineurs — sans jamais mélanger les périmètres.
              </p>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider">
                  <div className="p-3">Rôle</div>
                  <div className="p-3">Périmètre</div>
                  <div className="p-3">Créer event/salle</div>
                </div>
                {[
                  ['Propriétaire / Manager org.', 'Toute l\'organisation', 'Oui'],
                  ['Protocole org.', 'Invités (tous événements)', 'Non'],
                  ['Manager salle', 'Événements de la salle', 'Non'],
                  ['Protocole événement', 'Invités de l\'événement', 'Non'],
                  ['Commercial', 'Organisations parrainées', 'N/A'],
                ].map(([role, scope, create]) => (
                  <div key={role} className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 last:border-0 bg-white dark:bg-slate-950">
                    <div className="p-3 font-semibold text-slate-800 dark:text-slate-200">{role}</div>
                    <div className="p-3 text-slate-600 dark:text-slate-400">{scope}</div>
                    <div className="p-3 text-slate-600 dark:text-slate-400">{create}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {ROLE_HIGHLIGHTS.map((role) => {
                const Icon = roleIcons[role.icon as keyof typeof roleIcons] || Shield;
                return (
                  <div key={role.title} className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{role.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Piliers plateforme — remplace partiellement l'ancienne grille */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-t border-b border-slate-200 dark:border-slate-800">
        <div className="w-10/12 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Une plateforme complète pour vos événements
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              De la conception de salle au scan QR en passant par les notifications de placement.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {PLATFORM_PILLARS.map((pillar) => {
              const Icon = pillarIcons[pillar.icon] || Shield;
              return (
                <div key={pillar.title} className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition">
                  <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-4" />
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">{pillar.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
