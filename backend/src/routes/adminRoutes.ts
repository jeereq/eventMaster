import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { 
  getSystemStats, 
  updateTenantPlanOrLicense, 
  deleteTenant, 
  getAllUsers, 
  updateUserRoleOrStatus, 
  deleteUser, 
  getAllTemplates, 
  createGlobalTemplate, 
  deleteTemplate 
} from '../controllers/adminController';

const router = Router();

// Protect all admin routes with authentication and SUPER_ADMIN role
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

// GET /api/admin/stats
router.get('/stats', getSystemStats);

// Tenants routes
router.put('/tenants/:id', updateTenantPlanOrLicense);
router.delete('/tenants/:id', deleteTenant);

// Users routes
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserRoleOrStatus);
router.delete('/users/:id', deleteUser);

// Templates routes
router.get('/templates', getAllTemplates);
router.post('/templates/global', createGlobalTemplate);
router.delete('/templates/:id', deleteTemplate);

export default router;
