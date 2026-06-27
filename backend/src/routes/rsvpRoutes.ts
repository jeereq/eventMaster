import { Router } from 'express';
import { getGuestRsvpDetails, submitRsvp } from '../controllers/rsvpController';

const router = Router();

router.get('/:guestId', getGuestRsvpDetails);
router.post('/:guestId', submitRsvp);

export default router;
