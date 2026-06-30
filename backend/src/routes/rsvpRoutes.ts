import { Router } from 'express';
import { getGuestRsvpDetails, submitRsvp } from '../controllers/rsvpController';
import { submitGuestShare, getEventFeed, createEventComment, getPublicEventShares, toggleLikeEventPost } from '../controllers/feedController';

const router = Router();

router.get('/:guestId', getGuestRsvpDetails);
router.post('/:guestId', submitRsvp);

// Guest feed and sharing routes
router.post('/:guestId/share', submitGuestShare);
router.get('/event/:eventId/feed', getEventFeed);
router.get('/event/:eventId/shares', getPublicEventShares);
router.post('/feed/post/:postId/comment', createEventComment);
router.post('/feed/post/:postId/like', toggleLikeEventPost);

export default router;
