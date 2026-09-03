import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import {
  listMyServices,
  upsertService,
  deleteService,
  listMyInquiries,
  updateInquiryStatus,
  saveVendorOnboarding,
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
  planEventAi,
  checkoutAiTokens,
  verifyAiTokensOrder,
  listSavedPacks,
  createSavedPack,
  deleteSavedPack,
  listSavedBriefs,
  createSavedBrief,
  deleteSavedBrief,
  listMyTickets,
  getListingRelation,
  listPublicAiSimulations,
} from '../controllers/marketplaceClientController';
import {
  listVenueFeedOwner,
  createVenueFeedPost,
  listVendorFeedOwner,
  createVendorFeedPost,
  deleteMarketplaceFeedPost,
  toggleMarketplaceFeedLike,
  createMarketplaceFeedComment,
} from '../controllers/marketplaceFeedController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/services', listMyServices);
router.post('/services', upsertService);
router.post('/onboarding', saveVendorOnboarding);
router.put('/services/:id', upsertService);
router.delete('/services/:id', deleteService);
router.get('/inquiries', listMyInquiries);
router.patch('/inquiries/:id', updateInquiryStatus);
router.post('/inquiries/:id/book', convertInquiryToBooking);
router.get('/bookings', listBookings);
router.post('/bookings', createBooking);
router.patch('/bookings/:id', updateBooking);
router.get('/listing-relation', getListingRelation);
router.get('/favorites', listFavorites);
router.post('/favorites', addFavorite);
router.delete('/favorites/:kind/:slug', removeFavorite);
router.post('/event-plan', planEvent);
router.post('/event-plan-ai', planEventAi);
router.get('/ai-simulations', listPublicAiSimulations);
router.post('/ai-tokens/checkout', checkoutAiTokens);
router.get('/ai-tokens/orders/:orderId/verify', verifyAiTokensOrder);
router.get('/event-packs', listSavedPacks);
router.post('/event-packs', createSavedPack);
router.delete('/event-packs/:id', deleteSavedPack);
router.get('/event-briefs', listSavedBriefs);
router.post('/event-briefs', createSavedBrief);
router.delete('/event-briefs/:id', deleteSavedBrief);
router.get('/my-tickets', listMyTickets);

router.get('/venues/:listingId/feed', listVenueFeedOwner);
router.post('/venues/:listingId/feed', createVenueFeedPost);
router.get('/vendors/me/feed', listVendorFeedOwner);
router.post('/vendors/me/feed', createVendorFeedPost);
router.delete('/feed/:postId', deleteMarketplaceFeedPost);
router.post('/feed/:postId/like', toggleMarketplaceFeedLike);
router.post('/feed/:postId/comments', createMarketplaceFeedComment);

export default router;
