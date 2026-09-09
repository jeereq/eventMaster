"use strict";
/**
 * Utilitaires purs pour le calcul des commandes de billets et noms d'acheteurs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitBuyerName = splitBuyerName;
exports.companionTicketEmail = companionTicketEmail;
exports.ticketsRemaining = ticketsRemaining;
function splitBuyerName(fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return { firstName: 'Invité', lastName: 'Billet' };
    if (parts.length === 1)
        return { firstName: parts[0], lastName: 'Billet' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
function companionTicketEmail(baseEmail, index, orderId) {
    const at = baseEmail.lastIndexOf('@');
    if (at < 1)
        return `billet-${orderId.slice(0, 8)}-${index}@tickets.eventmaster.local`;
    const local = baseEmail.slice(0, at);
    const domain = baseEmail.slice(at + 1);
    return `${local}+billet${index}-${orderId.slice(0, 8)}@${domain}`;
}
function ticketsRemaining(event) {
    if (event.ticketsTotal == null)
        return null;
    return Math.max(0, event.ticketsTotal - event.ticketsSold);
}
