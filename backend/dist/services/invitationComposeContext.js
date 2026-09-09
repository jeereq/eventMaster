"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectComposeContext = exports.parseInvitationContextSource = exports.isPersistedUserId = exports.hasUsableComposeContext = exports.formatContextForVision = exports.formatContextForImage = void 0;
exports.loadInvitationComposeContext = loadInvitationComposeContext;
const db_1 = require("../db");
const aiTemplateComposeHistoryService_1 = require("./aiTemplateComposeHistoryService");
const eventPlace_1 = require("../utils/eventPlace");
const invitationComposeContextUtils_ts_1 = require("./invitationComposeContextUtils.js");
var invitationComposeContextUtils_ts_2 = require("./invitationComposeContextUtils.js");
Object.defineProperty(exports, "formatContextForImage", { enumerable: true, get: function () { return invitationComposeContextUtils_ts_2.formatContextForImage; } });
Object.defineProperty(exports, "formatContextForVision", { enumerable: true, get: function () { return invitationComposeContextUtils_ts_2.formatContextForVision; } });
Object.defineProperty(exports, "hasUsableComposeContext", { enumerable: true, get: function () { return invitationComposeContextUtils_ts_2.hasUsableComposeContext; } });
Object.defineProperty(exports, "isPersistedUserId", { enumerable: true, get: function () { return invitationComposeContextUtils_ts_2.isPersistedUserId; } });
Object.defineProperty(exports, "parseInvitationContextSource", { enumerable: true, get: function () { return invitationComposeContextUtils_ts_2.parseInvitationContextSource; } });
Object.defineProperty(exports, "selectComposeContext", { enumerable: true, get: function () { return invitationComposeContextUtils_ts_2.selectComposeContext; } });
async function loadInvitationComposeContext(input) {
    const source = (0, invitationComposeContextUtils_ts_1.parseInvitationContextSource)(input.source);
    if (source === 'none')
        return (0, invitationComposeContextUtils_ts_1.emptyComposeContext)();
    const userId = (0, invitationComposeContextUtils_ts_1.isPersistedUserId)(input.userId) ? input.userId.trim() : null;
    const tenantId = input.tenantId?.trim() || null;
    const deviceId = input.deviceId?.trim() || null;
    const currentPrompt = input.currentPrompt || '';
    const wantOrg = source === 'org';
    const wantHistory = source === 'history';
    if (wantOrg && !userId && !tenantId)
        return (0, invitationComposeContextUtils_ts_1.emptyComposeContext)();
    if (wantHistory && !userId && !deviceId)
        return (0, invitationComposeContextUtils_ts_1.emptyComposeContext)();
    if (!userId && !tenantId && !deviceId)
        return (0, invitationComposeContextUtils_ts_1.emptyComposeContext)();
    try {
        const [userRow, events, history] = await Promise.all([
            wantOrg && userId
                ? db_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        name: true,
                        tenant: {
                            select: {
                                name: true,
                                accountKind: true,
                                vendorProfile: { select: { displayName: true, city: true } },
                            },
                        },
                    },
                })
                : wantOrg && tenantId
                    ? db_1.prisma.tenant.findUnique({
                        where: { id: tenantId },
                        select: {
                            name: true,
                            accountKind: true,
                            vendorProfile: { select: { displayName: true, city: true } },
                        },
                    }).then((tenant) => (tenant ? { name: null, tenant } : null))
                    : Promise.resolve(null),
            wantOrg && tenantId
                ? db_1.prisma.event.findMany({
                    where: { tenantId },
                    orderBy: { date: 'desc' },
                    take: 4,
                    select: {
                        title: true,
                        eventKind: true,
                        location: true,
                        city: true,
                        commune: true,
                        neighborhood: true,
                        date: true,
                        clientName: true,
                    },
                })
                : Promise.resolve([]),
            wantHistory
                ? (0, aiTemplateComposeHistoryService_1.listAiTemplateComposeRuns)({ userId, deviceId, limit: 8 })
                : Promise.resolve([]),
        ]);
        const tenant = userRow && 'tenant' in userRow ? userRow.tenant : null;
        const vendor = tenant?.vendorProfile;
        const loaded = {
            organizerName: userRow && 'name' in userRow ? userRow.name?.trim() || null : null,
            organizationName: vendor?.displayName?.trim() || tenant?.name?.trim() || null,
            accountKind: tenant?.accountKind || null,
            accountKindLabel: tenant?.accountKind
                ? invitationComposeContextUtils_ts_1.ACCOUNT_KIND_LABEL[tenant.accountKind] || tenant.accountKind
                : null,
            vendorCity: vendor?.city?.trim() || null,
            recentEvents: events.map((event) => ({
                title: (0, invitationComposeContextUtils_ts_1.clipContextText)(event.title, 80),
                kind: event.eventKind || '',
                location: (0, invitationComposeContextUtils_ts_1.clipContextText)((0, eventPlace_1.formatEventPlace)(event) || event.location || '', 80),
                date: event.date.toISOString().slice(0, 10),
                clientName: event.clientName ? (0, invitationComposeContextUtils_ts_1.clipContextText)(event.clientName, 60) : null,
            })),
            recentPrompts: (0, invitationComposeContextUtils_ts_1.uniquePriorPrompts)(history.map((run) => run.prompt || ''), currentPrompt),
        };
        return (0, invitationComposeContextUtils_ts_1.selectComposeContext)(loaded, source);
    }
    catch (error) {
        console.warn('[invitationComposeContext] load failed:', error?.message);
        return (0, invitationComposeContextUtils_ts_1.emptyComposeContext)();
    }
}
