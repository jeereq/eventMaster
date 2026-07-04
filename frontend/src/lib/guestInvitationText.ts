export type GuestInvitationContext = {
  firstName: string;
  lastName: string;
  event?: {
    title?: string;
    description?: string | null;
    location?: string;
    date?: string;
  } | null;
  rsvpLink?: string;
};

export function formatGuestInvitationText(text: string, ctx: GuestInvitationContext): string {
  if (!text) return '';

  let formatted = text
    .replace(/\{\{firstName\}\}/g, ctx.firstName || '')
    .replace(/\{\{lastName\}\}/g, ctx.lastName || '');

  if (ctx.event) {
    const formattedDate = ctx.event.date
      ? new Date(ctx.event.date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    formatted = formatted
      .replace(/\{\{title\}\}/g, ctx.event.title || '')
      .replace(/\{\{description\}\}/g, ctx.event.description || '')
      .replace(/\{\{location\}\}/g, ctx.event.location || '')
      .replace(/\{\{date\}\}/g, formattedDate);
  }

  if (ctx.rsvpLink) {
    formatted = formatted.replace(/\{\{rsvpLink\}\}/g, ctx.rsvpLink);
  }

  return formatted;
}
