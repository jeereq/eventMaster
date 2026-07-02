import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { submitSubscriptionRequest, getMySubscriptionRequests, getSubscriptionPlans } from '../controllers/subscriptionController';

const router = Router();

router.use(requireAuth);

// Get subscription plans
router.get('/plans', getSubscriptionPlans);

// Submit a new subscription request
router.post('/request', submitSubscriptionRequest);

// Get my subscription requests
router.get('/my-requests', getMySubscriptionRequests);

export default router;
