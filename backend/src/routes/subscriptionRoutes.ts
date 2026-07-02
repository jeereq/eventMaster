import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { submitSubscriptionRequest, getMySubscriptionRequests } from '../controllers/subscriptionController';

const router = Router();

router.use(requireAuth);

// Submit a new subscription request
router.post('/request', submitSubscriptionRequest);

// Get my subscription requests
router.get('/my-requests', getMySubscriptionRequests);

export default router;
