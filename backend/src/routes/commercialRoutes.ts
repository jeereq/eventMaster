import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getCommercialDashboard,
  createCommercialOrganization,
  getCommercialReferralInfo,
  resendCommercialManagerVerification,
} from '../controllers/commercialController';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getCommercialDashboard);
router.get('/referral', getCommercialReferralInfo);
router.post('/organizations', createCommercialOrganization);
router.post('/organizations/:managerId/resend-verification', resendCommercialManagerVerification);

export default router;
