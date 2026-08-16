'use client';

import React from 'react';

type ThumbElement = {
  type?: string;
  text?: string;
  color?: string;
  fontSize?: string;
  align?: string;
};

interface TemplatePreviewThumbProps {
  content?: {
    global?: { bgColor?: string; [key: string]: unknown };
    elements?: Array<Record<string, unknown>>;
  };
  name?: string;
  className?: string;
  variant?: 'thumb' | 'card';
}

export default function TemplatePreviewThumb({
  content,
  name = 'Modèle',
  className = '',
  variant = 'thumb',
}: TemplatePreviewThumbProps) {
  const bgColor = (content?.global?.bgColor as string | undefined) || '#faf8f5';
  const elements = ((content?.elements || []) as ThumbElement[])
    .filter((el) => el.type === 'text' || el.type === 'button')
    .slice(0, variant === 'card' ? 4 : 3);

  if (variant === 'card') {
    return (
      <div
        className={`w-full max-w-[220px] h-[130px] rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col justify-between p-3 shadow-sm ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        <div className="space-y-1 flex-1 overflow-hidden flex flex-col justify-center">
          {elements.length > 0 ? (
            elements.map((el, i) =>
              el.type === 'button' ? (
                <div
                  key={i}
                  className="text-[9px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-md text-center mx-auto w-fit mt-1"
                >
                  {el.text?.slice(0, 24) || 'Bouton'}
                </div>
              ) : (
                <div
                  key={i}
                  className="text-[9px] leading-tight truncate text-center font-medium"
                  style={{ color: el.color || '#334155', textAlign: (el.align as React.CSSProperties['textAlign']) || 'center' }}
                >
                  {el.text && el.text.length > 36 ? `${el.text.slice(0, 36)}…` : el.text || '…'}
                </div>
              ),
            )
          ) : (
            <div className="text-[10px] text-slate-500 text-center font-semibold px-2">{name}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-16 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-center p-1.5 shrink-0 ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="space-y-0.5 flex-1 overflow-hidden flex flex-col justify-center">
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
