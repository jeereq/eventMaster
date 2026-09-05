import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
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
  rejectSubscriptionRequest 
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
import { getAdminAiTokenUsage } from '../controllers/adminAiTokensController';

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
router.post('/subscriptions/requests/:id/reject', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), rejectSubscriptionRequest);
router.post('/tenants', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), createTenant);
router.get('/tenants/:id/subscription-history', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getTenantSubscriptionHistory);

// Super Admin uniquement
router.use(requireRole(['SUPER_ADMIN']));

router.get('/reports/revenue', getRevenueReport);
router.get('/reports/revenue/export', exportRevenueReport);
router.post('/reports/revenue/notify-payouts', notifyRevenuePayouts);
router.post('/reports/revenue/mark-paid', markRevenuePayoutPaid);
router.get('/payouts', listAdminSaasPayouts);
router.patch('/payouts', settleAdminSaasPayout);
router.post('/payouts/flexpay', requireRole(['SUPER_ADMIN']), initiateAdminSaasFlexPayPayout);
router.get(
  '/payouts/flexpay/:transferId/verify',
  requireRole(['SUPER_ADMIN']),
  verifyAdminSaasFlexPayPayout,
);

router.get('/ops-overview', getOpsOverview);
router.get('/insights', getPlatformInsights);
router.get('/audit-logs', getAuditLogs);
router.get('/tenants/:id/ops', getTenantOps);
router.post('/tenants/:id/impersonate', impersonateTenant);

router.get('/catalog/overview', getCatalogOverview);
router.get('/catalog/venues', listAdminVenues);
router.get('/catalog/offerings', listAdminOfferings);
router.patch('/catalog/vendors/:id/block', toggleVendorBlock);
router.patch('/catalog/venues/:id/block', toggleVenueBlock);
router.patch('/catalog/offerings/:id/block', toggleOfferingBlock);
router.get('/catalog/inquiries', listAdminInquiries);
router.get('/catalog/bookings', listAdminBookings);
router.get('/catalog/commissions', listAdminCommissions);
router.patch('/catalog/bookings/:id/commission', settleMarketplaceCommission);
router.patch('/catalog/venues/:id/visibility', setVenueListingVisibility);
router.patch('/catalog/offerings/:id/visibility', setServiceOfferingVisibility);
router.patch('/catalog/venues/:id/unpublish', unpublishVenueListing);
router.patch('/catalog/offerings/:id/unpublish', unpublishServiceOffering);

router.get('/payments/overview', getAdminPaymentsOverview);
router.get('/payments/attempts', listAdminPaymentAttempts);
router.get('/ai-tokens/usage', getAdminAiTokenUsage);

router.put('/tenants/:id', updateTenantPlanOrLicense);
router.delete('/tenants/:id', deleteTenant);

router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUserRoleOrStatus);
router.delete('/users/:id', deleteUser);

router.get('/templates', getAllTemplates);
router.post('/templates/global', createGlobalTemplate);
router.put('/templates/:id/landing', toggleTemplateLanding);
router.delete('/templates/:id', deleteTemplate);

router.get('/message-templates', getGuestMessageTemplates);
router.get('/message-templates/:id', getGuestMessageTemplateById);
router.post('/message-templates', createGuestMessageTemplate);
router.put('/message-templates/:id', updateGuestMessageTemplate);
router.post('/message-templates/:id/reset', resetGuestMessageTemplate);

router.get('/events', getAllEvents);
router.post('/events', createAdminEvent);
router.put('/events/:id', updateAdminEvent);
router.patch('/events/:id/block', toggleAdminEventBlock);
router.delete('/events/:id', deleteAdminEvent);

router.get('/guests', getAllGuests);
router.post('/guests', createAdminGuest);
router.put('/guests/:id', updateAdminGuest);
router.delete('/guests/:id', deleteAdminGuest);

router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
