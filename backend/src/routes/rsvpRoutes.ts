import { Router } from 'express';
import {
  getGuestRsvpDetails,
  submitRsvp,
  getGuestAllInvitations,
  downloadSeatingInvitationPdf,
  getGuestQrPng,
  submitGuestDonation,
} from '../controllers/rsvpController';
import { submitGuestShare, getEventFeed, createEventComment, getPublicEventShares, toggleLikeEventPost } from '../controllers/feedController';
import { acceptGuestLegalHandler, getGuestLegalStatusHandler } from '../controllers/legalController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/:guestId/legal-status', getGuestLegalStatusHandler);
router.post('/:guestId/legal-accept', acceptGuestLegalHandler);
router.get('/:guestId/invitations', getGuestAllInvitations);
router.get('/:guestId/seating-invitation.pdf', downloadSeatingInvitationPdf);
router.get('/:guestId/qr.png', getGuestQrPng);
router.get('/:guestId', getGuestRsvpDetails);
router.post('/:guestId', submitRsvp);
router.post('/:guestId/donations', submitGuestDonation);

// Guest feed and sharing routes
router.post('/:guestId/share', submitGuestShare);
router.get('/event/:eventId/feed', optionalAuth, getEventFeed);
router.get('/event/:eventId/shares', optionalAuth, getPublicEventShares);
router.post('/feed/post/:postId/comment', optionalAuth, createEventComment);
router.post('/feed/post/:postId/like', optionalAuth, toggleLikeEventPost);

export default router;
