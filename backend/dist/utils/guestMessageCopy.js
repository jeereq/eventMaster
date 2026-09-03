"use strict";
/** Copy invité : itinéraire dès le RSVP « oui » ; plan / PDF dès qu’une place est assignée. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_COPY = void 0;
exports.rewriteStaleGuestMessageCopy = rewriteStaleGuestMessageCopy;
exports.GUEST_COPY = {
    afterInvite: 'Après confirmation, le badge et l’itinéraire sont dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée.',
    afterReminder: 'Après votre réponse, le badge et l’itinéraire s’ouvrent dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée.',
    afterRsvp: 'L’itinéraire est déjà dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée.',
    tableAnnouncement: 'L’itinéraire est déjà dans votre espace invité. Le PDF d’invitation vous sera envoyé ensuite.',
    ticket: 'Badge QR et itinéraire : dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée.',
    pdfRequiresRsvp: 'Le plan de table et le PDF d’invitation seront disponibles une fois votre présence confirmée.',
    inviteEmailFooter: 'Merci de répondre avant la date de l’événement. Après confirmation, le badge et l’itinéraire sont dans votre espace invité ; le plan de table et le PDF suivent dès qu’une place vous est assignée.',
    rsvpEmailFooter: 'L’itinéraire est déjà dans votre espace invité. Le plan de table et le PDF suivent dès qu’une place vous est assignée.',
};
const STALE_BLOCKS = [
    {
        replacement: 'afterInvite',
        needles: [
            '_Votre plan de table, PDF et localisation GPS vous seront envoyés dès votre confirmation RSVP (si votre place est déjà assignée)._',
            'Votre plan de table, PDF et localisation GPS vous seront envoyés dès votre confirmation RSVP (si votre place est déjà assignée).',
            'Dès confirmation, votre plan de table, invitation PDF et localisation GPS vous sont envoyés si votre place est déjà assignée.',
        ],
    },
    {
        replacement: 'afterReminder',
        needles: [
            '_Après confirmation, votre placement (PDF, plan, GPS) vous est envoyé dès que votre place est assignée._',
            'Après confirmation, votre placement (PDF, plan, GPS) vous est envoyé dès que votre place est assignée.',
        ],
    },
    {
        replacement: 'afterRsvp',
        needles: [
            'Votre plan de table, invitation PDF et localisation GPS vous sont envoyés dès maintenant (si votre place est déjà assignée).',
            'Votre plan de table, invitation PDF et localisation GPS vous sont envoyés dès maintenant (si votre place est déjà assignée et selon le forfait de l\'organisateur).',
            'Votre plan de table, invitation PDF et localisation GPS sont débloqués dès cette confirmation, dès que votre place est assignée.',
        ],
    },
    {
        replacement: 'tableAnnouncement',
        needles: [
            'Votre invitation PDF et la localisation GPS vous seront envoyées à votre arrivée à l\'événement.',
            'Votre invitation PDF et la localisation GPS vous seront envoyées à votre arrivée.',
            '_Votre PDF et la localisation GPS vous seront envoyés à votre arrivée._',
        ],
    },
];
/** Réécrit les phrases GPS/placement périmées, y compris dans un texte déjà personnalisé. */
function rewriteStaleGuestMessageCopy(text) {
    if (!text)
        return text;
    let next = text;
    for (const block of STALE_BLOCKS) {
        const replacement = exports.GUEST_COPY[block.replacement];
        for (const needle of block.needles) {
            if (next.includes(needle)) {
                next = next.split(needle).join(replacement);
            }
        }
    }
    return next.replace(/\n{3,}/g, '\n\n').trim();
}
