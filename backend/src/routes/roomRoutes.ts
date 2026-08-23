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
import {
  listSavedAmbiences,
  createSavedAmbience,
  syncSavedAmbiences,
  deleteSavedAmbience,
} from '../controllers/roomAmbienceController';
import { upsertRoomListing } from '../controllers/marketplaceController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getRooms);
router.get('/ambiences', listSavedAmbiences);
router.post('/ambiences/sync', syncSavedAmbiences);
router.post('/ambiences', createSavedAmbience);
router.delete('/ambiences/:ambienceId', deleteSavedAmbience);
router.post('/preview-layout', previewRoomLayout);
router.post('/', createRoom);
router.put('/:roomId', updateRoom);
router.delete('/:roomId', deleteRoom);
router.post('/:roomId/staff', assignRoomStaff);
router.delete('/:roomId/staff/:userId', removeRoomStaff);
router.put('/:roomId/listing', upsertRoomListing);

export default router;
