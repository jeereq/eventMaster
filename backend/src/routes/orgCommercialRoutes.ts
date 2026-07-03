import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getOrgCommercialDashboard } from '../controllers/orgCommercialController';

const router = Router();

router.use(requireAuth);
router.get('/dashboard', getOrgCommercialDashboard);

export default router;
