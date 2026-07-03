"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAmountFc = formatAmountFc;
exports.getPlanAmount = getPlanAmount;
exports.getEffectivePlanAmount = getEffectivePlanAmount;
exports.computeApprovedAmount = computeApprovedAmount;
exports.getTenantOwner = getTenantOwner;
exports.getTenantOwnerEmail = getTenantOwnerEmail;
exports.getTenantBillingRecipients = getTenantBillingRecipients;
exports.createAndSendInvoice = createAndSendInvoice;
exports.sendLicenseExpiryWarning = sendLicenseExpiryWarning;
exports.formatInvoiceForApi = formatInvoiceForApi;
exports.formatInvoiceDetailForApi = formatInvoiceDetailForApi;
exports.findInvoiceById = findInvoiceById;
exports.buildInvoicePdf = buildInvoicePdf;
exports.resendInvoiceByEmail = resendInvoiceByEmail;
const pdfkit_1 = __importDefault(require("pdfkit"));
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const commercialService_1 = require("./commercialService");
const notificationService_1 = require("./notificationService");
function formatAmountFc(amount) {
    return `${amount.toLocaleString('fr-FR')} FC`;
}
function getPlanAmount(plan) {
    if (plan === 'FREE')
        return 0;
    return (0, plansConfig_1.getCatalogMonthlyPriceFc)(plan);
}
function getEffectivePlanAmount(plan) {
    if (plan === 'FREE')
        return 0;
    return (0, plansConfig_1.getEffectiveMonthlyPriceFc)(plan);
}
function computeApprovedAmount(baseAmount, options) {
    const base = Math.max(0, Math.round(baseAmount));
    if (options?.approvedAmount !== undefined && options.approvedAmount !== null) {
        const finalAmount = Math.max(0, Math.round(options.approvedAmount));
        const discountAmount = Math.max(0, base - finalAmount);
        const discountPercent = base > 0 ? Math.round((discountAmount / base) * 1000) / 10 : 0;
        return { baseAmount: base, discountPercent, discountAmount, finalAmount };
    }
    const pct = Math.min(100, Math.max(0, options?.discountPercent ?? 0));
    const discountAmount = Math.round(base * (pct / 100));
    const finalAmount = Math.max(0, base - discountAmount);
    return { baseAmount: base, discountPercent: pct, discountAmount, finalAmount };
}
async function generateInvoiceNumber() {
    const now = new Date();
    const prefix = `EM-INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await db_1.prisma.platformInvoice.count({
        where: {
            invoiceNumber: { startsWith: prefix },
        },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}
async function getTenantOwner(tenantId) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            manager: { select: { email: true, name: true, phone: true } },
        },
    });
    if (!tenant?.manager?.email)
        return null;
    return {
        email: tenant.manager.email,
        name: tenant.manager.name,
        phone: tenant.manager.phone,
    };
}
async function getTenantOwnerEmail(tenantId) {
    const owner = await getTenantOwner(tenantId);
    if (!owner)
        return null;
    return { email: owner.email, name: owner.name };
}
async function getTenantBillingRecipients(tenantId, includeManagers = true) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            manager: { select: { email: true, name: true } },
            users: includeManagers
                ? {
                    where: { orgRole: 'MANAGER' },
                    select: { email: true, name: true },
                }
                : undefined,
        },
    });
    const recipients = [];
    const seen = new Set();
    if (tenant?.manager?.email) {
        const email = tenant.manager.email.toLowerCase();
        seen.add(email);
        recipients.push({ email: tenant.manager.email, name: tenant.manager.name, role: 'OWNER' });
    }
    if (includeManagers && tenant?.users) {
        for (const user of tenant.users) {
            const email = user.email.toLowerCase();
            if (!seen.has(email)) {
                seen.add(email);
                recipients.push({ email: user.email, name: user.name, role: 'MANAGER' });
            }
        }
    }
    return recipients;
}
function renderInvoiceHtml(params) {
    const discountRows = params.discountAmount && params.discountAmount > 0
        ? `<tr><td style="padding:8px 0;color:#64748b;">Prix catalogue</td><td style="padding:8px 0;font-weight:600;">${formatAmountFc(params.baseAmount ?? params.amount + params.discountAmount)}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b;">Réduction spéciale</td><td style="padding:8px 0;font-weight:600;color:#059669;">− ${formatAmountFc(params.discountAmount)}${params.discountPercent ? ` (${params.discountPercent} %)` : ''}</td></tr>`
        : '';
    const periodLine = params.periodStart && params.periodEnd
        ? `<tr><td style="padding:8px 0;color:#64748b;">Période</td><td style="padding:8px 0;font-weight:600;">${params.periodStart.toLocaleDateString('fr-FR')} → ${params.periodEnd.toLocaleDateString('fr-FR')}</td></tr>`
        : params.durationDays
            ? `<tr><td style="padding:8px 0;color:#64748b;">Durée</td><td style="padding:8px 0;font-weight:600;">${params.durationDays} jours</td></tr>`
            : '';
    const typeLabel = params.type === 'SUBSCRIPTION_APPROVAL'
        ? 'Activation abonnement'
        : params.type === 'RENEWAL'
            ? 'Renouvellement abonnement'
            : 'Paiement abonnement';
    return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="background:#4f46e5;color:#fff;padding:24px;">
      <h1 style="margin:0;font-size:20px;">EventMaster — Facture</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${params.invoiceNumber}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Bonjour${params.recipientName ? ` ${params.recipientName}` : ''},</p>
      <p style="margin:0 0 20px;color:#334155;">Veuillez trouver ci-dessous les détails de votre facture EventMaster.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;">Organisation</td><td style="padding:8px 0;font-weight:600;">${params.tenantName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;font-weight:600;">${typeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Forfait</td><td style="padding:8px 0;font-weight:600;">${params.planName}</td></tr>
        ${periodLine}
        ${discountRows}
        <tr><td style="padding:12px 0;color:#64748b;border-top:1px solid #e2e8f0;">Montant TTC</td><td style="padding:12px 0;font-weight:800;font-size:18px;color:#4f46e5;border-top:1px solid #e2e8f0;">${formatAmountFc(params.amount)}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Pour renouveler ou mettre à jour votre abonnement, connectez-vous à votre espace EventMaster → Facturation.</p>
    </div>
  </div>
</body>
</html>`;
}
function renderInvoiceText(params) {
    const lines = [
        `Facture EventMaster — ${params.invoiceNumber}`,
        `Organisation : ${params.tenantName}`,
        `Forfait : ${params.planName}`,
    ];
    if (params.discountAmount && params.discountAmount > 0) {
        lines.push(`Prix catalogue : ${formatAmountFc(params.baseAmount ?? params.amount + params.discountAmount)}`);
        lines.push(`Réduction spéciale : − ${formatAmountFc(params.discountAmount)}${params.discountPercent ? ` (${params.discountPercent} %)` : ''}`);
    }
    lines.push(`Montant : ${formatAmountFc(params.amount)}`);
    if (params.periodStart && params.periodEnd) {
        lines.push(`Période : ${params.periodStart.toLocaleDateString('fr-FR')} → ${params.periodEnd.toLocaleDateString('fr-FR')}`);
    }
    else if (params.durationDays) {
        lines.push(`Durée : ${params.durationDays} jours`);
    }
    return lines.join('\n');
}
async function createAndSendInvoice(params) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: { id: true, name: true, plan: true },
    });
    if (!tenant) {
        throw new Error('Organisation introuvable.');
    }
    const amount = params.amount ?? getPlanAmount(params.plan);
    if (amount <= 0 && params.plan !== 'FREE') {
        console.warn(`[Invoice Service] Montant nul pour le plan ${params.plan}, facture ignorée.`);
    }
    const includeManagers = params.includeManagers ?? params.type === 'SUBSCRIPTION_APPROVAL';
    const recipients = await getTenantBillingRecipients(params.tenantId, includeManagers);
    if (recipients.length === 0) {
        console.warn(`[Invoice Service] Aucun destinataire pour le tenant ${params.tenantId}.`);
        return null;
    }
    const invoiceNumber = await generateInvoiceNumber();
    const planDef = (0, plansConfig_1.getPlanLimits)(params.plan);
    const billingPeriod = (0, commercialService_1.getBillingPeriod)(params.periodStart ?? new Date());
    const now = new Date();
    const invoice = await db_1.prisma.platformInvoice.create({
        data: {
            invoiceNumber,
            tenantId: params.tenantId,
            plan: params.plan,
            amount,
            type: params.type,
            status: params.status ?? 'SENT',
            durationDays: params.durationDays ?? null,
            periodStart: params.periodStart ?? null,
            periodEnd: params.periodEnd ?? null,
            billingPeriod,
            subscriptionRequestId: params.subscriptionRequestId ?? null,
            recipientEmails: recipients.map((r) => r.email),
            details: {
                planName: planDef.name,
                planPriceLabel: planDef.price,
                tenantName: tenant.name,
                baseAmount: params.baseAmount ?? amount,
                discountPercent: params.discountPercent ?? 0,
                discountAmount: params.discountAmount ?? 0,
            },
            sentAt: now,
        },
    });
    const subject = params.type === 'RENEWAL'
        ? `EventMaster — Facture de renouvellement ${invoiceNumber}`
        : `EventMaster — Facture abonnement ${invoiceNumber}`;
    for (const recipient of recipients) {
        const html = renderInvoiceHtml({
            invoiceNumber,
            tenantName: tenant.name,
            planName: planDef.name,
            amount,
            currency: 'FC',
            type: params.type,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            durationDays: params.durationDays,
            recipientName: recipient.name,
            baseAmount: params.baseAmount,
            discountPercent: params.discountPercent,
            discountAmount: params.discountAmount,
        });
        const text = renderInvoiceText({
            invoiceNumber,
            tenantName: tenant.name,
            planName: planDef.name,
            amount,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            durationDays: params.durationDays,
            baseAmount: params.baseAmount,
            discountPercent: params.discountPercent,
            discountAmount: params.discountAmount,
        });
        const result = await (0, notificationService_1.sendRealEmail)(recipient.email, subject, text, html);
        if (result.success) {
            console.log(`[Invoice Service] Facture ${invoiceNumber} envoyée à ${recipient.email} via SendGrid`);
        }
        else {
            console.error(`[Invoice Service] Échec envoi facture ${invoiceNumber} à ${recipient.email}: ${result.error}`);
        }
    }
    return invoice;
}
async function sendLicenseExpiryWarning(params) {
    const planDef = (0, plansConfig_1.getPlanLimits)(params.plan);
    const amount = getPlanAmount(params.plan);
    const expiryStr = params.expiresAt.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const subject = `EventMaster — Votre abonnement expire dans 7 jours`;
    const text = [
        `Bonjour${params.ownerName ? ` ${params.ownerName}` : ''},`,
        '',
        `L'abonnement de l'organisation « ${params.tenantName} » (forfait ${planDef.name}) expire le ${expiryStr}.`,
        `Montant du renouvellement : ${formatAmountFc(amount)}.`,
        '',
        'Connectez-vous à EventMaster pour soumettre une demande de renouvellement ou mettre à jour votre paiement.',
    ].join('\n');
    const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
    <h2 style="margin:0 0 16px;color:#b45309;">Rappel — expiration dans 7 jours</h2>
    <p>Bonjour${params.ownerName ? ` ${params.ownerName}` : ''},</p>
    <p>L'abonnement de <strong>${params.tenantName}</strong> (forfait <strong>${planDef.name}</strong>) expire le <strong>${expiryStr}</strong>.</p>
    <p>Montant estimé du renouvellement : <strong style="color:#4f46e5;">${formatAmountFc(amount)}</strong>.</p>
    <p style="color:#64748b;font-size:14px;">Connectez-vous à EventMaster → Facturation pour renouveler avant la date limite.</p>
  </div>
</body>
</html>`;
    const emailResult = await (0, notificationService_1.sendRealEmail)(params.ownerEmail, subject, text, html);
    if (!emailResult.success) {
        console.error(`[Invoice Service] Échec e-mail rappel J-7 à ${params.ownerEmail}: ${emailResult.error}`);
    }
    if (params.ownerPhone?.trim()) {
        const waBody = [
            `EventMaster — Rappel abonnement`,
            '',
            `Bonjour${params.ownerName ? ` ${params.ownerName}` : ''},`,
            `L'organisation « ${params.tenantName} » (${planDef.name}) expire le ${expiryStr}.`,
            `Renouvellement estimé : ${formatAmountFc(amount)}.`,
            'Connectez-vous à EventMaster → Facturation pour renouveler.',
        ].join('\n');
        const waResult = await (0, notificationService_1.sendRealWhatsApp)(params.ownerPhone, waBody);
        if (waResult.success && !waResult.simulated) {
            console.log(`[Invoice Service] Rappel J-7 WhatsApp envoyé à ${params.ownerPhone}`);
        }
        else if (!waResult.success) {
            console.error(`[Invoice Service] Échec WhatsApp rappel J-7: ${waResult.error}`);
        }
    }
}
const INVOICE_TYPE_LABELS = {
    SUBSCRIPTION_APPROVAL: 'Approbation abonnement',
    RENEWAL: 'Renouvellement',
    PAYMENT: 'Paiement',
};
const INVOICE_STATUS_LABELS = {
    SENT: 'Envoyée',
    PAID: 'Payée',
    PENDING: 'En attente',
};
function formatInvoiceCommissions(commissions) {
    if (!commissions?.length)
        return [];
    return commissions.map((c) => ({
        id: c.id,
        commercialName: c.commercial?.name ?? null,
        commercialEmail: c.commercial?.email ?? null,
        commissionRate: c.commissionRate,
        commissionRatePercent: Math.round(c.commissionRate * 1000) / 10,
        commissionAmount: c.commissionAmount,
        commissionAmountFormatted: formatAmountFc(c.commissionAmount),
        source: c.source,
    }));
}
function formatInvoiceForApi(invoice) {
    const commissions = formatInvoiceCommissions(invoice.commercialCommissions);
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        plan: invoice.plan,
        amount: invoice.amount,
        amountFormatted: formatAmountFc(invoice.amount),
        currency: invoice.currency,
        type: invoice.type,
        typeLabel: INVOICE_TYPE_LABELS[invoice.type] || invoice.type,
        status: invoice.status,
        statusLabel: INVOICE_STATUS_LABELS[invoice.status] || invoice.status,
        billingPeriod: invoice.billingPeriod,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        durationDays: invoice.durationDays,
        sentAt: invoice.sentAt,
        createdAt: invoice.createdAt,
        tenantName: invoice.tenant?.name ?? null,
        commissions,
        totalCommission: totalCommission > 0 ? totalCommission : null,
        totalCommissionFormatted: totalCommission > 0 ? formatAmountFc(totalCommission) : null,
        hasCommission: commissions.length > 0,
    };
}
function formatInvoiceDetailForApi(invoice) {
    const base = formatInvoiceForApi(invoice);
    const details = invoice.details;
    const recipientEmails = Array.isArray(invoice.recipientEmails)
        ? invoice.recipientEmails
        : [];
    return {
        ...base,
        tenantId: invoice.tenantId,
        tenantName: invoice.tenant?.name ?? details?.tenantName ?? null,
        planName: details?.planName ?? invoice.plan,
        planPriceLabel: details?.planPriceLabel ?? null,
        recipientEmails,
    };
}
async function findInvoiceById(invoiceId) {
    return db_1.prisma.platformInvoice.findUnique({
        where: { id: invoiceId },
        include: {
            tenant: { select: { name: true } },
            commercialCommissions: {
                include: {
                    commercial: { select: { name: true, email: true } },
                },
            },
        },
    });
}
function getInvoicePlanName(invoice) {
    const details = invoice.details;
    return details?.planName ?? (0, plansConfig_1.getPlanLimits)(invoice.plan).name;
}
function buildInvoicePdf(invoice) {
    const planName = getInvoicePlanName(invoice);
    const tenantName = invoice.tenant?.name ?? 'Organisation';
    const typeLabel = INVOICE_TYPE_LABELS[invoice.type] || invoice.type;
    const statusLabel = INVOICE_STATUS_LABELS[invoice.status] || invoice.status;
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#4f46e5').text('EventMaster', { align: 'left' });
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Facture d\'abonnement', { align: 'left' });
        doc.moveDown(1);
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text(invoice.invoiceNumber);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b');
        doc.text(`Émise le ${invoice.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`);
        if (invoice.sentAt) {
            doc.text(`Envoyée le ${invoice.sentAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`);
        }
        doc.moveDown(1.5);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Organisation');
        doc.fontSize(11).font('Helvetica').fillColor('#334155').text(tenantName);
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Détails');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#334155');
        doc.text(`Type : ${typeLabel}`);
        doc.text(`Forfait : ${planName} (${invoice.plan})`);
        doc.text(`Statut : ${statusLabel}`);
        doc.text(`Période de facturation : ${invoice.billingPeriod}`);
        if (invoice.periodStart && invoice.periodEnd) {
            doc.text(`Couverture : ${invoice.periodStart.toLocaleDateString('fr-FR')} → ${invoice.periodEnd.toLocaleDateString('fr-FR')}`);
        }
        else if (invoice.durationDays) {
            doc.text(`Durée : ${invoice.durationDays} jours`);
        }
        const details = invoice.details;
        if (details?.discountAmount && details.discountAmount > 0) {
            doc.fontSize(11).font('Helvetica').fillColor('#334155');
            doc.text(`Prix catalogue : ${formatAmountFc(details.baseAmount ?? invoice.amount + details.discountAmount)}`);
            doc.text(`Réduction spéciale : − ${formatAmountFc(details.discountAmount)}${details.discountPercent ? ` (${details.discountPercent} %)` : ''}`);
            doc.moveDown(0.5);
        }
        doc.moveDown(1.5);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#4f46e5');
        doc.text(`Montant TTC : ${formatAmountFc(invoice.amount)}`, { align: 'right' });
        doc.moveDown(2);
        const recipients = Array.isArray(invoice.recipientEmails)
            ? invoice.recipientEmails
            : [];
        if (recipients.length > 0) {
            doc.fontSize(10).font('Helvetica').fillColor('#64748b');
            doc.text(`Destinataires : ${recipients.join(', ')}`);
        }
        doc.moveDown(2);
        doc.fontSize(9).font('Helvetica').fillColor('#94a3b8');
        doc.text('Document généré par EventMaster. Pour renouveler votre abonnement, connectez-vous à votre espace Facturation.', { align: 'center' });
        doc.end();
    });
}
async function resendInvoiceByEmail(invoiceId, targetEmail) {
    const invoice = await findInvoiceById(invoiceId);
    if (!invoice) {
        throw new Error('Facture introuvable.');
    }
    const planName = getInvoicePlanName(invoice);
    const tenantName = invoice.tenant?.name ?? 'Organisation';
    const emails = targetEmail
        ? [targetEmail.trim()]
        : (Array.isArray(invoice.recipientEmails) ? invoice.recipientEmails : []);
    if (emails.length === 0) {
        throw new Error('Aucun destinataire e-mail disponible.');
    }
    const subject = invoice.type === 'RENEWAL'
        ? `EventMaster — Facture de renouvellement ${invoice.invoiceNumber}`
        : `EventMaster — Facture abonnement ${invoice.invoiceNumber}`;
    const results = [];
    const details = invoice.details;
    for (const email of emails) {
        const html = renderInvoiceHtml({
            invoiceNumber: invoice.invoiceNumber,
            tenantName,
            planName,
            amount: invoice.amount,
            currency: invoice.currency,
            type: invoice.type,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            durationDays: invoice.durationDays,
            baseAmount: details?.baseAmount,
            discountPercent: details?.discountPercent,
            discountAmount: details?.discountAmount,
        });
        const text = renderInvoiceText({
            invoiceNumber: invoice.invoiceNumber,
            tenantName,
            planName,
            amount: invoice.amount,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            durationDays: invoice.durationDays,
            baseAmount: details?.baseAmount,
            discountPercent: details?.discountPercent,
            discountAmount: details?.discountAmount,
        });
        const result = await (0, notificationService_1.sendRealEmail)(email, subject, text, html);
        results.push({ email, success: result.success, error: result.error });
    }
    const sent = results.filter((r) => r.success).map((r) => r.email);
    if (sent.length === 0) {
        throw new Error(results[0]?.error || 'Échec de l\'envoi par e-mail.');
    }
    return { sentTo: sent, results };
}
