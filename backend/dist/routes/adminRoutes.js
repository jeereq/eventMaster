"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const platformSettingsService_1 = require("../services/platformSettingsService");
const adminController_1 = require("../controllers/adminController");
const guestMessageTemplateController_1 = require("../controllers/guestMessageTemplateController");
const showcasePlanController_1 = require("../controllers/showcasePlanController");
const subscriptionController_1 = require("../controllers/subscriptionController");
const revenueReportController_1 = require("../controllers/revenueReportController");
const saasPayoutController_1 = require("../controllers/saasPayoutController");
const invoiceController_1 = require("../controllers/invoiceController");
const adminOpsController_1 = require("../controllers/adminOpsController");
const adminCatalogController_1 = require("../controllers/adminCatalogController");
const adminPaymentsController_1 = require("../controllers/adminPaymentsController");
const adminAiTokensController_1 = require("../controllers/adminAiTokensController");
const donationReportController_1 = require("../controllers/donationReportController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Personnel plateforme (Super Admin + Commercial sans organisation)
router.get('/stats', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), adminController_1.getSystemStats);
router.get('/tenants', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), adminController_1.listAdminTenants);
router.get('/invoices', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), adminController_1.getAdminInvoices);
router.get('/invoices/:id', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), invoiceController_1.getInvoiceDetail);
router.get('/invoices/:id/pdf', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), invoiceController_1.downloadInvoicePdf);
router.post('/invoices/:id/send', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), invoiceController_1.sendInvoiceByEmail);
router.patch('/invoices/:id/paid', (0, auth_1.requireRole)(['SUPER_ADMIN']), invoiceController_1.markAdminInvoicePaid);
router.get('/subscriptions/requests', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), subscriptionController_1.getAdminSubscriptionRequests);
router.post('/subscriptions/requests/:id/approve', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), subscriptionController_1.approveSubscriptionRequest);
router.post('/subscriptions/requests/:id/quote', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), subscriptionController_1.quoteSubscriptionDiscount);
router.post('/subscriptions/requests/:id/reject', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), subscriptionController_1.rejectSubscriptionRequest);
router.post('/tenants', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), adminController_1.createTenant);
router.get('/tenants/:id/subscription-history', (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']), adminController_1.getTenantSubscriptionHistory);
/**
 * Middleware vérifiant les privilèges Super Admin ou une permission commerciale déléguée.
 */
function requireAdminOrCommercialPerm(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        if (req.user.role === 'COMMERCIAL' && (0, platformSettingsService_1.hasCommercialPermission)(req.user.id, permission)) {
            return next();
        }
        return res.status(403).json({
            error: `Accès refusé. Privilèges Super Admin ou droit délégué (${permission}) requis.`,
        });
    };
}
// Super Admin uniquement pour les opérations financières et système critiques
router.get('/reports/revenue', (0, auth_1.requireRole)(['SUPER_ADMIN']), revenueReportController_1.getRevenueReport);
router.get('/reports/revenue/export', (0, auth_1.requireRole)(['SUPER_ADMIN']), revenueReportController_1.exportRevenueReport);
router.post('/reports/revenue/notify-payouts', (0, auth_1.requireRole)(['SUPER_ADMIN']), revenueReportController_1.notifyRevenuePayouts);
router.post('/reports/revenue/mark-paid', (0, auth_1.requireRole)(['SUPER_ADMIN']), revenueReportController_1.markRevenuePayoutPaid);
router.get('/donations/report', (0, auth_1.requireRole)(['SUPER_ADMIN']), donationReportController_1.getAdminDonationsReport);
router.get('/donations/export', (0, auth_1.requireRole)(['SUPER_ADMIN']), donationReportController_1.exportAdminDonationsReport);
router.get('/payouts', (0, auth_1.requireRole)(['SUPER_ADMIN']), saasPayoutController_1.listAdminSaasPayouts);
router.patch('/payouts', (0, auth_1.requireRole)(['SUPER_ADMIN']), saasPayoutController_1.settleAdminSaasPayout);
router.post('/payouts/flexpay', (0, auth_1.requireRole)(['SUPER_ADMIN']), saasPayoutController_1.initiateAdminSaasFlexPayPayout);
router.get('/payouts/flexpay/:transferId/verify', (0, auth_1.requireRole)(['SUPER_ADMIN']), saasPayoutController_1.verifyAdminSaasFlexPayPayout);
router.get('/ops-overview', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminOpsController_1.getOpsOverview);
router.get('/insights', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminOpsController_1.getPlatformInsights);
router.get('/audit-logs', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminOpsController_1.getAuditLogs);
router.get('/tenants/:id/ops', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminOpsController_1.getTenantOps);
router.post('/tenants/:id/impersonate', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminOpsController_1.impersonateTenant);
// Catalogue : Super Admin ou Commercial avec droit 'canManageCatalog'
router.get('/catalog/overview', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.getCatalogOverview);
router.get('/catalog/venues', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.listAdminVenues);
router.get('/catalog/offerings', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.listAdminOfferings);
router.patch('/catalog/vendors/:id/block', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.toggleVendorBlock);
router.patch('/catalog/venues/:id/block', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.toggleVenueBlock);
router.patch('/catalog/offerings/:id/block', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.toggleOfferingBlock);
router.get('/catalog/inquiries', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.listAdminInquiries);
router.get('/catalog/bookings', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.listAdminBookings);
router.get('/catalog/commissions', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.listAdminCommissions);
router.patch('/catalog/bookings/:id/commission', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.settleMarketplaceCommission);
router.patch('/catalog/venues/:id/visibility', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.setVenueListingVisibility);
router.patch('/catalog/offerings/:id/visibility', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.setServiceOfferingVisibility);
router.patch('/catalog/venues/:id/unpublish', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.unpublishVenueListing);
router.patch('/catalog/offerings/:id/unpublish', requireAdminOrCommercialPerm('canManageCatalog'), adminCatalogController_1.unpublishServiceOffering);
// Paiements et jetons : Super Admin uniquement
router.get('/payments/overview', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminPaymentsController_1.getAdminPaymentsOverview);
router.get('/payments/attempts', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminPaymentsController_1.listAdminPaymentAttempts);
router.get('/ai-tokens/usage', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminAiTokensController_1.getAdminAiTokenUsage);
router.get('/ai-tokens/export', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminAiTokensController_1.exportAdminAiTokenUsage);
router.post('/ai-tokens/grant', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminAiTokensController_1.grantAdminAiTokens);
// Gestion des organisations et utilisateurs : Super Admin uniquement
router.put('/tenants/:id', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.updateTenantPlanOrLicense);
router.delete('/tenants/:id', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.deleteTenant);
router.get('/users', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.getAllUsers);
router.post('/users', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.createUser);
router.put('/users/:id', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.updateUserRoleOrStatus);
router.delete('/users/:id', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.deleteUser);
// Modèles d'invitations : Super Admin ou Commercial avec droit 'canManageTemplates'
router.get('/templates', requireAdminOrCommercialPerm('canManageTemplates'), adminController_1.getAllTemplates);
router.post('/templates/global', requireAdminOrCommercialPerm('canManageTemplates'), adminController_1.createGlobalTemplate);
router.put('/templates/:id/landing', requireAdminOrCommercialPerm('canManageTemplates'), adminController_1.toggleTemplateLanding);
router.delete('/templates/:id', requireAdminOrCommercialPerm('canManageTemplates'), adminController_1.deleteTemplate);
// Plans 2D / 3D vitrine : Super Admin ou Commercial avec droit 'canManageShowcasePlans'
router.get('/showcase-plans', requireAdminOrCommercialPerm('canManageShowcasePlans'), showcasePlanController_1.getAdminShowcasePlans);
router.post('/showcase-plans', requireAdminOrCommercialPerm('canManageShowcasePlans'), showcasePlanController_1.createShowcasePlan);
router.put('/showcase-plans/selection', requireAdminOrCommercialPerm('canManageShowcasePlans'), showcasePlanController_1.updateShowcasePlansSelection);
router.put('/showcase-plans/:id', requireAdminOrCommercialPerm('canManageShowcasePlans'), showcasePlanController_1.updateShowcasePlan);
router.delete('/showcase-plans/:id', requireAdminOrCommercialPerm('canManageShowcasePlans'), showcasePlanController_1.deleteShowcasePlan);
// Modèles de messages automatiques : Super Admin ou Commercial avec droit 'canManageMessageTemplates'
router.get('/message-templates', requireAdminOrCommercialPerm('canManageMessageTemplates'), guestMessageTemplateController_1.getGuestMessageTemplates);
router.get('/message-templates/:id', requireAdminOrCommercialPerm('canManageMessageTemplates'), guestMessageTemplateController_1.getGuestMessageTemplateById);
router.post('/message-templates', requireAdminOrCommercialPerm('canManageMessageTemplates'), guestMessageTemplateController_1.createGuestMessageTemplate);
router.put('/message-templates/:id', requireAdminOrCommercialPerm('canManageMessageTemplates'), guestMessageTemplateController_1.updateGuestMessageTemplate);
router.post('/message-templates/:id/reset', requireAdminOrCommercialPerm('canManageMessageTemplates'), guestMessageTemplateController_1.resetGuestMessageTemplate);
// Événements plateforme : Super Admin ou Commercial avec droit 'canManageEvents'
router.get('/events', requireAdminOrCommercialPerm('canManageEvents'), adminController_1.getAllEvents);
router.post('/events', requireAdminOrCommercialPerm('canManageEvents'), adminController_1.createAdminEvent);
router.put('/events/:id', requireAdminOrCommercialPerm('canManageEvents'), adminController_1.updateAdminEvent);
router.patch('/events/:id/block', requireAdminOrCommercialPerm('canManageEvents'), adminController_1.toggleAdminEventBlock);
router.delete('/events/:id', requireAdminOrCommercialPerm('canManageEvents'), adminController_1.deleteAdminEvent);
// Invités plateforme : Super Admin ou Commercial avec droit 'canManageGuests'
router.get('/guests', requireAdminOrCommercialPerm('canManageGuests'), adminController_1.getAllGuests);
router.post('/guests', requireAdminOrCommercialPerm('canManageGuests'), adminController_1.createAdminGuest);
router.put('/guests/:id', requireAdminOrCommercialPerm('canManageGuests'), adminController_1.updateAdminGuest);
router.delete('/guests/:id', requireAdminOrCommercialPerm('canManageGuests'), adminController_1.deleteAdminGuest);
// Réglages système : Super Admin uniquement
router.get('/settings', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.getAdminSettings);
router.put('/settings', (0, auth_1.requireRole)(['SUPER_ADMIN']), adminController_1.updateAdminSettings);
exports.default = router;
