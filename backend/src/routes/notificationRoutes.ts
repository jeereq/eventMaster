import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listNotifications,
  readAllNotifications,
  readNotification,
} from '../controllers/notificationController';

const router = Router();

router.use(requireAuth);

router.get('/', listNotifications);
router.patch('/:id/read', readNotification);
router.post('/read-all', readAllNotifications);

export default router;
