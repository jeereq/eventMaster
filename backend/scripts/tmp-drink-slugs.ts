import { prisma } from '../src/db';

async function main() {
  const rows = await prisma.vendorBeveragePrice.findMany({
    include: {
      tenant: { include: { vendorProfile: true } },
      brand: { select: { name: true } },
    },
  });
  for (const row of rows) {
    const profile = row.tenant.vendorProfile;
    console.log(JSON.stringify({
      priceId: row.id,
      brand: row.brand.name,
      tenantId: row.tenantId,
      tenantName: row.tenant.name,
      profile: profile
        ? { slug: profile.slug, displayName: profile.displayName, blocked: profile.isBlockedByAdmin }
        : null,
    }));
  }
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
