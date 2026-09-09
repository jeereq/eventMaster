"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTACT_REASON_LABELS = void 0;
exports.resolveContactReason = resolveContactReason;
exports.CONTACT_REASON_LABELS = {
    demo: 'Démonstration',
    pricing: 'Forfaits et tarifs',
    support: 'Support technique',
    billing: 'Facturation et abonnement',
    refund: 'Remboursement',
    ticketing: 'Billet ou accueil QR',
    marketplace: 'Salle, prestataire ou devis',
    account: 'Compte et accès',
    other: 'Autre',
};
function resolveContactReason(raw) {
    if (typeof raw !== 'string')
        return null;
    const id = raw.trim();
    const label = exports.CONTACT_REASON_LABELS[id];
    if (!label)
        return null;
    return { id, label };
}
