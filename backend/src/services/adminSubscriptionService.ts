import { prisma } from '../db';
import {
  PLAN_KEYS,
  B2C_PLAN_KEYS,
  B2B_PLAN_KEYS,
  VENDOR_PLAN_KEYS,
  PAID_PLAN_KEYS,
  getPlanLimits,
  type PlanTypeKey,
  type PlanAudience,
} from '../config/plansConfig';
import { PlanType, TenantAccountKind, Role } from '@prisma/client';

export interface SubscriptionImminentItem {
  id: string;
  targetType: 'tenant' | 'user';
  name: string;
  email: string;
  phone?: string | null;
  plan: string;
  audience: PlanAudience;
  licenseActive: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  accountKind: string;
}

export interface PlanMetricRow {
  planKey: PlanTypeKey;
  name: string;
  audience: PlanAudience;
  monthlyPriceFc: number;
  totalCount: number;
  activeCount: number;
  expiredCount: number;
  estimatedMonthlyRevenueFc: number;
}

export interface AdminSubscriptionReport {
  generatedAt: string;
  kpis: {
    totalAccounts: number;
    totalPaidAccounts: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    complimentarySubscriptions: number;
    b2cUserSubscriptions: number;
    b2bOrgSubscriptions: number;
    vendorSubscriptions: number;
    estimatedMrrFc: number;
    estimatedArrFc: number;
    paidConversionRatePercent: number;
  };
  expirations: {
    in7DaysCount: number;
    in30DaysCount: number;
    in60DaysCount: number;
    imminentList: SubscriptionImminentItem[];
  };
  plansBreakdown: PlanMetricRow[];
  subscriptionsList: Array<{
    id: string;
    targetType: 'tenant' | 'user';
    name: string;
    email: string;
    phone: string | null;
    plan: string;
    audience: PlanAudience;
    status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'FREE' | 'SUSPENDED';
    licenseActive: boolean;
    licenseExpiresAt: string | null;
    billingCycle: string;
    createdAt: string;
    daysLeft: number | null;
    usersCount: number;
    eventsCount: number;
  }>;
}

function computeDaysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const diff = expiresAt.getTime() - now;
  return Math.ceil(diff / (1000 * 3600 * 24));
}

function resolveAudienceForPlan(planKey: string): PlanAudience {
  if (B2C_PLAN_KEYS.includes(planKey as any)) return 'B2C';
  if (VENDOR_PLAN_KEYS.includes(planKey as any)) return 'VENUE';
  if (B2B_PLAN_KEYS.includes(planKey as any)) return 'B2B';
  return 'B2C';
}

export async function buildAdminSubscriptionReport(): Promise<AdminSubscriptionReport> {
  const now = new Date();

  const [tenants, standaloneUsers] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        manager: {
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: {
          select: { users: true, events: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        tenantId: null,
        role: { in: ['USER', 'COMMERCIAL'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let activeCount = 0;
  let expiredCount = 0;
  let complimentaryCount = 0;
  let b2cCount = 0;
  let b2bCount = 0;
  let vendorCount = 0;
  let estimatedMrrFc = 0;

  const planMap = new Map<
    PlanTypeKey,
    { total: number; active: number; expired: number; revenueFc: number }
  >();

  for (const k of PLAN_KEYS) {
    planMap.set(k, { total: 0, active: 0, expired: 0, revenueFc: 0 });
  }

  const subscriptionsList: AdminSubscriptionReport['subscriptionsList'] = [];
  const imminentList: SubscriptionImminentItem[] = [];

  for (const t of tenants) {
    const planKey = (t.plan || 'FREE') as PlanTypeKey;
    const def = getPlanLimits(planKey);
    const audience = def?.audience || resolveAudienceForPlan(planKey);
    const daysLeft = computeDaysLeft(t.licenseExpiresAt);
    const isPaid = planKey !== 'FREE';

    const isExpired = t.licenseExpiresAt ? t.licenseExpiresAt < now : false;
    const isActive = t.licenseActive && (!t.licenseExpiresAt || !isExpired);

    let status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'FREE' | 'SUSPENDED' = 'FREE';
    if (!isPaid) {
      status = 'FREE';
    } else if (!t.licenseActive) {
      status = 'SUSPENDED';
    } else if (isExpired) {
      status = 'EXPIRED';
    } else if (!t.licenseExpiresAt) {
      status = 'ACTIVE';
      complimentaryCount += 1;
    } else {
      status = 'ACTIVE';
    }

    if (isPaid && isActive) {
      activeCount += 1;
      const effectiveMonthlyPrice = def?.promoActive && def.promoMonthlyPriceFc ? def.promoMonthlyPriceFc : (def?.monthlyPriceFc || 0);
      estimatedMrrFc += effectiveMonthlyPrice;
    } else if (isPaid && !isActive) {
      expiredCount += 1;
    }

    if (audience === 'B2C') b2cCount += 1;
    else if (audience === 'B2B') b2bCount += 1;
    else vendorCount += 1;

    // Plan counters
    const curPlan = planMap.get(planKey) || { total: 0, active: 0, expired: 0, revenueFc: 0 };
    curPlan.total += 1;
    if (isActive && isPaid) {
      curPlan.active += 1;
      const price = def?.promoActive && def.promoMonthlyPriceFc ? def.promoMonthlyPriceFc : (def?.monthlyPriceFc || 0);
      curPlan.revenueFc += price;
    } else if (isExpired && isPaid) {
      curPlan.expired += 1;
    }
    planMap.set(planKey, curPlan);

    // Imminent expirations (< 60 days)
    if (isPaid && daysLeft !== null && daysLeft <= 60 && daysLeft >= -14) {
      imminentList.push({
        id: t.id,
        targetType: 'tenant',
        name: t.name,
        email: t.manager?.email || 'N/A',
        phone: t.manager?.phone || null,
        plan: planKey,
        audience,
        licenseActive: t.licenseActive,
        expiresAt: t.licenseExpiresAt ? t.licenseExpiresAt.toISOString() : null,
        daysLeft,
        accountKind: t.accountKind,
      });
    }

    subscriptionsList.push({
      id: t.id,
      targetType: 'tenant',
      name: t.name,
      email: t.manager?.email || 'Sans gérant',
      phone: t.manager?.phone || null,
      plan: planKey,
      audience,
      status,
      licenseActive: t.licenseActive,
      licenseExpiresAt: t.licenseExpiresAt ? t.licenseExpiresAt.toISOString() : null,
      billingCycle: t.billingCycle,
      createdAt: t.createdAt.toISOString(),
      daysLeft,
      usersCount: t._count.users,
      eventsCount: t._count.events,
    });
  }

  // Include standalone users
  for (const u of standaloneUsers) {
    subscriptionsList.push({
      id: u.id,
      targetType: 'user',
      name: u.name || u.email.split('@')[0],
      email: u.email,
      phone: u.phone,
      plan: 'FREE',
      audience: 'B2C',
      status: 'FREE',
      licenseActive: true,
      licenseExpiresAt: null,
      billingCycle: 'PERIOD',
      createdAt: u.createdAt.toISOString(),
      daysLeft: null,
      usersCount: 1,
      eventsCount: 0,
    });
  }

  // Sort imminent list by days left ascending
  imminentList.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  const totalAccounts = tenants.length + standaloneUsers.length;
  const totalPaidAccounts = activeCount + expiredCount;
  const paidConversionRatePercent =
    totalAccounts > 0 ? Math.round((totalPaidAccounts / totalAccounts) * 100) : 0;

  const plansBreakdown: PlanMetricRow[] = PLAN_KEYS.map((k) => {
    const def = getPlanLimits(k);
    const data = planMap.get(k) || { total: 0, active: 0, expired: 0, revenueFc: 0 };
    return {
      planKey: k,
      name: def?.name || k,
      audience: def?.audience || resolveAudienceForPlan(k),
      monthlyPriceFc: def?.monthlyPriceFc || 0,
      totalCount: data.total,
      activeCount: data.active,
      expiredCount: data.expired,
      estimatedMonthlyRevenueFc: data.revenueFc,
    };
  });

  return {
    generatedAt: now.toISOString(),
    kpis: {
      totalAccounts,
      totalPaidAccounts,
      activeSubscriptions: activeCount,
      expiredSubscriptions: expiredCount,
      complimentarySubscriptions: complimentaryCount,
      b2cUserSubscriptions: b2cCount,
      b2bOrgSubscriptions: b2bCount,
      vendorSubscriptions: vendorCount,
      estimatedMrrFc,
      estimatedArrFc: estimatedMrrFc * 12,
      paidConversionRatePercent,
    },
    expirations: {
      in7DaysCount: imminentList.filter((i) => (i.daysLeft ?? 999) <= 7 && (i.daysLeft ?? -999) >= 0).length,
      in30DaysCount: imminentList.filter((i) => (i.daysLeft ?? 999) <= 30 && (i.daysLeft ?? -999) >= 0).length,
      in60DaysCount: imminentList.filter((i) => (i.daysLeft ?? 999) <= 60 && (i.daysLeft ?? -999) >= 0).length,
      imminentList,
    },
    plansBreakdown,
    subscriptionsList,
  };
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const s = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
  return `"${s}"`;
}

export function buildAdminSubscriptionCsv(report: AdminSubscriptionReport): string {
  const header = [
    'ID',
    'Type Cible',
    'Nom',
    'Email Responsable',
    'Téléphone',
    'Forfait',
    'Audience (B2C/B2B)',
    'Statut',
    'Licence Active',
    'Date d\'échéance',
    'Jours restants',
    'Cycle de facturation',
    'Membres',
    'Événements',
    'Date de création',
  ].map(csvEscape).join(',');

  const rows = report.subscriptionsList.map((s) => {
    return [
      csvEscape(s.id),
      csvEscape(s.targetType === 'user' ? 'Particulier' : 'Organisation'),
      csvEscape(s.name),
      csvEscape(s.email),
      csvEscape(s.phone || ''),
      csvEscape(s.plan),
      csvEscape(s.audience),
      csvEscape(s.status),
      csvEscape(s.licenseActive ? 'OUI' : 'NON'),
      csvEscape(s.licenseExpiresAt ? s.licenseExpiresAt.slice(0, 10) : 'Illimité / Sans'),
      csvEscape(s.daysLeft !== null ? s.daysLeft : ''),
      csvEscape(s.billingCycle === 'ANNUAL' ? 'Annuel' : 'Mensuel/Période'),
      s.usersCount,
      s.eventsCount,
      csvEscape(s.createdAt.slice(0, 10)),
    ].join(',');
  });

  return `\uFEFF${header}\n${rows.join('\n')}`;
}

export interface ManageSubscriptionParams {
  targetType: 'tenant' | 'user';
  targetId: string;
  plan: string;
  action: 'assign' | 'extend' | 'suspend' | 'activate' | 'complimentary';
  durationDays?: number;
  customExpiresAt?: string | null;
  accountKind?: string;
  notes?: string;
  actorId: string;
}

export async function manageSubscriptionTarget(params: ManageSubscriptionParams) {
  const { targetType, targetId, plan, action, durationDays, customExpiresAt, accountKind } = params;
  const now = new Date();

  if (targetType === 'tenant') {
    const tenant = await prisma.tenant.findUnique({ where: { id: targetId } });
    if (!tenant) throw new Error('Organisation introuvable.');

    let nextPlan = (plan as PlanType) || tenant.plan;
    let nextActive = tenant.licenseActive;
    let nextExpiry = tenant.licenseExpiresAt;

    if (action === 'suspend') {
      nextActive = false;
    } else if (action === 'activate') {
      nextActive = true;
    } else if (action === 'complimentary') {
      nextActive = true;
      nextExpiry = null; // Illimité
    } else if (action === 'extend') {
      nextActive = true;
      const days = Number(durationDays) || 30;
      const base = nextExpiry && nextExpiry > now ? nextExpiry : now;
      nextExpiry = new Date(base.getTime() + days * 24 * 3600 * 1000);
    } else if (action === 'assign') {
      nextActive = true;
      if (customExpiresAt !== undefined) {
        nextExpiry = customExpiresAt ? new Date(customExpiresAt) : null;
      } else if (durationDays) {
        nextExpiry = new Date(now.getTime() + Number(durationDays) * 24 * 3600 * 1000);
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: targetId },
      data: {
        plan: nextPlan,
        licenseActive: nextActive,
        licenseExpiresAt: nextExpiry,
        accountKind: accountKind ? (accountKind as TenantAccountKind) : undefined,
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      success: true,
      targetType: 'tenant',
      tenant: updated,
    };
  }

  if (targetType === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      include: { tenant: true },
    });
    if (!user) throw new Error('Utilisateur introuvable.');

    let tenantId = user.tenantId;

    // Si l'utilisateur n'a pas encore de tenant, on lui crée un tenant personnel
    if (!tenantId) {
      const days = Number(durationDays) || 30;
      const expiry = action === 'complimentary' ? null : new Date(now.getTime() + days * 24 * 3600 * 1000);
      const newTenant = await prisma.tenant.create({
        data: {
          name: `Compte personnel — ${user.name || user.email.split('@')[0]}`,
          plan: (plan as PlanType) || 'PERSONAL_50',
          accountKind: 'ORGANIZER',
          licenseActive: action !== 'suspend',
          licenseExpiresAt: expiry,
          managerId: user.id,
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: newTenant.id, orgRole: 'MANAGER' },
      });
      tenantId = newTenant.id;
    } else {
      // Met à jour le tenant existant
      const tenant = user.tenant;
      let nextPlan = (plan as PlanType) || tenant?.plan || 'PERSONAL_50';
      let nextActive = tenant?.licenseActive ?? true;
      let nextExpiry = tenant?.licenseExpiresAt ?? null;

      if (action === 'suspend') {
        nextActive = false;
      } else if (action === 'activate') {
        nextActive = true;
      } else if (action === 'complimentary') {
        nextActive = true;
        nextExpiry = null;
      } else if (action === 'extend') {
        nextActive = true;
        const days = Number(durationDays) || 30;
        const base = nextExpiry && nextExpiry > now ? nextExpiry : now;
        nextExpiry = new Date(base.getTime() + days * 24 * 3600 * 1000);
      } else if (action === 'assign') {
        nextActive = true;
        if (customExpiresAt !== undefined) {
          nextExpiry = customExpiresAt ? new Date(customExpiresAt) : null;
        } else if (durationDays) {
          nextExpiry = new Date(now.getTime() + Number(durationDays) * 24 * 3600 * 1000);
        }
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: nextPlan,
          licenseActive: nextActive,
          licenseExpiresAt: nextExpiry,
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: { tenant: true },
    });

    return {
      success: true,
      targetType: 'user',
      user: updatedUser,
    };
  }

  throw new Error('Type de cible invalide (doit être tenant ou user).');
}
