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
  updateAdminSettings
} from '../controllers/adminController';
import { 
  getAdminSubscriptionRequests, 
  approveSubscriptionRequest, 
  rejectSubscriptionRequest 
} from '../controllers/subscriptionController';

const router = Router();

// Protect all admin routes with authentication and SUPER_ADMIN role
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

// GET /api/admin/stats
router.get('/stats', getSystemStats);

// Subscription Requests routes (Super Admin)
router.get('/subscriptions/requests', getAdminSubscriptionRequests);
router.post('/subscriptions/requests/:id/approve', approveSubscriptionRequest);
router.post('/subscriptions/requests/:id/reject', rejectSubscriptionRequest);

// Tenants routes
router.post('/tenants', createTenant);
router.put('/tenants/:id', updateTenantPlanOrLicense);
router.delete('/tenants/:id', deleteTenant);

// Users routes
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUserRoleOrStatus);
router.delete('/users/:id', deleteUser);

// Templates routes
router.get('/templates', getAllTemplates);
router.post('/templates/global', createGlobalTemplate);
router.put('/templates/:id/landing', toggleTemplateLanding);
router.delete('/templates/:id', deleteTemplate);

// Events routes
router.get('/events', getAllEvents);
router.post('/events', createAdminEvent);
router.put('/events/:id', updateAdminEvent);
router.delete('/events/:id', deleteAdminEvent);

// Guests routes
router.get('/guests', getAllGuests);
router.post('/guests', createAdminGuest);
router.put('/guests/:id', updateAdminGuest);
router.delete('/guests/:id', deleteAdminGuest);

// Settings routes
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
