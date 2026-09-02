"use strict";
/**
 * Utilitaires texte pour factures (e-mail HTML, PDF, texte brut).
 * - HTML : échappement des entités + UTF-8
 * - PDF Helvetica (WinAnsi) : espaces et symboles Unicode normalisés
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.normalizeInvoiceText = normalizeInvoiceText;
exports.formatAmountFc = formatAmountFc;
exports.formatFrenchDate = formatFrenchDate;
exports.formatFrenchDateShort = formatFrenchDateShort;
exports.formatFrenchDateRange = formatFrenchDateRange;
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Espaces et symboles incompatibles PDF / texte ASCII. */
function normalizeInvoiceText(value) {
    return value
        .replace(/\u202f/g, ' ') // espace fine insécable (toLocaleString fr-FR)
        .replace(/\u00a0/g, ' ') // espace insécable
        .replace(/\u2212/g, '-') // signe moins Unicode
        .replace(/\u2013/g, '-') // tiret demi-cadratin
        .replace(/\u2014/g, '-') // tiret cadratin
        .replace(/\u2192/g, '->') // flèche
        .replace(/\u00ab/g, '"') // guillemet français ouvrant
        .replace(/\u00bb/g, '"'); // guillemet français fermant
}
function formatAmountFc(amount) {
    const formatted = amount
        .toLocaleString('fr-FR')
        .replace(/\u202f/g, ' ')
        .replace(/\u00a0/g, ' ');
    return `${formatted} FC`;
}
function formatFrenchDate(date) {
    return normalizeInvoiceText(date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
}
function formatFrenchDateShort(date) {
    return normalizeInvoiceText(date.toLocaleDateString('fr-FR'));
}
function formatFrenchDateRange(start, end) {
    return `${formatFrenchDateShort(start)} -> ${formatFrenchDateShort(end)}`;
}
