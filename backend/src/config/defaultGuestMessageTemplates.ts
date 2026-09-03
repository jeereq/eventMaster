export type GuestMessageTemplateType =
  | 'INVITATION_WHATSAPP'
  | 'REMINDER_WHATSAPP'
  | 'RSVP_CONFIRMATION_WHATSAPP'
  | 'RSVP_ORGANIZER_WHATSAPP'
  | 'CONTACT_ADMIN_WHATSAPP';

export interface DefaultGuestMessageTemplate {
  type: GuestMessageTemplateType;
  name: string;
  description: string;
  channel: string;
  subject?: string;
  body: string;
}

export const DEFAULT_GUEST_MESSAGE_TEMPLATES: DefaultGuestMessageTemplate[] = [
  {
    type: 'INVITATION_WHATSAPP',
    name: 'Invitation invité (WhatsApp)',
    description: 'Message envoyé aux invités lors de la diffusion d\'une invitation par WhatsApp.',
    channel: 'WHATSAPP',
    body: `Bonjour *{{firstName}}* 👋

✨ Vous êtes cordialement invité(e) à l'événement :
*{{title}}*

📅 *Date* : {{date}}
📍 *Lieu* : {{location}}

{{description}}

👉 *Confirmez votre présence* en un clic :
{{rsvpLink}}

_Après confirmation, le badge et l’itinéraire sont dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée._
_Nous serons ravis de vous compter parmi nous._
— {{orgName}}`,
  },
  {
    type: 'REMINDER_WHATSAPP',
    name: 'Rappel RSVP (WhatsApp)',
    description: 'Rappel automatique envoyé aux invités n\'ayant pas encore répondu.',
    channel: 'WHATSAPP',
    body: `Bonjour *{{firstName}}* 🔔

Un petit rappel amical concernant l'événement :
*{{title}}*

Nous n'avons pas encore reçu votre réponse RSVP.

📅 *Date* : {{date}}
📍 *Lieu* : {{location}}

👉 Merci de confirmer ici :
{{rsvpLink}}

_Après votre réponse, le badge et l’itinéraire s’ouvrent dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée._
_Votre réponse nous aide à mieux organiser cette réception._
— {{orgName}}`,
  },
  {
    type: 'RSVP_CONFIRMATION_WHATSAPP',
    name: 'Confirmation RSVP invité (WhatsApp)',
    description: 'Message envoyé à l\'invité après acceptation de son RSVP (badge QR).',
    channel: 'WHATSAPP',
    body: `Bonjour *{{firstName}}* ✨

Votre présence à *{{title}}* est bien *confirmée* !

📅 *Date* : {{date}}
📍 *Lieu* : {{location}}

Présentez le QR Code ci-joint à l'entrée le jour J.
L’itinéraire est déjà dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée.

_Au plaisir de vous accueillir très bientôt !_
— {{orgName}}`,
  },
  {
    type: 'RSVP_ORGANIZER_WHATSAPP',
    name: 'Notification organisateur (WhatsApp)',
    description: 'Alerte WhatsApp envoyée à l\'organisateur lors d\'une réponse RSVP.',
    channel: 'WHATSAPP',
    body: `🔔 *Nouvelle réponse RSVP*

📌 *Événement* : {{title}}

👤 *Invité* : {{firstName}} {{lastName}}
📬 *Statut* : {{statusLabel}}
{{preferencesDetails}}

👉 Voir la liste des invités :
{{dashboardUrl}}

_{{orgName}} — suivi en temps réel_`,
  },
  {
    type: 'CONTACT_ADMIN_WHATSAPP',
    name: 'Formulaire de contact (WhatsApp admin)',
    description: 'Notification WhatsApp reçue par l\'administrateur depuis le formulaire de contact.',
    channel: 'WHATSAPP',
    body: `📩 *Nouveau message — EventMaster*

👤 *Nom* : {{name}}
📧 *Email* : {{email}}
📌 *Sujet* : {{subject}}

💬 *Message* :
{{message}}

_Reçu via le formulaire de contact public._`,
  },
];

export const CONTACT_ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || 'mingandajeereq@gmail.com';
export const CONTACT_ADMIN_WHATSAPP = process.env.CONTACT_ADMIN_WHATSAPP || '+243817125577';
