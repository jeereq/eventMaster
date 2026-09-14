"use strict";
/**
 * Utilitaires purs pour le calcul des commandes de billets et noms d'acheteurs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_TICKETS_PER_CHECKOUT = void 0;
exports.splitBuyerName = splitBuyerName;
exports.companionTicketEmail = companionTicketEmail;
exports.ticketsRemaining = ticketsRemaining;
exports.parseTicketsPerBuyerLimit = parseTicketsPerBuyerLimit;
exports.checkoutQuantityCap = checkoutQuantityCap;
exports.buyerTicketsLimitMessage = buyerTicketsLimitMessage;
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
/** Plafond de sécurité par commande si l’organisateur n’a pas fixé de limite. */
exports.FALLBACK_TICKETS_PER_CHECKOUT = 50;
function parseTicketsPerBuyerLimit(raw) {
    if (raw === '' || raw == null || raw === undefined)
        return null;
    const parsed = Math.round(Number(raw));
    if (!Number.isFinite(parsed) || parsed < 1)
        return null;
    return parsed;
}
function checkoutQuantityCap(params) {
    const remainingPersonal = params.ticketsPerBuyerLimit == null
        ? exports.FALLBACK_TICKETS_PER_CHECKOUT
        : Math.max(0, params.ticketsPerBuyerLimit - params.alreadyBought);
    const remainingEvent = params.ticketsRemaining == null ? remainingPersonal : params.ticketsRemaining;
    return Math.max(0, Math.min(remainingPersonal, remainingEvent, exports.FALLBACK_TICKETS_PER_CHECKOUT));
}
function buyerTicketsLimitMessage(limit, alreadyBought) {
    const remaining = Math.max(0, limit - alreadyBought);
    if (remaining === 0) {
        return `Vous avez déjà atteint la limite de ${limit} billet${limit > 1 ? 's' : ''} par personne fixée par l’organisateur.`;
    }
    return `L’organisateur autorise au plus ${limit} billet${limit > 1 ? 's' : ''} par personne. Il vous reste ${remaining} place${remaining > 1 ? 's' : ''}.`;
}
