import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import {
  listMyServices,
  upsertService,
  deleteService,
  listMyInquiries,
  updateInquiryStatus,
} from '../controllers/marketplaceController';
import {
  createBooking,
  listBookings,
  updateBooking,
  convertInquiryToBooking,
} from '../controllers/marketplaceBookingController';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  planEvent,
  listSavedPacks,
  createSavedPack,
  deleteSavedPack,
  listSavedBriefs,
  createSavedBrief,
  deleteSavedBrief,
  listMyTickets,
} from '../controllers/marketplaceClientController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/services', listMyServices);
router.post('/services', upsertService);
router.put('/services/:id', upsertService);
router.delete('/services/:id', deleteService);
router.get('/inquiries', listMyInquiries);
router.patch('/inquiries/:id', updateInquiryStatus);
router.post('/inquiries/:id/book', convertInquiryToBooking);
router.get('/bookings', listBookings);
router.post('/bookings', createBooking);
router.patch('/bookings/:id', updateBooking);
router.get('/favorites', listFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites/:kind/:slug', removeFavorite);
router.post('/event-plan', planEvent);
router.get('/event-packs', listSavedPacks);
router.post('/event-packs', createSavedPack);
router.delete('/event-packs/:id', deleteSavedPack);
router.get('/event-briefs', listSavedBriefs);
router.post('/event-briefs', createSavedBrief);
router.delete('/event-briefs/:id', deleteSavedBrief);
router.get('/my-tickets', listMyTickets);

export default router;
