'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ClipboardList, Clock, Flag, Link2, Loader2, Plus, Sparkles, Trash2, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, EmptyState, Input, StatusPill, ViewModeToggle, useViewMode, listStackClass } from '@/components/ui';
import { cn } from '@/lib/cn';
import EventTaskNotifications from '@/components/EventTaskNotifications';
import {
  EVENT_TASK_KIND_LABELS,
  EVENT_TASK_PRIORITY_LABELS,
  EVENT_TASK_STATUS_LABELS,
  isOpenEventTask,
  summarizeTasksByPerson,
  taskDueLabel,
  taskDueState,
  type EventTaskAssigneeOption,
  type EventTaskItem,
  type EventTaskKind,
  type EventTaskStatus,
} from '@/lib/eventTasks';

function statusTone(status: EventTaskStatus): 'amber' | 'emerald' | 'slate' | 'sky' | 'rose' {
  if (status === 'DONE') return 'emerald';
  if (status === 'CANCELLED') return 'slate';
  if (status === 'IN_PROGRESS') return 'sky';
  if (status === 'BLOCKED') return 'rose';
  return 'amber';
}

const KIND_OPTIONS = Object.entries(EVENT_TASK_KIND_LABELS) as Array<[EventTaskKind, string]>;
const STATUS_OPTIONS = Object.entries(EVENT_TASK_STATUS_LABELS) as Array<[EventTaskStatus, string]>;

export default function EventTaskPanel({ eventId }: { eventId: string }) {
  const [tasks, setTasks] = useState<EventTaskItem[]>([]);
  const [assignees, setAssignees] = useState<EventTaskAssigneeOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [personFilter, setPersonFilter] = useState('all');
  const { mode, setViewMode, columns, setGridColumns, gridClassName } = useViewMode('em-view-event-tasks', 'list', 2);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [kind, setKind] = useState<EventTaskKind>('GENERAL');
  const [priority, setPriority] = useState(1);
  const [blockedById, setBlockedById] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = (await api.get(`/events/${eventId}/tasks`)) as {
        tasks?: EventTaskItem[];
        canManage?: boolean;
        assignees?: EventTaskAssigneeOption[];
      };
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setCanManage(Boolean(data.canManage));
      setAssignees(Array.isArray(data.assignees) ? data.assignees : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les tâches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const visible = useMemo(() => {
    const byStatus = filter === 'open' ? tasks.filter((item) => isOpenEventTask(item.status)) : tasks;
    if (personFilter === 'all') return byStatus;
    if (personFilter === 'unassigned') return byStatus.filter((item) => !item.assignee);
    return byStatus.filter((item) => item.assignee?.id === personFilter);
  }, [filter, personFilter, tasks]);
  const openCount = tasks.filter((item) => isOpenEventTask(item.status)).length;
  const personStats = useMemo(() => summarizeTasksByPerson(tasks), [tasks]);

  const patch = async (taskId: string, body: Record<string, unknown>) => {
    setError('');
    try {
      const data = (await api.patch(`/events/${eventId}/tasks/${taskId}`, body)) as { task?: EventTaskItem };
      if (data.task) {
        await load();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour la tâche.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = (await api.post(`/events/${eventId}/tasks`, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        assigneeId: assigneeId || undefined,
        dueAt: dueAt || undefined,
        kind,
        priority,
        blockedById: blockedById || undefined,
      })) as { task?: EventTaskItem };
      if (data.task) setTasks((prev) => [...prev, data.task!]);
      setTitle('');
      setNotes('');
      setAssigneeId('');
      setDueAt('');
      setKind('GENERAL');
      setPriority(1);
      setBlockedById('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de créer la tâche.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    setError('');
    try {
      const data = (await api.post(`/events/${eventId}/tasks/seed`, {})) as {
        tasks?: EventTaskItem[];
        message?: string;
      };
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de générer la checklist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    setError('');
    try {
      await api.delete(`/events/${eventId}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer la tâche.');
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const selectClass = 'px-2.5 py-1 min-h-[36px] sm:min-h-[32px] rounded-xl border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-muted transition-colors outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-display font-semibold text-foreground tracking-tight inline-flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Ce qui requiert votre attention
          </h2>
          <p className="text-sm text-muted">
            Priorités, dépendances et progression de l'événement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewModeToggle
            storageKey="em-view-event-tasks"
            value={mode}
            onChange={setViewMode}
            columns={columns}
            onColumnsChange={setGridColumns}
          />
          <div className="inline-flex rounded-xl border border-border bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setFilter('open')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                filter === 'open' ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted hover:text-foreground',
              )}
            >
              Ouvertes ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                filter === 'all' ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted hover:text-foreground',
              )}
            >
              Toutes
            </button>
          </div>
          {canManage ? (
            <Button
              size="sm"
              variant="secondary"
              loading={saving}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => void handleSeed()}
            >
              Checklist
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <EventTaskNotifications
        eventId={eventId}
        refreshKey={tasks.map((item) => `${item.id}:${item.status}:${item.assignee?.id || ''}`).join('|')}
      />

      {personStats.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {personStats.map((person) => {
            const active = personFilter === person.id;
            const remaining = person.open + person.inProgress + person.blocked;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setPersonFilter(active ? 'all' : person.id)}
                className={cn(
                  'text-left rounded-[var(--radius-card)] border px-3 py-2.5 transition',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-surface hover:border-foreground/30',
                )}
              >
                <p className="text-xs font-semibold truncate">{person.label}</p>
                <p className={cn('text-[11px] mt-1', active ? 'text-background/80' : 'text-muted')}>
                  {remaining} ouverte{remaining > 1 ? 's' : ''}
                  {person.overdue > 0 ? ` · ${person.overdue} en retard` : ''}
                  {' · '}
                  {person.done} faite{person.done > 1 ? 's' : ''}
                </p>
                <div className={cn('mt-2 h-1.5 rounded-full overflow-hidden', active ? 'bg-background/20' : 'bg-surface-muted')}>
                  <div
                    className={cn('h-full rounded-full', active ? 'bg-background' : 'bg-emerald-500')}
                    style={{ width: `${person.total ? Math.round((person.done / person.total) * 100) : 0}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-5 h-5" />}
          title={
            personFilter !== 'all'
              ? 'Aucune tâche pour cette personne'
              : filter === 'open'
                ? 'Tout est sous contrôle'
                : 'Aucune tâche'
          }
          description={
            canManage
              ? 'Vous êtes à jour. Générez la checklist depuis la préparation, ou ajoutez une tâche ci-dessous.'
              : 'Le manager n’a pas encore assigné de tâches pour cet événement.'
          }
        />
      ) : (
        <ul className={mode === 'grid' ? gridClassName : listStackClass}>
          {visible.map((task) => {
            const done = task.status === 'DONE';
            const canToggle = task.mine || canManage || !task.assignee;
            const due = taskDueState(task.dueAt, task.status);
            const dueText = taskDueLabel(task.dueAt, task.status);
            const blockers = tasks.filter((item) => item.id !== task.id && item.status !== 'CANCELLED');
            return (
              <li
                key={task.id}
                className={cn(
                  'rounded-2xl border border-border/80 bg-surface p-3.5 sm:p-4 transition-all hover:border-border hover:shadow-2xs flex flex-col gap-3',
                  mode === 'grid' && 'h-full justify-between',
                  done && 'opacity-65 bg-surface-muted/20 border-border/40',
                )}
              >
                {/* En-tête : Checkbox (touch-target 44px), Titre & Notes, et Action Supprimer */}
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      disabled={!canToggle || task.status === 'CANCELLED' || task.status === 'BLOCKED'}
                      onClick={() => void patch(task.id, { status: done ? 'OPEN' : 'DONE' })}
                      className={cn(
                        'min-w-11 min-h-11 -m-2 p-2 inline-flex items-center justify-center shrink-0 transition-transform active:scale-95 touch-manipulation',
                        (!canToggle || task.status === 'CANCELLED' || task.status === 'BLOCKED') && 'cursor-not-allowed opacity-40',
                      )}
                      title={done ? 'Rouvrir' : 'Marquer faite'}
                      aria-label={done ? 'Marquer comme non faite' : 'Marquer comme faite'}
                    >
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors',
                          done
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                            : 'border-muted/40 text-transparent hover:border-primary hover:text-primary/70',
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    </button>

                    <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                      <p className={cn('text-sm sm:text-base font-semibold tracking-tight text-foreground break-words leading-snug', done && 'line-through text-muted')}>
                        {task.title}
                      </p>
                      {task.notes ? (
                        <p className="text-xs text-muted/90 leading-relaxed line-clamp-2">
                          {task.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(task.id)}
                      className="min-w-11 min-h-11 -m-2 p-2 inline-flex items-center justify-center text-muted/50 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 touch-manipulation"
                      title="Supprimer la tâche"
                      aria-label="Supprimer la tâche"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                {/* Bannière de dépendance bloquante */}
                {task.blockedBy ? (
                  <div className="ml-0 sm:ml-9 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 max-w-full truncate">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">
                      Dépend de : <strong className="font-semibold">{task.blockedBy.title}</strong>
                      {task.blockedBy.status !== 'DONE' ? ' (en cours)' : ' (terminée)'}
                    </span>
                  </div>
                ) : null}

                {/* Ligne inférieure : Statut, Type, Priorité, Échéance, Assignation, Dépendance (responsive wrap fluide) */}
                <div className={cn(
                  "flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 sm:border-t-0 sm:pt-0 sm:ml-9",
                  mode === 'grid' && "mt-auto w-full pt-3 border-t border-border/50 sm:ml-0"
                )}>
                  {canManage ? (
                    <select
                      value={task.status}
                      onChange={(e) => void patch(task.id, { status: e.target.value })}
                      className={cn(selectClass, 'font-semibold')}
                      aria-label="Statut de la tâche"
                    >
                      {STATUS_OPTIONS.map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusPill tone={statusTone(task.status)}>{EVENT_TASK_STATUS_LABELS[task.status]}</StatusPill>
                  )}

                  {canManage ? (
                    <select
                      value={task.kind || 'GENERAL'}
                      onChange={(e) => void patch(task.id, { kind: e.target.value })}
                      className={selectClass}
                      aria-label="Catégorie de la tâche"
                    >
                      {KIND_OPTIONS.map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusPill tone="slate">{EVENT_TASK_KIND_LABELS[task.kind || 'GENERAL']}</StatusPill>
                  )}

                  {canManage ? (
                    <select
                      value={String(task.priority ?? 1)}
                      onChange={(e) => void patch(task.id, { priority: Number(e.target.value) })}
                      className={cn(
                        selectClass,
                        task.priority === 2 && 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold',
                      )}
                      aria-label="Priorité de la tâche"
                    >
                      {[0, 1, 2].map((level) => (
                        <option key={level} value={level}>{EVENT_TASK_PRIORITY_LABELS[level]}</option>
                      ))}
                    </select>
                  ) : task.priority === 2 ? (
                    <StatusPill tone="rose" className="gap-1 inline-flex items-center">
                      <Flag className="w-3 h-3" />
                      Haute
                    </StatusPill>
                  ) : null}

                  {dueText ? (
                    <StatusPill
                      tone={due === 'overdue' ? 'rose' : due === 'today' ? 'amber' : 'slate'}
                      className="inline-flex items-center gap-1 min-h-[26px]"
                    >
                      <Clock className="w-3 h-3" />
                      {dueText}
                    </StatusPill>
                  ) : null}

                  {task.mine ? <StatusPill tone="sky">Moi</StatusPill> : null}

                  {canManage ? (
                    <label className="inline-flex items-center gap-1.5 text-xs text-muted bg-surface-muted/60 border border-border px-2.5 py-1 rounded-xl min-h-[36px] sm:min-h-[32px]">
                      <UserRound className="w-3.5 h-3.5 text-muted shrink-0" />
                      <select
                        value={task.assignee?.id || ''}
                        onChange={(e) => void patch(task.id, { assigneeId: e.target.value || null })}
                        className="bg-transparent border-0 text-xs font-medium text-foreground max-w-[10rem] sm:max-w-[12rem] outline-none cursor-pointer"
                        aria-label="Assigner la tâche"
                      >
                        <option value="">Non assignée</option>
                        {assignees.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name || person.email} · {person.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted bg-surface-muted/50 border border-border/60 px-2.5 py-1 rounded-xl">
                      <UserRound className="w-3.5 h-3.5 text-muted shrink-0" />
                      {task.assignee ? task.assignee.name || task.assignee.email : 'Non assignée'}
                    </span>
                  )}

                  {canManage ? (
                    <label className="inline-flex items-center gap-1.5 text-xs text-muted bg-surface-muted/60 border border-border px-2.5 py-1 rounded-xl min-h-[36px] sm:min-h-[32px]">
                      <Link2 className="w-3.5 h-3.5 text-muted shrink-0" />
                      <select
                        value={task.blockedById || ''}
                        onChange={(e) => void patch(task.id, { blockedById: e.target.value || null })}
                        className="bg-transparent border-0 text-xs font-medium text-foreground max-w-[10rem] sm:max-w-[12rem] outline-none cursor-pointer"
                        title="Tâche bloquante"
                        aria-label="Tâche bloquante"
                      >
                        <option value="">Sans dépendance</option>
                        {blockers.map((item) => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-border/60 bg-surface-muted/10 p-5 space-y-4 shadow-sm"
        >
          <p className="text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Nouvelle tâche
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Vérifier le parking VIP"
                className="w-full bg-surface"
              />
            </div>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as EventTaskKind)}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {KIND_OPTIONS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {[0, 1, 2].map((level) => (
                <option key={level} value={level}>{EVENT_TASK_PRIORITY_LABELS[level]}</option>
              ))}
            </select>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes, contexte, livrable attendu… (optionnel)"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm resize-y min-h-[3rem] focus:ring-2 focus:ring-primary/20 outline-none"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm flex-1 focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Non assignée</option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name || person.email} · {person.label}
                </option>
              ))}
            </select>
            <select
              value={blockedById}
              onChange={(e) => setBlockedById(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm flex-1 focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Sans dépendance</option>
              {tasks.filter((item) => isOpenEventTask(item.status) || item.status === 'DONE').map((item) => (
                <option key={item.id} value={item.id}>Après : {item.title}</option>
              ))}
            </select>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              title="Échéance — un rappel est envoyé la veille et le jour J"
            />
            <Button type="submit" loading={saving} disabled={!title.trim()} className="shrink-0 h-[42px]">
              Ajouter
            </Button>
          </div>
          <p className="text-[11px] text-muted">
            Une tâche dépendante passe en « bloquée » tant que la précédente n’est pas faite. Avec une échéance, l’assigné reçoit un rappel la veille / le jour J.
          </p>
        </form>
      ) : null}

      {canManage && tasks.length === 0 && !loading && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-4">
          <Sparkles className="w-8 h-8 text-primary mx-auto" />
          <div>
            <h3 className="font-display font-semibold text-foreground text-lg">Générer une checklist type</h3>
            <p className="text-sm text-muted max-w-sm mx-auto mt-1">
              Commencez rapidement avec une liste de tâches pré-configurée (communication, logistique, relances).
            </p>
          </div>
          <Button onClick={handleSeed} variant="secondary" loading={saving}>
            Générer les tâches de base
          </Button>
        </div>
      )}
    </div>
  );
}
