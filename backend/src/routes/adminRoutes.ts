import { Router, type Response, type NextFunction } from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import {
  hasCommercialPermission,
  type CommercialGrantedPermissions,
} from '../services/platformSettingsService';
import { 
  getSystemStats, 
  listAdminTenants,
  createTenant,
  updateTenantPlanOrLicense, 
  deleteTenant, 
  getAllUsers, 
  createUser,
  updateUserRoleOrStatus, 
  deleteUser, 
  getAllTemplates, 
  createGlobalTemplate, 
  toggleTemplateLanding,
  deleteTemplate,
  getAllEvents,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
  getAllGuests,
  createAdminGuest,
  updateAdminGuest,
  deleteAdminGuest,
  getAdminSettings,
  updateAdminSettings,
  getAdminInvoices,
  getTenantSubscriptionHistory,
  toggleAdminEventBlock,
} from '../controllers/adminController';
import {
  getGuestMessageTemplates,
  getGuestMessageTemplateById,
  createGuestMessageTemplate,
  updateGuestMessageTemplate,
  resetGuestMessageTemplate,
} from '../controllers/guestMessageTemplateController';
import { 
  getAdminSubscriptionRequests, 
  approveSubscriptionRequest, 
  rejectSubscriptionRequest,
  quoteSubscriptionDiscount,
} from '../controllers/subscriptionController';
import { getRevenueReport, exportRevenueReport, notifyRevenuePayouts, markRevenuePayoutPaid } from '../controllers/revenueReportController';
import {
  initiateAdminSaasFlexPayPayout,
  listAdminSaasPayouts,
  settleAdminSaasPayout,
  verifyAdminSaasFlexPayPayout,
} from '../controllers/saasPayoutController';
import { getInvoiceDetail, downloadInvoicePdf, sendInvoiceByEmail, markAdminInvoicePaid } from '../controllers/invoiceController';
import {
  getOpsOverview,
  getPlatformInsights,
  getAuditLogs,
  getTenantOps,
  impersonateTenant,
} from '../controllers/adminOpsController';
import {
  getCatalogOverview,
  listAdminVenues,
  listAdminOfferings,
  listAdminInquiries,
  listAdminBookings,
  listAdminCommissions,
  settleMarketplaceCommission,
  setVenueListingVisibility,
  setServiceOfferingVisibility,
  unpublishVenueListing,
  unpublishServiceOffering,
  toggleVendorBlock,
  toggleVenueBlock,
  toggleOfferingBlock,
} from '../controllers/adminCatalogController';
import {
  getAdminPaymentsOverview,
  listAdminPaymentAttempts,
} from '../controllers/adminPaymentsController';
import {
  getAdminAiTokenUsage,
  exportAdminAiTokenUsage,
  grantAdminAiTokens,
} from '../controllers/adminAiTokensController';
import {
  getAdminDonationsReport,
  exportAdminDonationsReport,
} from '../controllers/donationReportController';

const router = Router();

router.use(requireAuth);

// Personnel plateforme (Super Admin + Commercial sans organisation)
router.get('/stats', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getSystemStats);
router.get('/tenants', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), listAdminTenants);
router.get('/invoices', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getAdminInvoices);
router.get('/invoices/:id', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getInvoiceDetail);
router.get('/invoices/:id/pdf', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), downloadInvoicePdf);
router.post('/invoices/:id/send', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), sendInvoiceByEmail);
router.patch('/invoices/:id/paid', requireRole(['SUPER_ADMIN']), markAdminInvoicePaid);
router.get('/subscriptions/requests', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getAdminSubscriptionRequests);
router.post('/subscriptions/requests/:id/approve', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), approveSubscriptionRequest);
router.post('/subscriptions/requests/:id/quote', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), quoteSubscriptionDiscount);
router.post('/subscriptions/requests/:id/reject', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), rejectSubscriptionRequest);
router.post('/tenants', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), createTenant);
router.get('/tenants/:id/subscription-history', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getTenantSubscriptionHistory);

/**
 * Middleware vérifiant les privilèges Super Admin ou une permission commerciale déléguée.
 */
function requireAdminOrCommercialPerm(permission: keyof CommercialGrantedPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    if (req.user.role === 'COMMERCIAL' && hasCommercialPermission(req.user.id, permission)) {
      return next();
    }
    return res.status(403).json({
      error: `Accès refusé. Privilèges Super Admin ou droit délégué (${permission}) requis.`,
    });
  };
}

// Super Admin uniquement pour les opérations financières et système critiques
router.get('/reports/revenue', requireRole(['SUPER_ADMIN']), getRevenueReport);
router.get('/reports/revenue/export', requireRole(['SUPER_ADMIN']), exportRevenueReport);
router.post('/reports/revenue/notify-payouts', requireRole(['SUPER_ADMIN']), notifyRevenuePayouts);
router.post('/reports/revenue/mark-paid', requireRole(['SUPER_ADMIN']), markRevenuePayoutPaid);
router.get('/donations/report', requireRole(['SUPER_ADMIN']), getAdminDonationsReport);
router.get('/donations/export', requireRole(['SUPER_ADMIN']), exportAdminDonationsReport);
router.get('/payouts', requireRole(['SUPER_ADMIN']), listAdminSaasPayouts);
router.patch('/payouts', requireRole(['SUPER_ADMIN']), settleAdminSaasPayout);
router.post('/payouts/flexpay', requireRole(['SUPER_ADMIN']), initiateAdminSaasFlexPayPayout);
router.get(
  '/payouts/flexpay/:transferId/verify',
  requireRole(['SUPER_ADMIN']),
  verifyAdminSaasFlexPayPayout,
);

router.get('/ops-overview', requireRole(['SUPER_ADMIN']), getOpsOverview);
router.get('/insights', requireRole(['SUPER_ADMIN']), getPlatformInsights);
router.get('/audit-logs', requireRole(['SUPER_ADMIN']), getAuditLogs);
router.get('/tenants/:id/ops', requireRole(['SUPER_ADMIN']), getTenantOps);
router.post('/tenants/:id/impersonate', requireRole(['SUPER_ADMIN']), impersonateTenant);

// Catalogue : Super Admin ou Commercial avec droit 'canManageCatalog'
router.get('/catalog/overview', requireAdminOrCommercialPerm('canManageCatalog'), getCatalogOverview);
router.get('/catalog/venues', requireAdminOrCommercialPerm('canManageCatalog'), listAdminVenues);
router.get('/catalog/offerings', requireAdminOrCommercialPerm('canManageCatalog'), listAdminOfferings);
router.patch('/catalog/vendors/:id/block', requireAdminOrCommercialPerm('canManageCatalog'), toggleVendorBlock);
router.patch('/catalog/venues/:id/block', requireAdminOrCommercialPerm('canManageCatalog'), toggleVenueBlock);
router.patch('/catalog/offerings/:id/block', requireAdminOrCommercialPerm('canManageCatalog'), toggleOfferingBlock);
router.get('/catalog/inquiries', requireAdminOrCommercialPerm('canManageCatalog'), listAdminInquiries);
router.get('/catalog/bookings', requireAdminOrCommercialPerm('canManageCatalog'), listAdminBookings);
router.get('/catalog/commissions', requireAdminOrCommercialPerm('canManageCatalog'), listAdminCommissions);
router.patch('/catalog/bookings/:id/commission', requireAdminOrCommercialPerm('canManageCatalog'), settleMarketplaceCommission);
router.patch('/catalog/venues/:id/visibility', requireAdminOrCommercialPerm('canManageCatalog'), setVenueListingVisibility);
router.patch('/catalog/offerings/:id/visibility', requireAdminOrCommercialPerm('canManageCatalog'), setServiceOfferingVisibility);
router.patch('/catalog/venues/:id/unpublish', requireAdminOrCommercialPerm('canManageCatalog'), unpublishVenueListing);
router.patch('/catalog/offerings/:id/unpublish', requireAdminOrCommercialPerm('canManageCatalog'), unpublishServiceOffering);

// Paiements et jetons : Super Admin uniquement
router.get('/payments/overview', requireRole(['SUPER_ADMIN']), getAdminPaymentsOverview);
router.get('/payments/attempts', requireRole(['SUPER_ADMIN']), listAdminPaymentAttempts);
router.get('/ai-tokens/usage', requireRole(['SUPER_ADMIN']), getAdminAiTokenUsage);
router.get('/ai-tokens/export', requireRole(['SUPER_ADMIN']), exportAdminAiTokenUsage);
router.post('/ai-tokens/grant', requireRole(['SUPER_ADMIN']), grantAdminAiTokens);

// Gestion des organisations et utilisateurs : Super Admin uniquement
router.put('/tenants/:id', requireRole(['SUPER_ADMIN']), updateTenantPlanOrLicense);
router.delete('/tenants/:id', requireRole(['SUPER_ADMIN']), deleteTenant);

router.get('/users', requireRole(['SUPER_ADMIN']), getAllUsers);
router.post('/users', requireRole(['SUPER_ADMIN']), createUser);
router.put('/users/:id', requireRole(['SUPER_ADMIN']), updateUserRoleOrStatus);
router.delete('/users/:id', requireRole(['SUPER_ADMIN']), deleteUser);

// Modèles d'invitations : Super Admin ou Commercial avec droit 'canManageTemplates'
router.get('/templates', requireAdminOrCommercialPerm('canManageTemplates'), getAllTemplates);
router.post('/templates/global', requireAdminOrCommercialPerm('canManageTemplates'), createGlobalTemplate);
router.put('/templates/:id/landing', requireAdminOrCommercialPerm('canManageTemplates'), toggleTemplateLanding);
router.delete('/templates/:id', requireAdminOrCommercialPerm('canManageTemplates'), deleteTemplate);

// Modèles de messages automatiques : Super Admin ou Commercial avec droit 'canManageMessageTemplates'
router.get('/message-templates', requireAdminOrCommercialPerm('canManageMessageTemplates'), getGuestMessageTemplates);
router.get('/message-templates/:id', requireAdminOrCommercialPerm('canManageMessageTemplates'), getGuestMessageTemplateById);
router.post('/message-templates', requireAdminOrCommercialPerm('canManageMessageTemplates'), createGuestMessageTemplate);
router.put('/message-templates/:id', requireAdminOrCommercialPerm('canManageMessageTemplates'), updateGuestMessageTemplate);
router.post('/message-templates/:id/reset', requireAdminOrCommercialPerm('canManageMessageTemplates'), resetGuestMessageTemplate);

// Événements plateforme : Super Admin ou Commercial avec droit 'canManageEvents'
router.get('/events', requireAdminOrCommercialPerm('canManageEvents'), getAllEvents);
router.post('/events', requireAdminOrCommercialPerm('canManageEvents'), createAdminEvent);
router.put('/events/:id', requireAdminOrCommercialPerm('canManageEvents'), updateAdminEvent);
router.patch('/events/:id/block', requireAdminOrCommercialPerm('canManageEvents'), toggleAdminEventBlock);
router.delete('/events/:id', requireAdminOrCommercialPerm('canManageEvents'), deleteAdminEvent);

// Invités plateforme : Super Admin ou Commercial avec droit 'canManageGuests'
router.get('/guests', requireAdminOrCommercialPerm('canManageGuests'), getAllGuests);
router.post('/guests', requireAdminOrCommercialPerm('canManageGuests'), createAdminGuest);
router.put('/guests/:id', requireAdminOrCommercialPerm('canManageGuests'), updateAdminGuest);
router.delete('/guests/:id', requireAdminOrCommercialPerm('canManageGuests'), deleteAdminGuest);

// Réglages système : Super Admin uniquement
router.get('/settings', requireRole(['SUPER_ADMIN']), getAdminSettings);
router.put('/settings', requireRole(['SUPER_ADMIN']), updateAdminSettings);

export default router;
