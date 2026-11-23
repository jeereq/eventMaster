'use client';

import { useState } from 'react';
import {
  EDITORIAL_LAYOUT_CATEGORIES,
  EDITORIAL_LAYOUTS,
  type EditorialLayout,
  type EditorialLayoutCategory,
  type EditorialLayoutId,
  fillEditorialTokens,
} from '@/lib/invitationEditorialLayouts';
import TemplateImage from '@/components/TemplateImage';
import { templateElementWrapperStyle } from '@/lib/templateElementStyle';
import { cn } from '@/lib/cn';

const CEREMONY_CATEGORIES = new Set<EditorialLayoutCategory>(['mariage', 'fete']);

const THUMB_TOKENS = { title: 'Amina & Jean', date: 'Samedi 20 décembre', location: 'Kinshasa' };

/** Vraie miniature de la mise en page (mêmes éléments, mêmes effets, mise à l’échelle). */
function LayoutThumb({ layout, height = 112 }: { layout: EditorialLayout; height?: number }) {
  const scale = height / layout.canvasHeight;
  return (
    <div className="relative h-full overflow-hidden" style={{ backgroundColor: layout.bgColor }}>
      <div
        className="absolute top-0 left-1/2 origin-top"
        style={{
          width: layout.canvasWidth,
          height: layout.canvasHeight,
          transform: `translateX(-50%) scale(${scale})`,
          backgroundColor: layout.bgColor,
        }}
      >
        {layout.elements
          .filter((el) => el.type !== 'rsvp-block')
          .map((el) => (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${el.xPct}%`,
                top: `${el.yPct}%`,
                width: `${el.wPct}%`,
                zIndex: el.zIndex,
                ...templateElementWrapperStyle(el, true),
              }}
            >
              {el.type === 'image' ? (
                <TemplateImage el={{ ...el, imageUrl: el.imageUrl?.replace(/([?&])w=\d+/, '$1w=240') }} alt="" draggable={false} />
              ) : el.type === 'divider' ? (
                <div className="border-t" style={{ borderColor: el.color }} />
              ) : (
                <div
                  className="whitespace-pre-line leading-tight"
                  style={{
                    color: el.color,
                    fontSize: el.fontSize,
                    textAlign: el.align,
                    fontFamily: el.fontFamily || 'Cormorant Garamond',
                    letterSpacing: el.letterSpacing || 'normal',
                    fontWeight: el.bold ? 700 : 400,
                    fontStyle: el.italic ? 'italic' : 'normal',
                  }}
                >
                  {fillEditorialTokens(el.text, THUMB_TOKENS)}
                </div>
              )}
            </div>
          ))}
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
  const [showOtherFormats, setShowOtherFormats] = useState(false);
  const ceremony = EDITORIAL_LAYOUT_CATEGORIES.filter((category) => CEREMONY_CATEGORIES.has(category.id));
  const others = EDITORIAL_LAYOUT_CATEGORIES.filter((category) => !CEREMONY_CATEGORIES.has(category.id));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-foreground">Mises en page de cérémonie</h3>
        <p className="text-xs text-muted leading-relaxed mt-0.5">
          Un clic remplace la carte. Confirmez avant d’écraser votre travail.
        </p>
      </div>
      {ceremony.map((category) => (
        <LayoutCategoryGroup
          key={category.id}
          category={category.id}
          label={category.label}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
      <button
        type="button"
        aria-expanded={showOtherFormats}
        onClick={() => setShowOtherFormats((open) => !open)}
        className="min-h-11 w-full text-left text-xs font-semibold text-muted hover:text-foreground rounded-[var(--radius-button)] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {showOtherFormats ? 'Masquer soirée et affiche' : 'Autres formats (soirée, affiche)'}
      </button>
      {showOtherFormats
        ? others.map((category) => (
          <LayoutCategoryGroup
            key={category.id}
            category={category.id}
            label={category.label}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))
        : null}
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
      <p className="text-xs font-semibold text-muted">{label}</p>
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
              <div className="h-28 border-b border-border/60" aria-hidden>
                <LayoutThumb layout={layout} />
              </div>
              <span className="block px-2 py-1.5">
                <span className="block text-xs font-bold text-foreground leading-tight">{layout.name}</span>
                <span className="block text-xs text-muted leading-snug mt-0.5">{layout.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
