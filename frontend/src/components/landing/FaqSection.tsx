'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '@/config/siteContent';

interface FaqSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  showContactLink?: boolean;
  className?: string;
}

export default function FaqSection({
  id = 'faq',
  title = 'Questions fréquentes',
  subtitle = 'Tout ce qu\'il faut savoir sur EventMaster, les forfaits, la sécurité des données et le support.',
  showContactLink = true,
  className = '',
}: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <section id={id} className={`py-20 bg-slate-50 dark:bg-slate-900/50 scroll-mt-24 ${className}`}>
      <div className="page-container">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            <HelpCircle className="w-4 h-4" />
            <span>FAQ</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showContactLink && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-8">
            Vous ne trouvez pas votre réponse ?{' '}
            <Link href="/contact" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Contactez notre équipe
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
