'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, Loader2, Plus, Sparkles, Trash2, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Button, EmptyState, Input, StatusPill } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  EVENT_TASK_KIND_LABELS,
  EVENT_TASK_PRIORITY_LABELS,
  EVENT_TASK_STATUS_LABELS,
  isOpenEventTask,
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

  const visible = useMemo(
    () => (filter === 'open' ? tasks.filter((item) => isOpenEventTask(item.status)) : tasks),
    [filter, tasks],
  );
  const openCount = tasks.filter((item) => isOpenEventTask(item.status)).length;

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

  const selectClass = 'px-2 py-1 rounded-[var(--radius-button)] border border-border bg-surface-muted text-[11px] font-medium text-foreground';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground tracking-tight inline-flex items-center gap-2">
            <ClipboardList className="w-4.5 h-4.5 text-primary" />
            Tâches de l’événement
          </h2>
          <p className="text-sm text-muted">
            Type, priorité, dépendances et statuts. Distincte des accès équipe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[var(--radius-button)] border border-border p-0.5">
            <button
              type="button"
              onClick={() => setFilter('open')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-button)]',
                filter === 'open' ? 'bg-surface text-foreground shadow-sm' : 'text-muted',
              )}
            >
              Ouvertes ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-button)]',
                filter === 'all' ? 'bg-surface text-foreground shadow-sm' : 'text-muted',
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

      {visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-5 h-5" />}
          title={filter === 'open' ? 'Rien à faire pour le moment' : 'Aucune tâche'}
          description={
            canManage
              ? 'Générez la checklist depuis la préparation, ou ajoutez une tâche ci-dessous.'
              : 'Le manager n’a pas encore assigné de tâches pour cet événement.'
          }
        />
      ) : (
        <ul className="space-y-2">
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
                  'rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5 flex items-start gap-3',
                  done && 'opacity-70',
                )}
              >
                <button
                  type="button"
                  disabled={!canToggle || task.status === 'CANCELLED' || task.status === 'BLOCKED'}
                  onClick={() => void patch(task.id, { status: done ? 'OPEN' : 'DONE' })}
                  className={cn(
                    'mt-0.5 w-7 h-7 rounded-full border inline-flex items-center justify-center shrink-0',
                    done
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-border text-muted hover:border-primary hover:text-primary',
                  )}
                  title={done ? 'Rouvrir' : 'Marquer faite'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className={cn('text-sm font-semibold', done && 'line-through text-muted')}>{task.title}</p>
                  {task.notes ? <p className="text-xs text-muted">{task.notes}</p> : null}
                  {task.blockedBy ? (
                    <p className="text-[11px] text-muted">
                      Dépend de : {task.blockedBy.title}
                      {task.blockedBy.status !== 'DONE' ? ' (non terminée)' : ''}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {canManage ? (
                      <select
                        value={task.status}
                        onChange={(e) => void patch(task.id, { status: e.target.value })}
                        className={selectClass}
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
                        className={selectClass}
                      >
                        {[0, 1, 2].map((level) => (
                          <option key={level} value={level}>{EVENT_TASK_PRIORITY_LABELS[level]}</option>
                        ))}
                      </select>
                    ) : task.priority === 2 ? (
                      <StatusPill tone="rose">Haute</StatusPill>
                    ) : null}
                    {dueText ? (
                      <StatusPill tone={due === 'overdue' ? 'rose' : due === 'today' ? 'amber' : 'slate'}>
                        {dueText}
                      </StatusPill>
                    ) : null}
                    {task.mine ? <StatusPill tone="sky">Moi</StatusPill> : null}
                    {canManage ? (
                      <label className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <UserRound className="w-3 h-3" />
                        <select
                          value={task.assignee?.id || ''}
                          onChange={(e) => void patch(task.id, { assigneeId: e.target.value || null })}
                          className="bg-transparent border-0 text-[11px] font-medium text-foreground max-w-[10rem]"
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
                      <span className="text-[11px] text-muted">
                        {task.assignee ? task.assignee.name || task.assignee.email : 'Non assignée'}
                      </span>
                    )}
                    {canManage ? (
                      <select
                        value={task.blockedById || ''}
                        onChange={(e) => void patch(task.id, { blockedById: e.target.value || null })}
                        className={selectClass}
                        title="Tâche bloquante"
                      >
                        <option value="">Sans dépendance</option>
                        {blockers.map((item) => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete(task.id)}
                    className="p-1.5 rounded-[var(--radius-button)] text-muted hover:text-rose-600"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <form
          onSubmit={handleCreate}
          className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3"
        >
          <p className="text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Nouvelle tâche
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Vérifier le parking VIP"
              />
            </div>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as EventTaskKind)}
              className="px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
            >
              {KIND_OPTIONS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
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
            className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[3rem]"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm flex-1"
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
              className="px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm flex-1"
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
              className="px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
              title="Échéance — un rappel est envoyé la veille et le jour J"
            />
            <Button type="submit" loading={saving} disabled={!title.trim()}>
              Ajouter
            </Button>
          </div>
          <p className="text-[11px] text-muted">
            Une tâche dépendante passe en « bloquée » tant que la précédente n’est pas faite. Avec une échéance, l’assigné reçoit un rappel la veille / le jour J.
          </p>
        </form>
      ) : null}
    </div>
  );
}
