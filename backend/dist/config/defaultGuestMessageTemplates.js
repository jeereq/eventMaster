"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTACT_ADMIN_WHATSAPP = exports.CONTACT_ADMIN_EMAIL = exports.DEFAULT_GUEST_MESSAGE_TEMPLATES = void 0;
exports.DEFAULT_GUEST_MESSAGE_TEMPLATES = [
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

_Votre plan de table, PDF et localisation GPS vous seront envoyés dès votre confirmation RSVP (si votre place est déjà assignée)._
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

_Après confirmation, votre placement (PDF, plan, GPS) vous est envoyé dès que votre place est assignée._
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
Votre plan de table, invitation PDF et localisation GPS vous sont envoyés dès maintenant (si votre place est déjà assignée).

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
exports.CONTACT_ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || 'mingandajeereq@gmail.com';
exports.CONTACT_ADMIN_WHATSAPP = process.env.CONTACT_ADMIN_WHATSAPP || '+243817125577';
