'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, Lightbulb, ListOrdered } from 'lucide-react';
import { STAIRS_USER_GUIDE } from '@/lib/roomStairsUtils';
import { cn } from '@/lib/cn';

/** Guide utilisateur dédié aux escaliers (éditeur de salle). */
export default function StairsUserGuide({
  className,
  defaultOpen = false,
  compact = false,
}: {
  className?: string;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [sectionId, setSectionId] = useState<string | null>(STAIRS_USER_GUIDE.sections[0]?.id ?? null);

  return (
    <div className={cn('rounded-[var(--radius-card)] border border-sky-200/80 bg-sky-50/50 overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-sky-50 transition"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-sky-950">
          <BookOpen className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          {STAIRS_USER_GUIDE.title}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-sky-700 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="px-3 pb-3 space-y-3 border-t border-sky-200/60">
          <p className="text-[11px] text-sky-950/80 leading-relaxed pt-2">{STAIRS_USER_GUIDE.intro}</p>

          <div className="space-y-1.5">
            {STAIRS_USER_GUIDE.sections.map((section) => {
              const active = sectionId === section.id;
              return (
                <div key={section.id} className="rounded-[var(--radius-button)] border border-sky-200/70 bg-white/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSectionId(active ? null : section.id)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                      <ListOrdered className="w-3 h-3 text-sky-700" />
                      {section.title}
                    </span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-muted transition', active && 'rotate-180')} />
                  </button>
                  {active ? (
                    <ol className="px-2.5 pb-2.5 space-y-1.5 list-decimal pl-6">
                      {section.steps.map((step) => (
                        <li key={step} className="text-[10px] text-muted leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!compact ? (
            <div className="rounded-[var(--radius-button)] border border-amber-200/70 bg-amber-50/80 px-2.5 py-2 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Astuces
              </p>
              <ul className="space-y-1">
                {STAIRS_USER_GUIDE.tips.map((tip) => (
                  <li key={tip} className="text-[10px] text-amber-950/80 leading-relaxed pl-2 border-l-2 border-amber-300">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
