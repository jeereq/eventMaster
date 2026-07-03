'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Compass,
  ListOrdered,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { getUserGuide, type UserGuideId } from '@/config/userGuides';

interface UserGuideViewProps {
  guideId: UserGuideId;
  showHeader?: boolean;
}

export default function UserGuideView({ guideId, showHeader = true }: UserGuideViewProps) {
  const guide = getUserGuide(guideId);
  const [openSection, setOpenSection] = useState<string | null>('workflows');

  if (!guide) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
        Guide introuvable.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {showHeader && (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            <BookOpen className="w-4 h-4" />
            <span>{guide.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {guide.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            {guide.summary}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Ce que vous pouvez faire
          </h2>
          <ul className="space-y-2">
            {guide.canDo.map((item) => (
              <li key={item} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Limites de votre rôle
          </h2>
          <ul className="space-y-2">
            {guide.cannotDo.map((item) => (
              <li key={item} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {guide.navLinks.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Navigation utile
          </h2>
          <div className="flex flex-wrap gap-2">
            {guide.navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
              >
                {link.label}
                <ExternalLink className="w-3 h-3 opacity-60" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOpenSection(openSection === 'workflows' ? null : 'workflows')}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        >
          <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Parcours pas-à-pas
          </span>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${openSection === 'workflows' ? 'rotate-180' : ''}`}
          />
        </button>
        {openSection === 'workflows' && (
          <div className="space-y-3 pl-1">
            {guide.workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{wf.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                  {wf.content}
                </p>
                {wf.links && wf.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {wf.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        → {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Astuces & dépannage
        </h2>
        <ul className="space-y-2">
          {guide.tips.map((tip) => (
            <li key={tip} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
