import { Router } from 'express';
import { getBillingStatus, createCheckoutSession, mockUpgrade } from '../controllers/billingController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/status', getBillingStatus);
router.post('/checkout', createCheckoutSession);
router.post('/mock-upgrade', mockUpgrade);

export default router;
