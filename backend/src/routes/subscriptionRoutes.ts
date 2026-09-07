import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  submitSubscriptionRequest,
  submitDiscountRequest,
  getMySubscriptionRequests,
  getSubscriptionPlans,
  checkoutSubscriptionFlexPay,
  verifySubscriptionFlexPay,
  retrySubscriptionFlexPay,
} from '../controllers/subscriptionController';

const router = Router();

router.use(requireAuth);

router.get('/plans', getSubscriptionPlans);
router.post('/request', submitSubscriptionRequest);
router.post('/request-discount', submitDiscountRequest);
router.post('/checkout', checkoutSubscriptionFlexPay);
router.get('/requests/:id/verify', verifySubscriptionFlexPay);
router.post('/requests/:id/retry-payment', retrySubscriptionFlexPay);
router.get('/my-requests', getMySubscriptionRequests);

export default router;
