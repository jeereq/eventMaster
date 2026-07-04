import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listNotifications,
  readAllNotifications,
  readNotification,
  registerPushToken,
  unregisterPushToken,
} from '../controllers/notificationController';

const router = Router();

router.use(requireAuth);

router.get('/', listNotifications);
router.post('/push-token', registerPushToken);
router.delete('/push-token', unregisterPushToken);
router.patch('/:id/read', readNotification);
router.post('/read-all', readAllNotifications);

export default router;
