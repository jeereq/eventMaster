'use client';

import React from 'react';

interface TemplatePreviewThumbProps {
  content?: {
    global?: { bgColor?: string };
    elements?: Array<{ type: string; text?: string; color?: string; fontSize?: string }>;
  };
  name?: string;
  className?: string;
}

export default function TemplatePreviewThumb({ content, name = 'Modèle', className = '' }: TemplatePreviewThumbProps) {
  const bgColor = content?.global?.bgColor || '#f8fafc';
  const elements = (content?.elements || [])
    .filter((el) => el.type === 'text' || el.type === 'button')
    .slice(0, 3);

  return (
    <div
      className={`w-16 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-between p-1.5 shrink-0 ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="space-y-0.5 flex-1 overflow-hidden">
        {elements.length > 0 ? (
          elements.map((el, i) =>
            el.type === 'button' ? (
              <div key={i} className="h-2 rounded bg-indigo-500/80 mx-auto w-3/4 mt-auto" />
            ) : (
              <div
                key={i}
                className="text-[5px] leading-tight truncate text-center"
                style={{ color: el.color || '#334155' }}
              >
                {el.text || '…'}
              </div>
            ),
          )
        ) : (
          <div className="text-[5px] text-slate-500 text-center truncate">{name}</div>
        )}
      </div>
    </div>
  );
}
