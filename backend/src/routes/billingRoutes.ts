import { Router } from 'express';
import { getBillingStatus, createCheckoutSession, mockUpgrade, getPlanFeatures, getTenantInvoices } from '../controllers/billingController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/status', getBillingStatus);
router.get('/invoices', getTenantInvoices);
router.get('/plan-features', getPlanFeatures);
router.post('/checkout', createCheckoutSession);
router.post('/mock-upgrade', mockUpgrade);

export default router;
