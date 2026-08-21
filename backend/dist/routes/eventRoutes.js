"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const eventStaffController_1 = require("../controllers/eventStaffController");
const eventTaskController_1 = require("../controllers/eventTaskController");
const eventStatsController_1 = require("../controllers/eventStatsController");
const guestController_1 = require("../controllers/guestController");
const protocolController_1 = require("../controllers/protocolController");
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
router.get('/tasks/inbox', eventTaskController_1.listMyEventTasks);
router.get('/workspace-stats', eventStatsController_1.getWorkspaceStats);
router.get('/:id', eventController_1.getEventById);
router.put('/:id', eventController_1.updateEvent);
router.post('/:id/import-room-layout', eventController_1.importRoomLayout);
router.delete('/:id', eventController_1.deleteEvent);
router.get('/:eventId/ticket-orders', eventController_1.listEventTicketOrders);
// Event staff assignments
router.get('/:eventId/staff', eventStaffController_1.getEventStaff);
router.post('/:eventId/staff', eventStaffController_1.assignEventStaff);
router.delete('/:eventId/staff/:userId', eventStaffController_1.removeEventStaff);
// Event tasks (checklist opérationnelle — distincte de EventStaff)
router.get('/:eventId/tasks', eventTaskController_1.listEventTasks);
router.post('/:eventId/tasks', eventTaskController_1.createEventTask);
router.post('/:eventId/tasks/seed', eventTaskController_1.seedEventTasks);
router.patch('/:eventId/tasks/:taskId', eventTaskController_1.updateEventTask);
router.delete('/:eventId/tasks/:taskId', eventTaskController_1.deleteEventTask);
// Guests related to Events
router.get('/:eventId/guests', guestController_1.getGuests);
router.post('/:eventId/guests', guestController_1.createGuest);
router.post('/:eventId/guests/import', guestController_1.importGuests);
router.put('/:eventId/guests/:id', guestController_1.updateGuest);
router.delete('/:eventId/guests/:id', guestController_1.deleteGuest);
// Protocol — scan QR, confirmation de présence, siège, commentaires
router.get('/:eventId/protocol/guests', protocolController_1.listProtocolGuests);
router.post('/:eventId/protocol/scan', protocolController_1.scanGuest);
router.post('/:eventId/guests/:guestId/check-in', protocolController_1.checkInGuest);
router.post('/:eventId/guests/:guestId/verify-seat', protocolController_1.verifyGuestSeat);
router.get('/:eventId/guests/:guestId/protocol-notes', protocolController_1.getGuestProtocolNotes);
router.post('/:eventId/guests/:guestId/protocol-notes', protocolController_1.addGuestProtocolNote);
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
router.patch('/:eventId/feed/:postId', feedController_1.updateEventPost);
router.delete('/:eventId/feed/:postId', feedController_1.deleteEventPost);
router.post('/:eventId/feed/:postId/like', feedController_1.toggleLikeEventPost);
exports.default = router;
