const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** « Reçu à 14:05 », « Reçu hier », « Reçu il y a 3 j », puis la date courte. */
export function formatReceivedAt(value: string | Date, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days <= 0) {
    return `Reçu à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (days === 1) return 'Reçu hier';
  if (days < 7) return `Reçu il y a ${days} j`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return `Reçu le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })}`;
}

/** Jour d’un événement avec le jour de la semaine : « mer. 25 nov. » (année si différente). */
export function formatEventDay(value: string | Date, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** « dans 5 j », « demain », « aujourd’hui », « il y a 3 j ». */
export function formatDayDistance(value: string | Date, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'demain';
  if (days === -1) return 'hier';
  return days > 0 ? `dans ${days} j` : `il y a ${-days} j`;
}
