import type { PlanType, PrismaClient, TenantAccountKind } from '@prisma/client';
import { addDays, licenseKey } from './helpers';
import { seedRoomBlueprint } from './roomBlueprints';

export type OrganizerSeed = {
  tenantId: string;
  managerId: string;
  plan: PlanType;
  name: string;
  accountKind: TenantAccountKind;
};

const PLAN_LOGINS: Array<{
  email: string;
  name: string;
  orgName: string;
  plan: PlanType;
  accountKind: TenantAccountKind;
  days: number;
}> = [
  { email: 'plan.essentials@eventmaster.cd', name: 'Léa Essentials', orgName: 'Atelier Essentials', plan: 'FREE', accountKind: 'ORGANIZER', days: 21 },
  { email: 'plan.p50@eventmaster.cd', name: 'Marc Particulier 50', orgName: 'Fête privée 50', plan: 'PERSONAL_50', accountKind: 'ORGANIZER', days: 90 },
  { email: 'plan.p100@eventmaster.cd', name: 'Nadia Particulier 100', orgName: 'Fête privée 100', plan: 'PERSONAL_100', accountKind: 'ORGANIZER', days: 90 },
  { email: 'plan.p200@eventmaster.cd', name: 'Imani Particulier 200', orgName: 'Fête privée 200', plan: 'PERSONAL_200', accountKind: 'ORGANIZER', days: 90 },
  { email: 'plan.pplus@eventmaster.cd', name: 'David Particulier +200', orgName: 'Grande fête privée', plan: 'PERSONAL_PLUS', accountKind: 'ORGANIZER', days: 90 },
  { email: 'plan.business@eventmaster.cd', name: 'Sandra Business', orgName: 'Bureau Business Events', plan: 'STANDARD', accountKind: 'ORGANIZER', days: 30 },
  { email: 'plan.premium1@eventmaster.cd', name: 'Kevin Premium 1', orgName: 'Agence Premium 1', plan: 'PREMIUM_1', accountKind: 'ORGANIZER', days: 30 },
  { email: 'plan.premium2@eventmaster.cd', name: 'Flore Premium 2', orgName: 'Agence Premium 2', plan: 'PREMIUM_2', accountKind: 'ORGANIZER', days: 30 },
  { email: 'plan.ent1@eventmaster.cd', name: 'Bruno Enterprise 1', orgName: 'Enterprise One', plan: 'ENTERPRISE_1', accountKind: 'ORGANIZER', days: 365 },
  { email: 'plan.ent2@eventmaster.cd', name: 'Carine Enterprise 2', orgName: 'Enterprise Two', plan: 'ENTERPRISE_2', accountKind: 'ORGANIZER', days: 365 },
  { email: 'plan.ent3@eventmaster.cd', name: 'Serge Agenda', orgName: 'Studio Agenda', plan: 'ENTERPRISE_3', accountKind: 'ORGANIZER', days: 365 },
  { email: 'plan.salle@eventmaster.cd', name: 'Hélène Salles', orgName: 'Hôtels & Halls Démo', plan: 'VENUE', accountKind: 'VENDOR', days: 365 },
  { email: 'plan.presta@eventmaster.cd', name: 'Yann Prestataire', orgName: 'Studio Presta Démo', plan: 'SERVICE', accountKind: 'VENDOR', days: 365 },
  { email: 'plan.mixte@eventmaster.cd', name: 'Rita Mixte', orgName: 'Salle & Presta Mixte', plan: 'CATALOG', accountKind: 'BOTH', days: 365 },
];

export async function seedAccountsMatrix(
  prisma: PrismaClient,
  passwordHash: string,
  commercialId: string,
): Promise<{ organizers: OrganizerSeed[]; logins: string[]; agendaTenantId: string; protocolUserId: string | null }> {
  console.log('Matrice comptes — rôles, forfaits, types de compte…');
  const organizers: OrganizerSeed[] = [];
  const logins: string[] = [];
  let agendaTenantId = '';
  let protocolUserId: string | null = null;

  const clientTenant = await prisma.tenant.create({
    data: {
      name: 'Compte Client Marketplace',
      plan: 'FREE',
      accountKind: 'CLIENT',
      licenseActive: false,
      licenseKey: licenseKey(),
    },
  });
  await prisma.user.create({
    data: {
      email: 'client@eventmaster.cd',
      name: 'Client Marketplace',
      phone: '+243810000100',
      phoneCountryCode: '+243',
      passwordHash,
      role: 'USER',
      tenantId: clientTenant.id,
      isEmailVerified: true,
    },
  });
  logins.push('client@eventmaster.cd (CLIENT)');

  for (const row of PLAN_LOGINS) {
    const tenant = await prisma.tenant.create({
      data: {
        name: row.orgName,
        plan: row.plan,
        accountKind: row.accountKind,
        licenseActive: row.plan !== 'FREE',
        licenseExpiresAt: addDays(row.days),
        licenseKey: licenseKey(),
        referredByCommercialId: commercialId,
      },
    });
    const manager = await prisma.user.create({
      data: {
        email: row.email,
        name: row.name,
        phone: `+24381${String(3000000 + Math.abs(row.email.length * 41)).slice(0, 7)}`,
        phoneCountryCode: '+243',
        passwordHash,
        role: 'USER',
        orgRole: 'MANAGER',
        tenantId: tenant.id,
        isEmailVerified: true,
      },
    });
    await prisma.tenant.update({ where: { id: tenant.id }, data: { managerId: manager.id } });
    organizers.push({
      tenantId: tenant.id,
      managerId: manager.id,
      plan: row.plan,
      name: row.orgName,
      accountKind: row.accountKind,
    });
    logins.push(`${row.email} (${row.plan} · ${row.accountKind})`);

    if (row.plan === 'ENTERPRISE_3') {
      agendaTenantId = tenant.id;
      const protocol = await prisma.user.create({
        data: {
          email: 'protocole.agenda@eventmaster.cd',
          name: 'Protocol Studio Agenda',
          phone: '+243810000101',
          phoneCountryCode: '+243',
          passwordHash,
          role: 'USER',
          orgRole: 'PROTOCOL',
          tenantId: tenant.id,
          isEmailVerified: true,
        },
      });
      protocolUserId = protocol.id;
      const orgCommercial = await prisma.user.create({
        data: {
          email: 'org.commercial@eventmaster.cd',
          name: 'Commercial interne Agenda',
          phone: '+243810000102',
          phoneCountryCode: '+243',
          passwordHash,
          role: 'USER',
          orgRole: 'COMMERCIAL',
          tenantId: tenant.id,
          isEmailVerified: true,
          referralCode: 'EM-ORGCOM',
          commissionRate: 0.3,
          renewalCommissionRate: 0.2,
        },
      });
      logins.push('protocole.agenda@eventmaster.cd (PROTOCOL)');
      logins.push(`${orgCommercial.email} (orgRole COMMERCIAL)`);

      await Promise.all(Array.from({ length: 12 }, async (_, n) => {
        const types: Array<'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT'> = [
          'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT',
        ];
        const roomType = types[n % types.length];
        await prisma.organizationRoom.create({
          data: {
            tenantId: tenant.id,
            name: `Salle Agenda ${n + 1}`,
            description: 'Salle interne Studio Agenda avec plan 2D.',
            capacity: 80 + n * 20,
            floor: n % 2 === 0 ? 'RDC' : `Niveau ${n % 3}`,
            location: n < 8 ? 'Gombe, Kinshasa' : 'Centre-ville, Lubumbashi',
            roomType,
            layoutBlueprint: seedRoomBlueprint(roomType, 200 + n),
          },
        });
      }));
    }

    if (row.plan === 'SERVICE') {
      await prisma.vendorProfile.create({
        data: {
          tenantId: tenant.id,
          slug: 'studio-presta-demo',
          displayName: row.orgName,
          city: 'Kinshasa',
          bio: 'Compte démo Prestataire (forfait SERVICE).',
        },
      });
    }
  }

  return { organizers, logins, agendaTenantId, protocolUserId };
}
