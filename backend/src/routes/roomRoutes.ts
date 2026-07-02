import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  assignRoomStaff,
  removeRoomStaff,
  previewRoomLayout,
} from '../controllers/roomController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getRooms);
router.post('/preview-layout', previewRoomLayout);
router.post('/', createRoom);
router.put('/:roomId', updateRoom);
router.delete('/:roomId', deleteRoom);
router.post('/:roomId/staff', assignRoomStaff);
router.delete('/:roomId/staff/:userId', removeRoomStaff);

export default router;
