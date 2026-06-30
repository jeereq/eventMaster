"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rsvpController_1 = require("../controllers/rsvpController");
const feedController_1 = require("../controllers/feedController");
const router = (0, express_1.Router)();
router.get('/:guestId', rsvpController_1.getGuestRsvpDetails);
router.post('/:guestId', rsvpController_1.submitRsvp);
// Guest feed and sharing routes
router.post('/:guestId/share', feedController_1.submitGuestShare);
router.get('/event/:eventId/feed', feedController_1.getEventFeed);
router.get('/event/:eventId/shares', feedController_1.getPublicEventShares);
router.post('/feed/post/:postId/comment', feedController_1.createEventComment);
router.post('/feed/post/:postId/like', feedController_1.toggleLikeEventPost);
exports.default = router;
