import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import {
  listMyServices,
  upsertService,
  deleteService,
  listMyInquiries,
  updateInquiryStatus,
  listInquiryMessages,
  postInquiryMessage,
  closeInquiryThread,
  saveVendorOnboarding,
} from '../controllers/marketplaceController';
import {
  createBooking,
  listBookings,
  updateBooking,
  convertInquiryToBooking,
  acceptInquiryQuote,
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
  updateMarketplaceFeedPost,
  toggleMarketplaceFeedLike,
  createMarketplaceFeedComment,
  listFeedTargets,
  createLinkedFeedPost,
  listMyFeedPosts,
} from '../controllers/marketplaceFeedController';
import {
  getMyBeverageCatalog,
  putMyBeveragePrices,
} from '../controllers/beverageBrandController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/beverage-catalog', getMyBeverageCatalog);
router.put('/beverage-prices', putMyBeveragePrices);
router.get('/services', listMyServices);
router.post('/services', upsertService);
router.post('/onboarding', saveVendorOnboarding);
router.put('/services/:id', upsertService);
router.delete('/services/:id', deleteService);
router.get('/inquiries', listMyInquiries);
router.get('/inquiries/:id/messages', listInquiryMessages);
router.post('/inquiries/:id/messages', postInquiryMessage);
router.post('/inquiries/:id/close', closeInquiryThread);
router.patch('/inquiries/:id', updateInquiryStatus);
router.post('/inquiries/:id/book', convertInquiryToBooking);
router.post('/inquiries/:id/accept', acceptInquiryQuote);
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
router.get('/feed/targets', listFeedTargets);
router.get('/feed/mine', listMyFeedPosts);
router.post('/feed', createLinkedFeedPost);
router.patch('/feed/:postId', updateMarketplaceFeedPost);
router.delete('/feed/:postId', deleteMarketplaceFeedPost);
router.post('/feed/:postId/like', toggleMarketplaceFeedLike);
router.post('/feed/:postId/comments', createMarketplaceFeedComment);

export default router;
