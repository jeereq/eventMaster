"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoiceDetail = getInvoiceDetail;
exports.downloadInvoicePdf = downloadInvoicePdf;
exports.sendInvoiceByEmail = sendInvoiceByEmail;
const platformAccess_1 = require("../middleware/platformAccess");
const platformCommercialScope_1 = require("../services/platformCommercialScope");
const permissionsService_1 = require("../services/permissionsService");
const invoiceService_1 = require("../services/invoiceService");
async function assertInvoiceAccess(req, invoiceId) {
    const invoice = await (0, invoiceService_1.findInvoiceById)(invoiceId);
    if (!invoice) {
        return { invoice: null, error: 'Facture introuvable.', status: 404 };
    }
    if ((0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
        if (req.user?.role === 'COMMERCIAL' && req.user.id) {
            const owns = await (0, platformCommercialScope_1.assertCommercialOwnsInvoice)(req.user.id, invoiceId);
            if (!owns) {
                return { invoice: null, error: 'Accès réservé aux factures de vos organisations parrainées.', status: 403 };
            }
        }
        return { invoice, error: null, status: null };
    }
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId || invoice.tenantId !== tenantId) {
        return { invoice: null, error: 'Accès refusé.', status: 403 };
    }
    if (!(await (0, permissionsService_1.assertCanViewInvoices)(userId, tenantId))) {
        return { invoice: null, error: 'Accès réservé au propriétaire et aux managers.', status: 403 };
    }
    return { invoice, error: null, status: null };
}
async function getInvoiceDetail(req, res) {
    try {
        const id = req.params.id;
        const { invoice, error, status } = await assertInvoiceAccess(req, id);
        if (!invoice) {
            return res.status(status || 404).json({ error });
        }
        return res.json({ invoice: (0, invoiceService_1.formatInvoiceDetailForApi)(invoice) });
    }
    catch (err) {
        console.error('Erreur getInvoiceDetail:', err);
        return res.status(500).json({ error: 'Impossible de charger la facture.' });
    }
}
async function downloadInvoicePdf(req, res) {
    try {
        const id = req.params.id;
        const { invoice, error, status } = await assertInvoiceAccess(req, id);
        if (!invoice) {
            return res.status(status || 404).json({ error });
        }
        const pdf = await (0, invoiceService_1.buildInvoicePdf)(invoice);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
        return res.send(pdf);
    }
    catch (err) {
        console.error('Erreur downloadInvoicePdf:', err);
        return res.status(500).json({ error: 'Impossible de générer le PDF.' });
    }
}
async function sendInvoiceByEmail(req, res) {
    try {
        const id = req.params.id;
        const { email } = req.body;
        const { invoice, error, status } = await assertInvoiceAccess(req, id);
        if (!invoice) {
            return res.status(status || 404).json({ error });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ error: 'Adresse e-mail invalide.' });
        }
        const result = await (0, invoiceService_1.resendInvoiceByEmail)(id, email?.trim());
        return res.json({
            message: email
                ? `Facture envoyée à ${result.sentTo.join(', ')}.`
                : `Facture renvoyée à ${result.sentTo.join(', ')}.`,
            sentTo: result.sentTo,
        });
    }
    catch (err) {
        console.error('Erreur sendInvoiceByEmail:', err);
        return res.status(500).json({ error: err.message || 'Impossible d\'envoyer la facture.' });
    }
}
