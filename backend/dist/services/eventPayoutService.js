"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdminEventPayoutsReport = buildAdminEventPayoutsReport;
exports.buildEventPayoutsCsv = buildEventPayoutsCsv;
exports.settleEventPayoutRecord = settleEventPayoutRecord;
const db_1 = require("../db");
const platformSettingsService_1 = require("./platformSettingsService");
async function buildAdminEventPayoutsReport(filters) {
    const settings = (0, platformSettingsService_1.loadPlatformSettings)();
    const ticketRate = settings.eventTicketingRetentionRate || 0.05;
    const donationRate = settings.eventDonationsRetentionRate || 0.04;
    const ticketPct = Math.round(ticketRate * 100);
    const donationPct = Math.round(donationRate * 100);
    const whereEvent = {};
    if (filters?.tenantId && filters.tenantId !== 'all') {
        whereEvent.tenantId = filters.tenantId;
    }
    if (filters?.q && filters.q.trim()) {
        const query = filters.q.trim();
        whereEvent.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { tenant: { name: { contains: query, mode: 'insensitive' } } },
        ];
    }
    // Chercher tous les événements ayant des commandes payées
    const events = await db_1.prisma.event.findMany({
        where: {
            ...whereEvent,
            ticketOrders: {
                some: { status: 'PAID' },
            },
        },
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                    manager: { select: { id: true, name: true, email: true, phone: true } },
                },
            },
            ticketOrders: {
                where: { status: 'PAID' },
                select: {
                    id: true,
                    amountFc: true,
                    pricingZoneId: true,
                    status: true,
                    paidAt: true,
                },
            },
        },
        orderBy: { date: 'desc' },
    });
    let totalGross = 0;
    let totalRetention = 0;
    let totalNetDue = 0;
    let totalNetPaid = 0;
    let dueCount = 0;
    let paidCount = 0;
    const summaries = [];
    for (const ev of events) {
        const orders = ev.ticketOrders;
        let tGross = 0;
        let tCount = 0;
        let dGross = 0;
        let dCount = 0;
        for (const ord of orders) {
            if (ord.pricingZoneId === 'donation') {
                dGross += ord.amountFc;
                dCount += 1;
            }
            else {
                tGross += ord.amountFc;
                tCount += 1;
            }
        }
        const tRetention = Math.round(tGross * ticketRate);
        const tNet = tGross - tRetention;
        const dRetention = Math.round(dGross * donationRate);
        const dNet = dGross - dRetention;
        const evGross = tGross + dGross;
        const evRetention = tRetention + dRetention;
        const evNet = evGross - evRetention;
        // Métadonnées de versement stockées dans eventPrep.payout
        const prep = ev.eventPrep && typeof ev.eventPrep === 'object' ? ev.eventPrep : {};
        const payoutMeta = prep.payout && typeof prep.payout === 'object' ? prep.payout : null;
        let payoutStatus = 'DUE';
        if (evGross === 0) {
            payoutStatus = 'NONE';
        }
        else if (payoutMeta?.status === 'PAID') {
            payoutStatus = 'PAID';
        }
        else if (payoutMeta?.status === 'PARTIAL') {
            payoutStatus = 'PARTIAL';
        }
        else {
            payoutStatus = 'DUE';
        }
        // Filtre sur le statut si demandé
        if (filters?.status && filters.status !== 'all' && filters.status.toUpperCase() !== payoutStatus) {
            continue;
        }
        totalGross += evGross;
        totalRetention += evRetention;
        if (payoutStatus === 'PAID') {
            paidCount += 1;
            totalNetPaid += evNet;
        }
        else {
            dueCount += 1;
            totalNetDue += evNet;
        }
        summaries.push({
            eventId: ev.id,
            eventTitle: ev.title,
            eventSlug: ev.slug,
            eventDate: ev.date.toISOString(),
            tenantId: ev.tenantId,
            tenantName: ev.tenant?.name || 'Organisation',
            managerName: ev.tenant?.manager?.name || null,
            managerEmail: ev.tenant?.manager?.email || null,
            managerPhone: ev.tenant?.manager?.phone || null,
            ticketingOrdersCount: tCount,
            ticketingGrossFc: tGross,
            ticketingRetentionRatePercent: ticketPct,
            ticketingRetentionFc: tRetention,
            ticketingNetFc: tNet,
            donationsOrdersCount: dCount,
            donationsGrossFc: dGross,
            donationsRetentionRatePercent: donationPct,
            donationsRetentionFc: dRetention,
            donationsNetFc: dNet,
            totalGrossFc: evGross,
            totalRetentionFc: evRetention,
            totalNetPayoutFc: evNet,
            payoutStatus,
            settledAt: typeof payoutMeta?.settledAt === 'string' ? payoutMeta.settledAt : null,
            settledBy: typeof payoutMeta?.settledBy === 'string' ? payoutMeta.settledBy : null,
            settledAmountFc: typeof payoutMeta?.settledAmountFc === 'number' ? payoutMeta.settledAmountFc : null,
            proofUrl: typeof payoutMeta?.proofUrl === 'string' ? payoutMeta.proofUrl : null,
            notes: typeof payoutMeta?.notes === 'string' ? payoutMeta.notes : null,
            paymentMethod: typeof payoutMeta?.paymentMethod === 'string' ? payoutMeta.paymentMethod : null,
        });
    }
    return {
        generatedAt: new Date().toISOString(),
        kpis: {
            totalEventsWithRevenue: summaries.length,
            totalGrossCollectedFc: totalGross,
            totalPlatformRetentionFc: totalRetention,
            totalNetPayoutDueFc: totalNetDue,
            totalNetPayoutPaidFc: totalNetPaid,
            eventsDueCount: dueCount,
            eventsPaidCount: paidCount,
        },
        events: summaries,
    };
}
function buildEventPayoutsCsv(report) {
    function csvEscape(val) {
        if (val === null || val === undefined)
            return '""';
        const s = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
        return `"${s}"`;
    }
    const header = [
        'ID Événement',
        'Titre Événement',
        'Date Événement',
        'Organisation',
        'Responsable',
        'Email',
        'Téléphone',
        'Billetterie Brut (FC)',
        'Retenue Billetterie (FC)',
        'Billetterie Net (FC)',
        'Dons Brut (FC)',
        'Retenue Dons (FC)',
        'Dons Net (FC)',
        'Total Brut Encaissé (FC)',
        'Total Retenue Plateforme (FC)',
        'Total Net à Reverser (FC)',
        'Statut Reversement',
        'Date Versement',
        'Méthode',
        'Preuve',
        'Notes',
    ].map(csvEscape).join(',');
    const rows = report.events.map((e) => [
        csvEscape(e.eventId),
        csvEscape(e.eventTitle),
        csvEscape(e.eventDate.slice(0, 10)),
        csvEscape(e.tenantName),
        csvEscape(e.managerName || ''),
        csvEscape(e.managerEmail || ''),
        csvEscape(e.managerPhone || ''),
        e.ticketingGrossFc,
        e.ticketingRetentionFc,
        e.ticketingNetFc,
        e.donationsGrossFc,
        e.donationsRetentionFc,
        e.donationsNetFc,
        e.totalGrossFc,
        e.totalRetentionFc,
        e.totalNetPayoutFc,
        csvEscape(e.payoutStatus),
        csvEscape(e.settledAt ? e.settledAt.slice(0, 10) : ''),
        csvEscape(e.paymentMethod || ''),
        csvEscape(e.proofUrl || ''),
        csvEscape(e.notes || ''),
    ].join(','));
    return `\uFEFF${header}\n${rows.join('\n')}`;
}
async function settleEventPayoutRecord(params) {
    const event = await db_1.prisma.event.findUnique({
        where: { id: params.eventId },
        select: { id: true, title: true, tenantId: true, eventPrep: true },
    });
    if (!event)
        throw new Error('Événement introuvable.');
    const currentPrep = event.eventPrep && typeof event.eventPrep === 'object'
        ? event.eventPrep
        : {};
    const now = new Date();
    const nextPayout = {
        status: params.status,
        settledAt: params.status === 'PAID' ? now.toISOString() : null,
        settledBy: params.actorId,
        settledAmountFc: params.settledAmountFc,
        proofUrl: params.proofUrl || null,
        notes: params.notes || null,
        paymentMethod: params.paymentMethod || 'Virement bancaire / Mobile Money',
        updatedAt: now.toISOString(),
    };
    const updatedEvent = await db_1.prisma.event.update({
        where: { id: params.eventId },
        data: {
            eventPrep: {
                ...currentPrep,
                payout: nextPayout,
            },
        },
    });
    return {
        success: true,
        eventId: event.id,
        payout: nextPayout,
    };
}
