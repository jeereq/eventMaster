'use client';

import React, { useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Users,
  ClipboardList,
  MessageSquare,
  Ticket,
  Heart,
  ScanLine,
  Store,
  LayoutGrid,
  ChevronDown,
  type LucideIcon,
} from '@/components/icons';
import { type EventWorkflowState, type EventWorkflowTab } from '@/lib/eventWorkflow';
import { OverflowMenu } from '@/components/ui';
import { cn } from '@/lib/cn';

interface EventWorkflowPanelProps {
  workflow: EventWorkflowState;
  activeTab: string;
  onNavigateTab: (tab: EventWorkflowTab) => void;
  /** Mode protocole : Accueil, Billetterie et Tâches seulement. */
  protocolDesk?: boolean;
  /** Particulier (B2C) : pas de billetterie, équipe = co-organisateurs. */
  personal?: boolean;
  /** Compteur affiché dans l’onglet (ex. nombre d’invités). */
  badges?: Partial<Record<EventWorkflowTab, string | number>>;
  /** Onglets sans objet pour cet événement (masqués, sauf s’ils sont ouverts). */
  hiddenTabs?: EventWorkflowTab[];
}

type TabItem = {
  id: EventWorkflowTab;
  label: string;
  icon: LucideIcon;
  complete?: boolean;
};

/**
 * « Invités » regroupe trois écrans (mêmes identifiants d’onglet et mêmes adresses ?tab= qu’avant) :
 * la liste, l’invitation et les infos pratiques. Un sélecteur sous la ligne d’onglets passe de l’un à l’autre.
 */
const GUEST_GROUP: Array<{ id: EventWorkflowTab; label: string }> = [
  { id: 'guests', label: 'Liste' },
  { id: 'invitations', label: 'Invitation' },
  { id: 'guestInfo', label: 'Infos pratiques' },
];
const GUEST_GROUP_IDS = new Set<EventWorkflowTab>(GUEST_GROUP.map((item) => item.id));

/** Onglet de premier niveau qui porte un écran (les écrans du groupe Invités sont sous « guests »). */
function topLevelOf(tab: string): string {
  return GUEST_GROUP_IDS.has(tab as EventWorkflowTab) ? 'guests' : tab;
}

const SUPPORT_TABS: TabItem[] = [
  { id: 'ticketing', label: 'Billetterie', icon: Ticket },
  { id: 'donations', label: 'Dons solidaires', icon: Heart },
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
  { id: 'staff', label: 'Équipe', icon: Users },
];

const PROTOCOL_TABS: TabItem[] = [
  { id: 'protocol', label: 'Accueil jour J', icon: ScanLine },
  { id: 'ticketing', label: 'Billetterie', icon: Ticket },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
];

const TAB_CLASS =
  'relative inline-flex shrink-0 items-center gap-1.5 px-3 min-h-11 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 rounded-t-lg';

function focusWorkflowTab(id: EventWorkflowTab) {
  document.getElementById(`workflow-tab-${id}`)?.focus();
}

function onTabListKeyDown(
  event: React.KeyboardEvent,
  tabs: Array<{ id: EventWorkflowTab }>,
  selectedId: string,
  onSelect: (id: EventWorkflowTab) => void,
) {
  const ids = tabs.map((tab) => tab.id);
  const current = Math.max(0, ids.indexOf(selectedId as EventWorkflowTab));
  let next = current;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (current + 1) % ids.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    next = (current - 1 + ids.length) % ids.length;
  } else if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = ids.length - 1;
  } else {
    return;
  }
  event.preventDefault();
  onSelect(ids[next]);
  requestAnimationFrame(() => focusWorkflowTab(ids[next]));
}

function stepComplete(workflow: EventWorkflowState, tab: EventWorkflowTab): boolean {
  const steps = workflow.steps.filter((step) => step.tab === tab);
  return steps.length > 0 && steps.every((step) => step.status === 'complete');
}

/** Vue d’ensemble puis les quatre étapes ; les écrans complémentaires vont dans « Plus ». */
function buildTabs(
  workflow: EventWorkflowState,
  protocolDesk: boolean,
  personal: boolean,
): { mainTabs: TabItem[]; supportTabs: TabItem[] } {
  if (protocolDesk) return { mainTabs: PROTOCOL_TABS, supportTabs: [] };
  const mainTabs: TabItem[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: LayoutGrid },
    { id: 'prep', label: 'Préparation', icon: Store, complete: stepComplete(workflow, 'prep') },
    {
      id: 'guests',
      label: 'Invités',
      icon: Users,
      complete: stepComplete(workflow, 'guests') && stepComplete(workflow, 'invitations'),
    },
    { id: 'tablePlan', label: 'Plan de table', icon: LayoutGrid, complete: stepComplete(workflow, 'tablePlan') },
    { id: 'protocol', label: 'Jour J', icon: ScanLine, complete: stepComplete(workflow, 'protocol') },
  ];
  const supportTabs = personal
    ? SUPPORT_TABS.filter((tab) => tab.id !== 'ticketing').map((tab) =>
        tab.id === 'staff' ? { ...tab, label: 'Co-organisateurs' } : tab,
      )
    : SUPPORT_TABS;
  return { mainTabs, supportTabs };
}

export default function EventWorkflowPanel({
  workflow,
  activeTab,
  onNavigateTab,
  protocolDesk = false,
  personal = false,
  badges,
  hiddenTabs,
}: EventWorkflowPanelProps) {
  const activeTop = protocolDesk ? activeTab : topLevelOf(activeTab);
  const visible = (tab: TabItem) => tab.id === activeTop || !hiddenTabs?.includes(tab.id);
  const built = buildTabs(workflow, protocolDesk, personal);
  const mainTabs = built.mainTabs.filter(visible);
  const supportTabs = built.supportTabs.filter(visible);
  /** Les écrans complémentaires passent dans « Plus », sauf celui qui est ouvert. */
  const activeSupport = supportTabs.find((tab) => tab.id === activeTop);
  const tabs = activeSupport ? [...mainTabs, activeSupport] : mainTabs;
  const moreTabs = supportTabs.filter((tab) => tab.id !== activeTop);
  const inGuestGroup = !protocolDesk && activeTop === 'guests';

  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!activeBtnRef.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeBtnRef.current.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeTop]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1 border-b border-border">
        <div
          role="tablist"
          aria-label={protocolDesk ? 'Desk protocole' : 'Onglets de l’événement'}
          className="flex min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={(event) => onTabListKeyDown(event, tabs, activeTop, onNavigateTab)}
        >
          {tabs.map((tab) => {
            const selected = activeTop === tab.id;
            const Icon = tab.complete ? CheckCircle2 : tab.icon;
            const badge = badges?.[tab.id];
            return (
              <button
                key={tab.id}
                ref={selected ? activeBtnRef : null}
                type="button"
                id={`workflow-tab-${tab.id}`}
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onNavigateTab(tab.id)}
                className={cn(
                  TAB_CLASS,
                  selected
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted hover:text-foreground',
                )}
              >
                <Icon className={cn('w-4 h-4', tab.complete && 'text-primary')} aria-hidden />
                {tab.label}
                {badge !== undefined && badge !== '' ? (
                  <span className="rounded-full bg-surface-muted px-1.5 text-xs font-semibold tabular-nums text-foreground">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {moreTabs.length > 0 ? (
          <OverflowMenu
            align="right"
            triggerClassName={cn(TAB_CLASS, 'border-transparent text-muted hover:text-foreground')}
            trigger={
              <>
                Plus
                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
              </>
            }
            items={moreTabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              badge: badges?.[tab.id],
              onSelect: () => onNavigateTab(tab.id),
            }))}
          />
        ) : null}
      </div>

      {inGuestGroup ? (
        <div
          role="radiogroup"
          aria-label="Écrans des invités"
          className="inline-flex max-w-full p-0.5 rounded-full bg-surface-muted border border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {GUEST_GROUP.map((item) => {
            const selected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onNavigateTab(item.id)}
                className={cn(
                  'shrink-0 min-h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selected ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]' : 'text-muted hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
