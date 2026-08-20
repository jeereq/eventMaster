import { Router } from 'express';
import { getEvents, createEvent, getEventById, updateEvent, deleteEvent, importRoomLayout, listEventTicketOrders } from '../controllers/eventController';
import { getEventStaff, assignEventStaff, removeEventStaff } from '../controllers/eventStaffController';
import {
  listMyEventTasks,
  listEventTasks,
  createEventTask,
  seedEventTasks,
  updateEventTask,
  deleteEventTask,
} from '../controllers/eventTaskController';
import { getGuests, createGuest, updateGuest, deleteGuest, importGuests } from '../controllers/guestController';
import {
  scanGuest,
  checkInGuest,
  verifyGuestSeat,
  addGuestProtocolNote,
  getGuestProtocolNotes,
  listProtocolGuests,
} from '../controllers/protocolController';
import { getInvitations, createInvitation, updateInvitation, deleteInvitation, sendInvitation } from '../controllers/invitationController';
import { getEventShares, getEventFeed, createEventPost, updateEventPost, deleteEventPost, deleteGuestShare, toggleLikeEventPost } from '../controllers/feedController';
import { requireAuth, requireActiveLicense } from '../middleware/auth';

const router = Router();

// Apply requireAuth and requireActiveLicense middleware to all event-related routes
router.use(requireAuth);
router.use(requireActiveLicense);

// Events CRUD
router.get('/', getEvents);
router.post('/', createEvent);
router.get('/tasks/inbox', listMyEventTasks);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.post('/:id/import-room-layout', importRoomLayout);
router.delete('/:id', deleteEvent);
router.get('/:eventId/ticket-orders', listEventTicketOrders);

// Event staff assignments
router.get('/:eventId/staff', getEventStaff);
router.post('/:eventId/staff', assignEventStaff);
router.delete('/:eventId/staff/:userId', removeEventStaff);

// Event tasks (checklist opérationnelle — distincte de EventStaff)
router.get('/:eventId/tasks', listEventTasks);
router.post('/:eventId/tasks', createEventTask);
router.post('/:eventId/tasks/seed', seedEventTasks);
router.patch('/:eventId/tasks/:taskId', updateEventTask);
router.delete('/:eventId/tasks/:taskId', deleteEventTask);

// Guests related to Events
router.get('/:eventId/guests', getGuests);
router.post('/:eventId/guests', createGuest);
router.post('/:eventId/guests/import', importGuests);
router.put('/:eventId/guests/:id', updateGuest);
router.delete('/:eventId/guests/:id', deleteGuest);

// Protocol — scan QR, confirmation de présence, siège, commentaires
router.get('/:eventId/protocol/guests', listProtocolGuests);
router.post('/:eventId/protocol/scan', scanGuest);
router.post('/:eventId/guests/:guestId/check-in', checkInGuest);
router.post('/:eventId/guests/:guestId/verify-seat', verifyGuestSeat);
router.get('/:eventId/guests/:guestId/protocol-notes', getGuestProtocolNotes);
router.post('/:eventId/guests/:guestId/protocol-notes', addGuestProtocolNote);

// Invitations related to Events
router.get('/:eventId/invitations', getInvitations);
router.post('/:eventId/invitations', createInvitation);
router.put('/:eventId/invitations/:id', updateInvitation);
router.delete('/:eventId/invitations/:id', deleteInvitation);
router.post('/:eventId/invitations/:id/send', sendInvitation);
router.post('/:eventId/invitations/:id/broadcast', sendInvitation);

// Feed & Guest Shares related to Events (Protected)
router.get('/:eventId/shares', getEventShares);
router.delete('/:eventId/shares/:shareId', deleteGuestShare);
router.get('/:eventId/feed', getEventFeed);
router.post('/:eventId/feed', createEventPost);
router.patch('/:eventId/feed/:postId', updateEventPost);
router.delete('/:eventId/feed/:postId', deleteEventPost);
router.post('/:eventId/feed/:postId/like', toggleLikeEventPost);

export default router;
