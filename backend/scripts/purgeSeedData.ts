import 'dotenv/config';
import { prisma } from '../src/db';

async function main() {
  console.log('=== EventMaster — Nettoyage de la base de données ===\n');

  // 1. Vérification des comptes administrateurs à préserver
  const adminUsers = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, name: true, role: true },
  });

  if (adminUsers.length === 0) {
    throw new Error('ERREUR CRITIQUE : Aucun compte SUPER_ADMIN trouvé ! Opération annulée.');
  }

  console.log(`Comptes administrateurs identifiés à CONSERVER (${adminUsers.length}) :`);
  for (const admin of adminUsers) {
    console.log(`  ✓ [${admin.role}] ${admin.email} (${admin.name || 'Sans nom'}) - ID: ${admin.id}`);
  }

  const adminIds = adminUsers.map((a) => a.id);

  // Sécuriser les comptes admin en détachant tout tenant éventuel
  await prisma.user.updateMany({
    where: { id: { in: adminIds } },
    data: { tenantId: null },
  });

  console.log('\nSuppression en cours des données générées par le seed...');

  // 2. Suppression des tables enfants et associées
  const deletedDelivery = await prisma.notificationDelivery.deleteMany({});
  console.log(`- NotificationDelivery supprimés : ${deletedDelivery.count}`);

  const deletedNotifs = await prisma.platformNotification.deleteMany({});
  console.log(`- PlatformNotification supprimés : ${deletedNotifs.count}`);

  const deletedPrefs = await prisma.notificationPreference.deleteMany({});
  console.log(`- NotificationPreference supprimés : ${deletedPrefs.count}`);

  const deletedTokens = await prisma.pushDeviceToken.deleteMany({});
  console.log(`- PushDeviceToken supprimés : ${deletedTokens.count}`);

  const deletedFavs = await prisma.listingFavorite.deleteMany({});
  console.log(`- ListingFavorite supprimés : ${deletedFavs.count}`);

  const deletedPacks = await prisma.savedEventPack.deleteMany({});
  console.log(`- SavedEventPack supprimés : ${deletedPacks.count}`);

  const deletedBriefs = await prisma.savedEventBrief.deleteMany({});
  console.log(`- SavedEventBrief supprimés : ${deletedBriefs.count}`);

  const deletedSavedAmbiences = await prisma.savedRoomAmbience.deleteMany({});
  console.log(`- SavedRoomAmbience supprimés : ${deletedSavedAmbiences.count}`);

  const deletedOrgAmbiences = await prisma.orgRoomAmbience.deleteMany({});
  console.log(`- OrgRoomAmbience supprimés : ${deletedOrgAmbiences.count}`);

  const deletedAiRuns = await prisma.aiSimulationRun.deleteMany({});
  console.log(`- AiSimulationRun supprimés : ${deletedAiRuns.count}`);

  const deletedAiTplRuns = await prisma.aiTemplateComposeRun.deleteMany({});
  console.log(`- AiTemplateComposeRun supprimés : ${deletedAiTplRuns.count}`);

  const deletedAiRoomRuns = await prisma.aiRoomPlanComposeRun.deleteMany({});
  console.log(`- AiRoomPlanComposeRun supprimés : ${deletedAiRoomRuns.count}`);

  const deletedLedgers = await prisma.aiTokenLedger.deleteMany({});
  console.log(`- AiTokenLedger supprimés : ${deletedLedgers.count}`);

  const deletedTokenOrders = await prisma.aiTokenOrder.deleteMany({});
  console.log(`- AiTokenOrder supprimés : ${deletedTokenOrders.count}`);

  const deletedWallets = await prisma.aiSimulationWallet.deleteMany({});
  console.log(`- AiSimulationWallet supprimés : ${deletedWallets.count}`);

  const deletedPaymentTraces = await prisma.paymentTrace.deleteMany({});
  console.log(`- PaymentTrace supprimés : ${deletedPaymentTraces.count}`);

  const deletedPayouts = await prisma.commercialPayoutTransfer.deleteMany({});
  console.log(`- CommercialPayoutTransfer supprimés : ${deletedPayouts.count}`);

  const deletedCommissions = await prisma.commercialCommission.deleteMany({});
  console.log(`- CommercialCommission supprimés : ${deletedCommissions.count}`);

  const deletedInvoices = await prisma.platformInvoice.deleteMany({});
  console.log(`- PlatformInvoice supprimés : ${deletedInvoices.count}`);

  const deletedSubRequests = await prisma.subscriptionRequest.deleteMany({});
  console.log(`- SubscriptionRequest supprimés : ${deletedSubRequests.count}`);

  const deletedLegal = await prisma.legalAcceptance.deleteMany({});
  console.log(`- LegalAcceptance supprimés : ${deletedLegal.count}`);

  const deletedProtocolNotes = await prisma.guestProtocolNote.deleteMany({});
  console.log(`- GuestProtocolNote supprimés : ${deletedProtocolNotes.count}`);

  const deletedEventComments = await prisma.eventComment.deleteMany({});
  console.log(`- EventComment supprimés : ${deletedEventComments.count}`);

  const deletedEventPosts = await prisma.eventPost.deleteMany({});
  console.log(`- EventPost supprimés : ${deletedEventPosts.count}`);

  const deletedGuestShares = await prisma.guestShare.deleteMany({});
  console.log(`- GuestShare supprimés : ${deletedGuestShares.count}`);

  const deletedEventTasks = await prisma.eventTask.deleteMany({});
  console.log(`- EventTask supprimés : ${deletedEventTasks.count}`);

  const deletedEventStaff = await prisma.eventStaff.deleteMany({});
  console.log(`- EventStaff supprimés : ${deletedEventStaff.count}`);

  const deletedRoomStaff = await prisma.roomStaff.deleteMany({});
  console.log(`- RoomStaff supprimés : ${deletedRoomStaff.count}`);

  const deletedInvitations = await prisma.invitation.deleteMany({});
  console.log(`- Invitation supprimés : ${deletedInvitations.count}`);

  const deletedGuests = await prisma.guest.deleteMany({});
  console.log(`- Guest supprimés : ${deletedGuests.count}`);

  const deletedSeatHolds = await prisma.seatHold.deleteMany({});
  console.log(`- SeatHold supprimés : ${deletedSeatHolds.count}`);

  const deletedTicketOrders = await prisma.ticketOrder.deleteMany({});
  console.log(`- TicketOrder supprimés : ${deletedTicketOrders.count}`);

  const deletedEvents = await prisma.event.deleteMany({});
  console.log(`- Event supprimés : ${deletedEvents.count}`);

  const deletedAuditLogs = await prisma.adminAuditLog.deleteMany({});
  console.log(`- AdminAuditLog supprimés : ${deletedAuditLogs.count}`);

  const deletedMarketplaceComments = await prisma.marketplaceComment.deleteMany({});
  console.log(`- MarketplaceComment supprimés : ${deletedMarketplaceComments.count}`);

  const deletedMarketplacePosts = await prisma.marketplacePost.deleteMany({});
  console.log(`- MarketplacePost supprimés : ${deletedMarketplacePosts.count}`);

  const deletedMarketplaceBookings = await prisma.marketplaceBooking.deleteMany({});
  console.log(`- MarketplaceBooking supprimés : ${deletedMarketplaceBookings.count}`);

  const deletedInquiryMessages = await prisma.marketplaceInquiryMessage.deleteMany({});
  console.log(`- MarketplaceInquiryMessage supprimés : ${deletedInquiryMessages.count}`);

  const deletedInquiries = await prisma.marketplaceInquiry.deleteMany({});
  console.log(`- MarketplaceInquiry supprimés : ${deletedInquiries.count}`);

  const deletedServices = await prisma.serviceOffering.deleteMany({});
  console.log(`- ServiceOffering supprimés : ${deletedServices.count}`);

  const deletedVendors = await prisma.vendorProfile.deleteMany({});
  console.log(`- VendorProfile supprimés : ${deletedVendors.count}`);

  const deletedVenues = await prisma.venueListing.deleteMany({});
  console.log(`- VenueListing supprimés : ${deletedVenues.count}`);

  const deletedOrgRooms = await prisma.organizationRoom.deleteMany({});
  console.log(`- OrganizationRoom supprimés : ${deletedOrgRooms.count}`);

  // Supprimer uniquement les templates liés à des organisations/tenants s'il y en a, conserver les templates vitrine globaux (tenantId === null)
  const deletedTenantTemplates = await prisma.template.deleteMany({
    where: { tenantId: { not: null } },
  });
  console.log(`- Modèles de tenant supprimés (les modèles vitrine globaux sont conservés) : ${deletedTenantTemplates.count}`);

  // 3. Déconnexion des relations de clé étrangère sur les Tenants
  await prisma.tenant.updateMany({
    data: {
      managerId: null,
      referredByCommercialId: null,
      referredByOrgUserId: null,
    },
  });

  // 4. Suppression de tous les utilisateurs non administrateurs
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: { not: 'SUPER_ADMIN' },
    },
  });
  console.log(`- Utilisateurs non-admin supprimés : ${deletedUsers.count}`);

  // 5. Suppression de toutes les organisations (tenants)
  const deletedTenants = await prisma.tenant.deleteMany({});
  console.log(`- Organisations (tenants) supprimées : ${deletedTenants.count}`);

  // 6. Vérification finale
  console.log('\n=== VÉRIFICATION FINALE DE L’ÉTAT DE LA BD ===');
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });

  console.log(`Utilisateurs restants (${remainingUsers.length}) :`);
  for (const u of remainingUsers) {
    console.log(`  ✓ [${u.role}] ${u.email} (${u.name || 'Sans nom'})`);
  }

  const finalCounts: Record<string, number> = {
    'users (admin)': await prisma.user.count(),
    tenants: await prisma.tenant.count(),
    events: await prisma.event.count(),
    guests: await prisma.guest.count(),
    venueListings: await prisma.venueListing.count(),
    vendorProfiles: await prisma.vendorProfile.count(),
    serviceOfferings: await prisma.serviceOffering.count(),
    marketplaceBookings: await prisma.marketplaceBooking.count(),
    marketplaceInquiries: await prisma.marketplaceInquiry.count(),
    ticketOrders: await prisma.ticketOrder.count(),
    organizationRooms: await prisma.organizationRoom.count(),
    'subscriptionPlans (catalog)': await prisma.subscriptionPlan.count(),
    'templates (global showcase)': await prisma.template.count(),
    'guestMessageTemplates (system)': await prisma.guestMessageTemplate.count(),
    'platformConfig (settings)': await prisma.platformConfig.count(),
  };

  console.table(finalCounts);
  console.log('\n✓ Nettoyage terminé avec succès.');
}

main()
  .catch((e) => {
    console.error('Erreur lors du nettoyage :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
