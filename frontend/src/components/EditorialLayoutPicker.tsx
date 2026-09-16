'use client';

import {
  EDITORIAL_LAYOUT_CATEGORIES,
  EDITORIAL_LAYOUTS,
  type EditorialLayout,
  type EditorialLayoutCategory,
  type EditorialLayoutId,
} from '@/lib/invitationEditorialLayouts';
import { cn } from '@/lib/cn';

function LayoutThumb({ layout }: { layout: EditorialLayout }) {
  if (layout.id === 'wedding-arch') {
    return (
      <div className="relative h-full bg-[#0b1220] overflow-hidden">
        <div className="absolute inset-x-[20%] top-[8%] h-[42%] rounded-t-full border-2 border-amber-400/90 bg-amber-200/15" />
        <div className="absolute bottom-[16%] inset-x-1 text-center text-[6px] font-semibold tracking-[0.18em] text-amber-200">
          NOMS
        </div>
      </div>
    );
  }
  if (layout.id === 'moodboard') {
    return (
      <div className="relative h-full bg-[#111] overflow-hidden p-1 grid grid-cols-3 gap-0.5">
        <span className="bg-zinc-600" />
        <span className="rounded-full bg-zinc-400" />
        <span className="bg-zinc-500" />
        <span className="col-span-3 text-center text-[6px] tracking-[0.22em] text-zinc-100 self-center">INSPO</span>
        <span className="bg-zinc-700" />
        <span className="bg-zinc-500" />
        <span className="bg-zinc-600" />
      </div>
    );
  }
  if (layout.id === 'diamonds') {
    return (
      <div className="relative h-full bg-[#f5c400] overflow-hidden">
        <span className="absolute left-[12%] top-[10%] size-6 rotate-45 bg-zinc-900" />
        <span className="absolute right-[12%] top-[10%] size-6 rotate-45 bg-zinc-800" />
        <span className="absolute left-1/2 top-[38%] size-8 -translate-x-1/2 rotate-45 bg-zinc-950" />
        <span className="absolute left-[12%] bottom-[18%] size-6 rotate-45 bg-zinc-700" />
        <span className="absolute right-[12%] bottom-[18%] size-6 rotate-45 bg-zinc-800" />
      </div>
    );
  }
  if (layout.id === 'club-flyer') {
    return (
      <div className="relative h-full bg-black overflow-hidden">
        <div className="absolute inset-x-[18%] top-[8%] h-[48%] rounded-full bg-zinc-700" />
        <div className="absolute bottom-[18%] inset-x-1 text-center text-[9px] font-black leading-none text-white">
          BLACK
        </div>
      </div>
    );
  }
  if (layout.id === 'magazine-cover') {
    return (
      <div className="relative h-full bg-[#2a2a2c] overflow-hidden">
        <div className="absolute inset-x-[22%] top-[22%] bottom-[12%] bg-zinc-500" />
        <div className="absolute top-1 inset-x-0.5 text-center text-[5px] tracking-[0.16em] text-zinc-100">
          MAGAZINE
        </div>
      </div>
    );
  }
  if (layout.id === 'affiche-hero') {
    return (
      <div className="relative h-full bg-[#0a0606] overflow-hidden">
        <div className="absolute inset-x-[24%] top-[6%] bottom-[28%] bg-gradient-to-b from-amber-700/40 to-transparent" />
        <div className="absolute bottom-[10%] inset-x-1 text-center text-[7px] font-bold tracking-widest text-amber-200">
          HÉRO
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-full bg-[#111] overflow-hidden">
      <div className="absolute inset-x-[10%] top-[8%] bottom-[22%] rounded-full bg-zinc-600" />
      <div className="absolute bottom-[8%] inset-x-1 text-center text-[6px] tracking-[0.18em] text-zinc-200">
        REGARD
      </div>
    </div>
  );
}

export default function EditorialLayoutPicker({
  onSelect,
  selectedId,
}: {
  onSelect: (id: EditorialLayoutId) => void;
  selectedId?: EditorialLayoutId | null;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-bold text-foreground">Mises en page photo</h3>
        <p className="text-[11px] text-muted leading-relaxed mt-0.5">
          Un clic pose le canevas. Remplacez ensuite les photos par les vôtres.
        </p>
      </div>
      {EDITORIAL_LAYOUT_CATEGORIES.map((category) => (
        <LayoutCategoryGroup
          key={category.id}
          category={category.id}
          label={category.label}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function LayoutCategoryGroup({
  category,
  label,
  selectedId,
  onSelect,
}: {
  category: EditorialLayoutCategory;
  label: string;
  selectedId?: EditorialLayoutId | null;
  onSelect: (id: EditorialLayoutId) => void;
}) {
  const layouts = EDITORIAL_LAYOUTS.filter((layout) => layout.category === category);
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {layouts.map((layout) => {
          const selected = selectedId === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              onClick={() => onSelect(layout.id)}
              title={`Remplacer le canevas par « ${layout.name} »`}
              className={cn(
                'text-left rounded-xl border overflow-hidden transition min-h-11',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer',
                selected
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border hover:border-primary/40 hover:bg-surface-muted',
              )}
            >
              <div className="h-20 border-b border-border/60" aria-hidden>
                <LayoutThumb layout={layout} />
              </div>
              <span className="block px-2 py-1.5">
                <span className="block text-xs font-bold text-foreground leading-tight">{layout.name}</span>
                <span className="block text-[11px] text-muted leading-snug mt-0.5">{layout.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
