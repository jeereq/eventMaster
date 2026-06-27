import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSystemStats } from '../controllers/adminController';

const router = Router();

// Protect all admin routes with authentication and SUPER_ADMIN role
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

// GET /api/admin/stats
router.get('/stats', getSystemStats);

export default router;
