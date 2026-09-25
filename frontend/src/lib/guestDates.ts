/** Libellés de date partagés par les vues invités (compte à rebours, bloc mois / jour). */

function startOfDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function daysUntil(value: string | Date): number {
  const target = startOfDay(new Date(value));
  const today = startOfDay(new Date());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** « Dans 12 jours », « Demain », « Aujourd’hui » ou « Terminé ». */
export function guestCountdownLabel(value: string | Date): string {
  const days = daysUntil(value);
  if (days < 0) return 'Terminé';
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}

function hasTime(date: Date) {
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

/** « Samedi 14 novembre 2026 · 18h00 » */
export function guestLongDate(value: string | Date): string {
  const date = new Date(value);
  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const label = day.charAt(0).toUpperCase() + day.slice(1);
  if (!hasTime(date)) return label;
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  return `${label} · ${time}`;
}

/** « Sam. 14 nov. · 18h00 » */
export function guestShortDate(value: string | Date): string {
  const date = new Date(value);
  const day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const label = day.charAt(0).toUpperCase() + day.slice(1);
  if (!hasTime(date)) return label;
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  return `${label} · ${time}`;
}

/** Bloc date : { month: 'NOV', day: '14' } */
export function guestDateBlock(value: string | Date): { month: string; day: string } {
  const date = new Date(value);
  return {
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    day: String(date.getDate()).padStart(2, '0'),
  };
}
