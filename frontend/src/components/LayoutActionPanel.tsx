'use client';

import React from 'react';
import { History, Plus, Trash2, Move, Settings, LayoutTemplate, Pencil } from 'lucide-react';
import { LayoutActionEntry } from '@/lib/layoutActionLog';

const kindIcons: Record<LayoutActionEntry['kind'], React.ReactNode> = {
 add: <Plus className="w-3 h-3 text-emerald-600" />,
 edit: <Pencil className="w-3 h-3 text-primary" />,
 delete: <Trash2 className="w-3 h-3 text-rose-600" />,
 move: <Move className="w-3 h-3 text-primary" />,
 template: <LayoutTemplate className="w-3 h-3 text-amber-600" />,
 settings: <Settings className="w-3 h-3 text-muted" />,
 info: <History className="w-3 h-3 text-muted" />,
};

interface LayoutActionPanelProps {
 actions: LayoutActionEntry[];
 className?: string;
}

export default function LayoutActionPanel({ actions, className = '' }: LayoutActionPanelProps) {
 return (
 <div className={`bg-surface-muted border border-border rounded-xl overflow-hidden ${className}`}>
 <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-white">
 <History className="w-4 h-4 text-primary" />
 <p className="text-xs font-bold text-foreground uppercase tracking-wider">Journal des actions</p>
 <span className="ml-auto text-xs font-bold text-muted">{actions.length}</span>
 </div>
 <ul className="max-h-48 overflow-y-auto divide-y divide-border">
 {actions.length === 0 ? (
 <li className="px-3 py-4 text-xs text-muted italic text-center">Aucune action enregistrée — chaque geste sera conservé avec le plan.</li>
 ) : (
 actions.map((a) => (
 <li key={a.id} className="px-3 py-2 flex items-start gap-2 text-[11px]">
 <span className="mt-0.5 shrink-0">{kindIcons[a.kind]}</span>
 <div className="min-w-0 flex-1">
 <p className="text-foreground leading-snug">{a.message}</p>
 <p className="text-xs text-muted mt-0.5">
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
