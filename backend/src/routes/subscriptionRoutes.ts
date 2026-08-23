import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { submitSubscriptionRequest, getMySubscriptionRequests, getSubscriptionPlans, checkoutSubscriptionFlexPay, verifySubscriptionFlexPay } from '../controllers/subscriptionController';

const router = Router();

router.use(requireAuth);

// Get subscription plans
router.get('/plans', getSubscriptionPlans);

// Submit a new subscription request (mode manuel)
router.post('/request', submitSubscriptionRequest);

// Checkout FlexPay (mode flexpay)
router.post('/checkout', checkoutSubscriptionFlexPay);
router.get('/requests/:id/verify', verifySubscriptionFlexPay);

// Get my subscription requests
router.get('/my-requests', getMySubscriptionRequests);

export default router;
