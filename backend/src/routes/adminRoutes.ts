import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { 
  getSystemStats, 
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
import { getRevenueReport, exportRevenueReport } from '../controllers/revenueReportController';
import { getInvoiceDetail, downloadInvoicePdf, sendInvoiceByEmail } from '../controllers/invoiceController';
import {
  getOpsOverview,
  getAuditLogs,
  getTenantOps,
  impersonateTenant,
} from '../controllers/adminOpsController';

const router = Router();

router.use(requireAuth);

// Personnel plateforme (Super Admin + Commercial sans organisation)
router.get('/stats', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getSystemStats);
router.get('/invoices', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getAdminInvoices);
router.get('/invoices/:id', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getInvoiceDetail);
router.get('/invoices/:id/pdf', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), downloadInvoicePdf);
router.post('/invoices/:id/send', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), sendInvoiceByEmail);
router.get('/subscriptions/requests', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getAdminSubscriptionRequests);
router.post('/subscriptions/requests/:id/approve', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), approveSubscriptionRequest);
router.post('/subscriptions/requests/:id/reject', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), rejectSubscriptionRequest);
router.post('/tenants', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), createTenant);
router.get('/tenants/:id/subscription-history', requireRole(['SUPER_ADMIN', 'COMMERCIAL']), getTenantSubscriptionHistory);

// Super Admin uniquement
router.use(requireRole(['SUPER_ADMIN']));

router.get('/reports/revenue', getRevenueReport);
router.get('/reports/revenue/export', exportRevenueReport);

router.get('/ops-overview', getOpsOverview);
router.get('/audit-logs', getAuditLogs);
router.get('/tenants/:id/ops', getTenantOps);
router.post('/tenants/:id/impersonate', impersonateTenant);

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
router.delete('/events/:id', deleteAdminEvent);

router.get('/guests', getAllGuests);
router.post('/guests', createAdminGuest);
router.put('/guests/:id', updateAdminGuest);
router.delete('/guests/:id', deleteAdminGuest);

router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
