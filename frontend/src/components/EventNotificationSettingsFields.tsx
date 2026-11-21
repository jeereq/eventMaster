'use client';

import { BellRing } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { EventNotificationSettings } from '@/lib/eventNotifications';

const ROWS: Array<{ key: keyof EventNotificationSettings; label: string; hint: string; when?: 'tickets' | 'donations' }> = [
  { key: 'rsvp', label: 'Réponses des invités', hint: 'Une alerte quand un invité confirme ou décline.' },
  { key: 'tickets', label: 'Billets vendus', hint: 'Ventes et paiements de places qui échouent.', when: 'tickets' },
  { key: 'donations', label: 'Dons reçus', hint: 'Chaque don encaissé pour cet événement.', when: 'donations' },
  {
    key: 'guestUpdates',
    label: 'Nouvelles aux invités',
    hint: 'Les invités peuvent activer les notifications et recevoir vos publications par e-mail ou WhatsApp.',
  },
];

export function NotificationSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition touch-manipulation',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-primary bg-primary-solid' : 'border-border bg-surface-muted',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[1.45rem]' : 'translate-x-1',
        )}
      />
    </button>
  );
}

/** Interrupteurs des notifications propres à un événement (formulaire organisateur). */
export default function EventNotificationSettingsFields({
  value,
  onChange,
  ticketingEnabled = true,
  donationsEnabled = true,
}: {
  value: EventNotificationSettings;
  onChange: (next: EventNotificationSettings) => void;
  ticketingEnabled?: boolean;
  donationsEnabled?: boolean;
}) {
  const rows = ROWS.filter((row) =>
    row.when === 'tickets' ? ticketingEnabled : row.when === 'donations' ? donationsEnabled : true,
  );
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <BellRing className="h-3.5 w-3.5" aria-hidden />
        Notifications de cet événement
      </legend>
      <p className="text-xs text-muted">
        Activez ou coupez les alertes pour cet événement seulement. Les destinataires restent ceux des réglages de l’organisation.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{row.label}</p>
              <p className="text-xs text-muted">{row.hint}</p>
            </div>
            <NotificationSwitch
              checked={value[row.key]}
              label={row.label}
              onChange={(next) => onChange({ ...value, [row.key]: next })}
            />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
