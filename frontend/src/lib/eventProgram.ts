import type { LightingPreset } from '@/lib/roomRenderQuality';

export type EventProgramSlot = {
  id: string;
  label: string;
  /** ISO datetime or HH:mm relative to event date */
  startsAt: string;
  endsAt?: string;
  lighting?: Exclude<LightingPreset, 'auto'>;
  exterior?: boolean;
};

export type EventProgram = {
  slots: EventProgramSlot[];
  /** Fuseau / note libre */
  notes?: string;
};

export function createEmptyProgram(): EventProgram {
  return { slots: [] };
}

export function createProgramSlot(partial?: Partial<EventProgramSlot>): EventProgramSlot {
  return {
    id: `slot_${Math.random().toString(36).slice(2, 9)}`,
    label: partial?.label ?? 'Créneau',
    startsAt: partial?.startsAt ?? '18:00',
    endsAt: partial?.endsAt,
    lighting: partial?.lighting ?? 'dusk',
    exterior: partial?.exterior ?? false,
  };
}

export function normalizeEventProgram(raw: unknown): EventProgram {
  if (!raw || typeof raw !== 'object') return createEmptyProgram();
  const slots = Array.isArray((raw as EventProgram).slots)
    ? (raw as EventProgram).slots
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({
          id: String(s.id || createProgramSlot().id),
          label: String(s.label || 'Créneau'),
          startsAt: String(s.startsAt || '18:00'),
          endsAt: s.endsAt ? String(s.endsAt) : undefined,
          lighting: s.lighting,
          exterior: Boolean(s.exterior),
        }))
    : [];
  return {
    slots,
    notes: typeof (raw as EventProgram).notes === 'string' ? (raw as EventProgram).notes : undefined,
  };
}

function parseSlotInstant(startsAt: string, eventDate?: Date | string | null): number {
  if (/^\d{4}-\d{2}-\d{2}/.test(startsAt)) {
    return new Date(startsAt).getTime();
  }
  const m = startsAt.match(/^(\d{1,2}):(\d{2})$/);
  if (m && eventDate) {
    const base = new Date(eventDate);
    base.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return base.getTime();
  }
  if (m) {
    const d = new Date();
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d.getTime();
  }
  return new Date(startsAt).getTime();
}

/**
 * Choisit le créneau programme actif et son éclairage.
 * Fallback : day (avant 17h) / dusk (17–20h) / night (sinon).
 */
export function resolveLightingFromProgram(
  program: EventProgram | null | undefined,
  at: Date = new Date(),
  eventDate?: Date | string | null,
): Exclude<LightingPreset, 'auto'> {
  const slots = program?.slots ?? [];
  if (slots.length > 0) {
    const t = at.getTime();
    let best: EventProgramSlot | null = null;
    let bestStart = -Infinity;
    for (const slot of slots) {
      const start = parseSlotInstant(slot.startsAt, eventDate);
      const end = slot.endsAt
        ? parseSlotInstant(slot.endsAt, eventDate)
        : start + 3 * 60 * 60 * 1000;
      if (t >= start && t < end && start >= bestStart) {
        best = slot;
        bestStart = start;
      }
    }
    if (!best) {
      // Prendre le créneau le plus proche passé
      for (const slot of slots) {
        const start = parseSlotInstant(slot.startsAt, eventDate);
        if (start <= t && start >= bestStart) {
          best = slot;
          bestStart = start;
        }
      }
    }
    if (best?.lighting) return best.lighting;
  }

  const hour = at.getHours() + at.getMinutes() / 60;
  if (hour < 17) return 'day';
  if (hour < 20) return 'dusk';
  return 'night';
}
