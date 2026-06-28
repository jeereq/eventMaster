import { Router } from 'express';
import { getEvents, createEvent, getEventById, updateEvent, deleteEvent } from '../controllers/eventController';
import { getGuests, createGuest, updateGuest, deleteGuest, importGuests } from '../controllers/guestController';
import { getInvitations, createInvitation, updateInvitation, deleteInvitation, sendInvitation } from '../controllers/invitationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply requireAuth middleware to all event-related routes
router.use(requireAuth);

// Events CRUD
router.get('/', getEvents);
router.post('/', createEvent);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Guests related to Events
router.get('/:eventId/guests', getGuests);
router.post('/:eventId/guests', createGuest);
router.post('/:eventId/guests/import', importGuests);
router.put('/:eventId/guests/:id', updateGuest);
router.delete('/:eventId/guests/:id', deleteGuest);

// Invitations related to Events
router.get('/:eventId/invitations', getInvitations);
router.post('/:eventId/invitations', createInvitation);
router.put('/:eventId/invitations/:id', updateInvitation);
router.delete('/:eventId/invitations/:id', deleteInvitation);
router.post('/:eventId/invitations/:id/send', sendInvitation);
router.post('/:eventId/invitations/:id/broadcast', sendInvitation);

export default router;
