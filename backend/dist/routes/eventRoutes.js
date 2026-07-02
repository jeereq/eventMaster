"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const eventStaffController_1 = require("../controllers/eventStaffController");
const guestController_1 = require("../controllers/guestController");
const invitationController_1 = require("../controllers/invitationController");
const feedController_1 = require("../controllers/feedController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply requireAuth and requireActiveLicense middleware to all event-related routes
router.use(auth_1.requireAuth);
router.use(auth_1.requireActiveLicense);
// Events CRUD
router.get('/', eventController_1.getEvents);
router.post('/', eventController_1.createEvent);
router.get('/:id', eventController_1.getEventById);
router.put('/:id', eventController_1.updateEvent);
router.delete('/:id', eventController_1.deleteEvent);
// Event staff assignments
router.get('/:eventId/staff', eventStaffController_1.getEventStaff);
router.post('/:eventId/staff', eventStaffController_1.assignEventStaff);
router.delete('/:eventId/staff/:userId', eventStaffController_1.removeEventStaff);
// Guests related to Events
router.get('/:eventId/guests', guestController_1.getGuests);
router.post('/:eventId/guests', guestController_1.createGuest);
router.post('/:eventId/guests/import', guestController_1.importGuests);
router.put('/:eventId/guests/:id', guestController_1.updateGuest);
router.delete('/:eventId/guests/:id', guestController_1.deleteGuest);
// Invitations related to Events
router.get('/:eventId/invitations', invitationController_1.getInvitations);
router.post('/:eventId/invitations', invitationController_1.createInvitation);
router.put('/:eventId/invitations/:id', invitationController_1.updateInvitation);
router.delete('/:eventId/invitations/:id', invitationController_1.deleteInvitation);
router.post('/:eventId/invitations/:id/send', invitationController_1.sendInvitation);
router.post('/:eventId/invitations/:id/broadcast', invitationController_1.sendInvitation);
// Feed & Guest Shares related to Events (Protected)
router.get('/:eventId/shares', feedController_1.getEventShares);
router.delete('/:eventId/shares/:shareId', feedController_1.deleteGuestShare);
router.get('/:eventId/feed', feedController_1.getEventFeed);
router.post('/:eventId/feed', feedController_1.createEventPost);
router.delete('/:eventId/feed/:postId', feedController_1.deleteEventPost);
router.post('/:eventId/feed/:postId/like', feedController_1.toggleLikeEventPost);
exports.default = router;
