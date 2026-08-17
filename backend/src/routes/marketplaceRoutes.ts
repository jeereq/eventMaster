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

export default router;
