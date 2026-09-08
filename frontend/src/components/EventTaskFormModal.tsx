'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Alert } from '@/components/ui';
import {
  EVENT_TASK_KIND_LABELS,
  EVENT_TASK_PRIORITY_LABELS,
  EVENT_TASK_STATUS_LABELS,
  isOpenEventTask,
  type EventTaskAssigneeOption,
  type EventTaskItem,
  type EventTaskKind,
  type EventTaskStatus,
} from '@/lib/eventTasks';

const KIND_OPTIONS = Object.entries(EVENT_TASK_KIND_LABELS) as Array<[EventTaskKind, string]>;
const STATUS_OPTIONS = Object.entries(EVENT_TASK_STATUS_LABELS) as Array<[EventTaskStatus, string]>;

export type EventTaskFormValues = {
  title: string;
  notes: string;
  kind: EventTaskKind;
  priority: number;
  status?: EventTaskStatus;
  assigneeId: string;
  blockedById: string;
  dueAt: string;
};

function toDateInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const fieldClass =
  'w-full min-h-11 px-3 rounded-xl border border-border bg-surface text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function EventTaskFormModal({
  open,
  onClose,
  task,
  tasks,
  assignees,
  saving,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  task: EventTaskItem | null;
  tasks: EventTaskItem[];
  assignees: EventTaskAssigneeOption[];
  saving: boolean;
  error: string;
  onSubmit: (values: EventTaskFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(task);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<EventTaskKind>('GENERAL');
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState<EventTaskStatus>('OPEN');
  const [assigneeId, setAssigneeId] = useState('');
  const [blockedById, setBlockedById] = useState('');
  const [dueAt, setDueAt] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || '');
    setNotes(task?.notes || '');
    setKind(task?.kind || 'GENERAL');
    setPriority(task?.priority ?? 1);
    setStatus(task?.status || 'OPEN');
    setAssigneeId(task?.assignee?.id || '');
    setBlockedById(task?.blockedById || '');
    setDueAt(toDateInput(task?.dueAt || null));
  }, [open, task]);

  const blockers = tasks.filter(
    (item) => item.id !== task?.id && (isOpenEventTask(item.status) || item.status === 'DONE'),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      notes: notes.trim(),
      kind,
      priority,
      status: isEdit ? status : undefined,
      assigneeId,
      blockedById,
      dueAt,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
      description={
        isEdit
          ? 'Titre, échéance, assignation et dépendances.'
          : 'Une tâche dépendante reste bloquée tant que la précédente n’est pas faite.'
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="event-task-form" loading={saving} disabled={!title.trim()}>
            {isEdit ? 'Enregistrer' : 'Créer la tâche'}
          </Button>
        </>
      }
    >
      <form id="event-task-form" onSubmit={handleSubmit} className="space-y-3.5">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Input
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Vérifier le parking VIP"
          required
        />
        <div className="space-y-1.5">
          <label htmlFor="event-task-notes" className="block text-xs font-semibold text-muted">
            Notes
          </label>
          <textarea
            id="event-task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Contexte, livrable attendu…"
            className={`${fieldClass} py-2.5 resize-y min-h-[4.5rem]`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="event-task-kind" className="block text-xs font-semibold text-muted">
              Catégorie
            </label>
            <select id="event-task-kind" value={kind} onChange={(e) => setKind(e.target.value as EventTaskKind)} className={fieldClass}>
              {KIND_OPTIONS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-task-priority" className="block text-xs font-semibold text-muted">
              Priorité
            </label>
            <select
              id="event-task-priority"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={fieldClass}
            >
              {[0, 1, 2].map((level) => (
                <option key={level} value={level}>
                  {EVENT_TASK_PRIORITY_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isEdit ? (
          <div className="space-y-1.5">
            <label htmlFor="event-task-status" className="block text-xs font-semibold text-muted">
              Statut
            </label>
            <select
              id="event-task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventTaskStatus)}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="event-task-assignee" className="block text-xs font-semibold text-muted">
              Assignée à
            </label>
            <select
              id="event-task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Non assignée</option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name || person.email} · {person.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="event-task-due" className="block text-xs font-semibold text-muted">
              Échéance
            </label>
            <input id="event-task-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="event-task-blocked" className="block text-xs font-semibold text-muted">
            Dépend de
          </label>
          <select
            id="event-task-blocked"
            value={blockedById}
            onChange={(e) => setBlockedById(e.target.value)}
            className={fieldClass}
          >
            <option value="">Sans dépendance</option>
            {blockers.map((item) => (
              <option key={item.id} value={item.id}>
                Après : {item.title}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
