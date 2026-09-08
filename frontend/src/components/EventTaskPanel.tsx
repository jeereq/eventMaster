'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ClipboardList, Clock, Flag, Loader2, Pencil, Plus, Sparkles, Trash2, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, ConfirmDialog, EmptyState, StatusPill, ViewModeToggle, useViewMode, listStackClass } from '@/components/ui';
import { cn } from '@/lib/cn';
import EventTaskNotifications from '@/components/EventTaskNotifications';
import EventTaskFormModal, { type EventTaskFormValues } from '@/components/EventTaskFormModal';
import {
  EVENT_TASK_KIND_LABELS,
  EVENT_TASK_STATUS_LABELS,
  isOpenEventTask,
  summarizeTasksByPerson,
  taskDueLabel,
  taskDueState,
  type EventTaskAssigneeOption,
  type EventTaskItem,
  type EventTaskStatus,
} from '@/lib/eventTasks';

function statusTone(status: EventTaskStatus): 'amber' | 'emerald' | 'slate' | 'sky' | 'rose' {
  if (status === 'DONE') return 'emerald';
  if (status === 'CANCELLED') return 'slate';
  if (status === 'IN_PROGRESS') return 'sky';
  if (status === 'BLOCKED') return 'rose';
  return 'amber';
}

export default function EventTaskPanel({ eventId }: { eventId: string }) {
  const [tasks, setTasks] = useState<EventTaskItem[]>([]);
  const [assignees, setAssignees] = useState<EventTaskAssigneeOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [personFilter, setPersonFilter] = useState('all');
  const { mode, setViewMode, columns, setGridColumns, gridClassName } = useViewMode('em-view-event-tasks', 'list', 2);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTaskItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const openCreate = () => {
    setFormError('');
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: EventTaskItem) => {
    if (!canManage) return;
    setFormError('');
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingTask(null);
    setFormError('');
  };

  const upsertTask = (task: EventTaskItem) => {
    setTasks((prev) => {
      const index = prev.findIndex((item) => item.id === task.id);
      if (index === -1) return [...prev, task];
      const next = [...prev];
      next[index] = task;
      return next;
    });
  };

  const patch = async (taskId: string, body: Record<string, unknown>) => {
    setError('');
    try {
      const data = (await api.patch(`/events/${eventId}/tasks/${taskId}`, body)) as { task?: EventTaskItem };
      if (data.task) upsertTask(data.task);
      else await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour la tâche.');
    }
  };

  const handleSave = async (values: EventTaskFormValues) => {
    setSaving(true);
    setFormError('');
    try {
      if (editingTask) {
        const data = (await api.patch(`/events/${eventId}/tasks/${editingTask.id}`, {
          title: values.title,
          notes: values.notes || null,
          kind: values.kind,
          priority: values.priority,
          status: values.status,
          assigneeId: values.assigneeId || null,
          blockedById: values.blockedById || null,
          dueAt: values.dueAt || null,
        })) as { task?: EventTaskItem };
        if (data.task) upsertTask(data.task);
        else await load();
      } else {
        const data = (await api.post(`/events/${eventId}/tasks`, {
          title: values.title,
          notes: values.notes || undefined,
          assigneeId: values.assigneeId || undefined,
          dueAt: values.dueAt || undefined,
          kind: values.kind,
          priority: values.priority,
          blockedById: values.blockedById || undefined,
        })) as { task?: EventTaskItem };
        if (data.task) setTasks((prev) => [...prev, data.task!]);
      }
      setModalOpen(false);
      setEditingTask(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Impossible d’enregistrer la tâche.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    setError('');
    try {
      const data = (await api.post(`/events/${eventId}/tasks/seed`, {})) as { tasks?: EventTaskItem[] };
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de générer la checklist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setError('');
    setDeleting(true);
    try {
      await api.delete(`/events/${eventId}/tasks/${pendingDeleteId}`);
      setTasks((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setPendingDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer la tâche.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-foreground tracking-tight inline-flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Ce qui requiert votre attention
          </h2>
          <p className="text-sm text-muted">Priorités, dépendances et progression de l’événement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewModeToggle
            storageKey="em-view-event-tasks"
            value={mode}
            onChange={setViewMode}
            columns={columns}
            onColumnsChange={setGridColumns}
          />
          <div className="inline-flex rounded-xl border border-border bg-surface-muted p-1" role="group" aria-label="Filtrer les tâches">
            <button
              type="button"
              onClick={() => setFilter('open')}
              aria-pressed={filter === 'open'}
              className={cn(
                'px-3 min-h-11 text-xs font-semibold rounded-lg transition-all touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                filter === 'open' ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted hover:text-foreground',
              )}
            >
              Ouvertes ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={cn(
                'px-3 min-h-11 text-xs font-semibold rounded-lg transition-all touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                filter === 'all' ? 'bg-surface text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted hover:text-foreground',
              )}
            >
              Toutes
            </button>
          </div>
          {canManage ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                loading={saving}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => void handleSeed()}
              >
                Checklist
              </Button>
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openCreate}>
                Nouvelle tâche
              </Button>
            </>
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
                aria-pressed={active}
                className={cn(
                  'text-left rounded-[var(--radius-card)] border px-3 py-2.5 min-h-11 transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-surface hover:border-foreground/30',
                )}
              >
                <p className="text-xs font-semibold truncate">{person.label}</p>
                <p className={cn('text-xs mt-1', active ? 'text-background/80' : 'text-muted')}>
                  {remaining} ouverte{remaining > 1 ? 's' : ''}
                  {person.overdue > 0 ? ` · ${person.overdue} en retard` : ''}
                  {' · '}
                  {person.done} faite{person.done > 1 ? 's' : ''}
                </p>
                <div
                  className={cn('mt-2 h-1.5 rounded-full overflow-hidden', active ? 'bg-background/20' : 'bg-surface-muted')}
                  aria-hidden
                >
                  <div
                    className={cn('h-full rounded-full', active ? 'bg-background' : 'bg-primary')}
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
              ? 'Générez la checklist type, ou créez une première tâche.'
              : 'Le manager n’a pas encore assigné de tâches pour cet événement.'
          }
          action={
            canManage ? (
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openCreate}>
                Nouvelle tâche
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className={mode === 'grid' ? gridClassName : listStackClass}>
          {visible.map((task) => {
            const done = task.status === 'DONE';
            const canToggle = task.mine || canManage || !task.assignee;
            const due = taskDueState(task.dueAt, task.status);
            const dueText = taskDueLabel(task.dueAt, task.status);
            return (
              <li
                key={task.id}
                className={cn(
                  'rounded-2xl border border-border/80 bg-surface p-3.5 sm:p-4 flex flex-col gap-3',
                  mode === 'grid' && 'h-full justify-between',
                  done && 'opacity-70 bg-surface-muted/20',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    disabled={!canToggle || task.status === 'CANCELLED' || task.status === 'BLOCKED'}
                    onClick={() => void patch(task.id, { status: done ? 'OPEN' : 'DONE' })}
                    className={cn(
                      'min-w-11 min-h-11 -m-2 p-2 inline-flex items-center justify-center shrink-0 touch-manipulation',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl',
                      (!canToggle || task.status === 'CANCELLED' || task.status === 'BLOCKED') && 'cursor-not-allowed opacity-40',
                    )}
                    aria-label={done ? 'Marquer comme non faite' : 'Marquer comme faite'}
                    aria-pressed={done}
                  >
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full border-2 inline-flex items-center justify-center',
                        done
                          ? 'bg-primary-solid border-primary-solid text-primary-foreground'
                          : 'border-muted/40 text-transparent hover:border-primary',
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(task)}
                    disabled={!canManage}
                    className="min-w-0 flex-1 text-left space-y-1 pt-0.5 disabled:cursor-default"
                  >
                    <p className={cn('text-sm sm:text-base font-semibold tracking-tight text-foreground break-words leading-snug', done && 'line-through text-muted')}>
                      {task.title}
                    </p>
                    {task.notes ? <p className="text-xs text-muted leading-relaxed line-clamp-2">{task.notes}</p> : null}
                  </button>

                  {canManage ? (
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        className="min-w-11 min-h-11 inline-flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-muted rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        aria-label="Modifier la tâche"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(task.id)}
                        className="min-w-11 min-h-11 inline-flex items-center justify-center text-muted/50 hover:text-danger hover:bg-danger/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        aria-label="Supprimer la tâche"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {task.blockedBy ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-festive-accent-soft text-festive-accent border border-festive-accent/20 max-w-full truncate">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Dépend de : <strong>{task.blockedBy.title}</strong>
                      {task.blockedBy.status !== 'DONE' ? ' (en cours)' : ''}
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={statusTone(task.status)}>{EVENT_TASK_STATUS_LABELS[task.status]}</StatusPill>
                  <StatusPill tone="slate">{EVENT_TASK_KIND_LABELS[task.kind || 'GENERAL']}</StatusPill>
                  {task.priority === 2 ? (
                    <StatusPill tone="rose" className="gap-1 inline-flex items-center">
                      <Flag className="w-3 h-3" />
                      Haute
                    </StatusPill>
                  ) : null}
                  {dueText ? (
                    <StatusPill tone={due === 'overdue' ? 'rose' : due === 'today' ? 'amber' : 'slate'} className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dueText}
                    </StatusPill>
                  ) : null}
                  {task.mine ? <StatusPill tone="sky">Moi</StatusPill> : null}
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <UserRound className="w-3.5 h-3.5" />
                    {task.assignee ? task.assignee.name || task.assignee.email : 'Non assignée'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage && tasks.length === 0 && !loading ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-4">
          <Sparkles className="w-8 h-8 text-primary mx-auto" />
          <div>
            <h3 className="font-semibold text-foreground text-lg">Générer une checklist type</h3>
            <p className="text-sm text-muted max-w-sm mx-auto mt-1">
              Communication, logistique et relances, prêtes à assigner.
            </p>
          </div>
          <Button onClick={() => void handleSeed()} variant="secondary" loading={saving}>
            Générer les tâches de base
          </Button>
        </div>
      ) : null}

      <EventTaskFormModal
        open={modalOpen}
        onClose={closeModal}
        task={editingTask}
        tasks={tasks}
        assignees={assignees}
        saving={saving}
        error={formError}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        onClose={() => {
          if (deleting) return;
          setPendingDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
        title="Supprimer cette tâche ?"
        description="La tâche sera retirée de la checklist. Cette action ne peut pas être annulée."
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        tone="danger"
        loading={deleting}
      />
    </div>
  );
}
