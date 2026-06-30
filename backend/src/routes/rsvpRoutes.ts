import { Router } from 'express';
import { getGuestRsvpDetails, submitRsvp } from '../controllers/rsvpController';
import { submitGuestShare, getEventFeed, createEventComment } from '../controllers/feedController';

const router = Router();

router.get('/:guestId', getGuestRsvpDetails);
router.post('/:guestId', submitRsvp);

// Guest feed and sharing routes
router.post('/:guestId/share', submitGuestShare);
router.get('/event/:eventId/feed', getEventFeed);
router.post('/feed/post/:postId/comment', createEventComment);

export default router;
