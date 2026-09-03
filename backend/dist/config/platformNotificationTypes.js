"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_PREF_FAMILIES = exports.NOTIFICATION_FAMILIES = exports.PLATFORM_NOTIFICATION_TYPE = void 0;
exports.typesForFamily = typesForFamily;
exports.familyForType = familyForType;
exports.isNotificationPrefFamily = isNotificationPrefFamily;
exports.PLATFORM_NOTIFICATION_TYPE = {
    SUBSCRIPTION_APPROVAL: 'SUBSCRIPTION_APPROVAL',
    ADMIN_ACTIVATION: 'ADMIN_ACTIVATION',
    ADMIN_RENEWAL: 'ADMIN_RENEWAL',
    ADMIN_PLAN_CHANGE: 'ADMIN_PLAN_CHANGE',
    LICENSE_RENEWAL: 'LICENSE_RENEWAL',
    MONTHLY_COMMISSION_DUE: 'MONTHLY_COMMISSION_DUE',
    MONTHLY_COMMISSION_PAID: 'MONTHLY_COMMISSION_PAID',
    SUBSCRIPTION_REQUEST_PENDING: 'SUBSCRIPTION_REQUEST_PENDING',
    LICENSE_EXPIRING: 'LICENSE_EXPIRING',
    INVOICE_ISSUED: 'INVOICE_ISSUED',
    MARKETPLACE_INQUIRY: 'MARKETPLACE_INQUIRY',
    MARKETPLACE_BOOKING: 'MARKETPLACE_BOOKING',
    MARKETPLACE_BOOKING_STATUS: 'MARKETPLACE_BOOKING_STATUS',
    EVENT_TASK_ASSIGNED: 'EVENT_TASK_ASSIGNED',
    EVENT_TASK_DUE: 'EVENT_TASK_DUE',
    EVENT_TASK_COMPLETED: 'EVENT_TASK_COMPLETED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
};
exports.NOTIFICATION_FAMILIES = {
    billing: [
        exports.PLATFORM_NOTIFICATION_TYPE.SUBSCRIPTION_APPROVAL,
        exports.PLATFORM_NOTIFICATION_TYPE.ADMIN_ACTIVATION,
        exports.PLATFORM_NOTIFICATION_TYPE.ADMIN_RENEWAL,
        exports.PLATFORM_NOTIFICATION_TYPE.ADMIN_PLAN_CHANGE,
        exports.PLATFORM_NOTIFICATION_TYPE.LICENSE_RENEWAL,
        exports.PLATFORM_NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST_PENDING,
        exports.PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
        exports.PLATFORM_NOTIFICATION_TYPE.INVOICE_ISSUED,
        exports.PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
    ],
    commissions: [
        exports.PLATFORM_NOTIFICATION_TYPE.MONTHLY_COMMISSION_DUE,
        exports.PLATFORM_NOTIFICATION_TYPE.MONTHLY_COMMISSION_PAID,
    ],
    catalog: [
        exports.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
        exports.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
        exports.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
    ],
    tasks: [
        exports.PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_ASSIGNED,
        exports.PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_DUE,
        exports.PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_COMPLETED,
    ],
};
exports.NOTIFICATION_PREF_FAMILIES = ['billing', 'commissions', 'catalog', 'tasks'];
function typesForFamily(family) {
    if (!family)
        return undefined;
    const key = family;
    const types = exports.NOTIFICATION_FAMILIES[key];
    return types ? [...types] : undefined;
}
function familyForType(type) {
    if (exports.NOTIFICATION_FAMILIES.billing.includes(type))
        return 'billing';
    if (exports.NOTIFICATION_FAMILIES.commissions.includes(type))
        return 'commissions';
    if (exports.NOTIFICATION_FAMILIES.catalog.includes(type))
        return 'catalog';
    if (exports.NOTIFICATION_FAMILIES.tasks.includes(type))
        return 'tasks';
    return 'account';
}
function isNotificationPrefFamily(value) {
    return exports.NOTIFICATION_PREF_FAMILIES.includes(value);
}
