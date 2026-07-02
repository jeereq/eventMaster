'use client';

import React from 'react';
import { History, Plus, Trash2, Move, Settings, LayoutTemplate, Pencil } from 'lucide-react';
import { LayoutActionEntry } from '@/lib/layoutActionLog';

const kindIcons: Record<LayoutActionEntry['kind'], React.ReactNode> = {
  add: <Plus className="w-3 h-3 text-emerald-600" />,
  edit: <Pencil className="w-3 h-3 text-indigo-600" />,
  delete: <Trash2 className="w-3 h-3 text-rose-600" />,
  move: <Move className="w-3 h-3 text-violet-600" />,
  template: <LayoutTemplate className="w-3 h-3 text-amber-600" />,
  settings: <Settings className="w-3 h-3 text-slate-600" />,
  info: <History className="w-3 h-3 text-slate-400" />,
};

interface LayoutActionPanelProps {
  actions: LayoutActionEntry[];
  className?: string;
}

export default function LayoutActionPanel({ actions, className = '' }: LayoutActionPanelProps) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2 bg-white">
        <History className="w-4 h-4 text-indigo-600" />
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Journal des actions</p>
        <span className="ml-auto text-[10px] font-bold text-slate-400">{actions.length}</span>
      </div>
      <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100">
        {actions.length === 0 ? (
          <li className="px-3 py-4 text-xs text-slate-400 italic text-center">Aucune action enregistrée.</li>
        ) : (
          actions.map((a) => (
            <li key={a.id} className="px-3 py-2 flex items-start gap-2 text-[11px]">
              <span className="mt-0.5 shrink-0">{kindIcons[a.kind]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-slate-700 leading-snug">{a.message}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {new Date(a.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
