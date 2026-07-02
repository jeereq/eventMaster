import { Router } from 'express';
import { getGuestRsvpDetails, submitRsvp, getGuestAllInvitations } from '../controllers/rsvpController';
import { submitGuestShare, getEventFeed, createEventComment, getPublicEventShares, toggleLikeEventPost } from '../controllers/feedController';
import { acceptGuestLegalHandler, getGuestLegalStatusHandler } from '../controllers/legalController';

const router = Router();

router.get('/:guestId/legal-status', getGuestLegalStatusHandler);
router.post('/:guestId/legal-accept', acceptGuestLegalHandler);
router.get('/:guestId/invitations', getGuestAllInvitations);
router.get('/:guestId', getGuestRsvpDetails);
router.post('/:guestId', submitRsvp);

// Guest feed and sharing routes
router.post('/:guestId/share', submitGuestShare);
router.get('/event/:eventId/feed', getEventFeed);
router.get('/event/:eventId/shares', getPublicEventShares);
router.post('/feed/post/:postId/comment', createEventComment);
router.post('/feed/post/:postId/like', toggleLikeEventPost);

export default router;
