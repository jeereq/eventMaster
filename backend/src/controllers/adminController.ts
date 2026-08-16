import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { PlanType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getDefaultPlans, getPlansConfiguration } from '../config/plansConfig';
import {
  loadSubscriptionPlansFromDb,
  saveSubscriptionPlansToDb,
} from '../services/subscriptionPlanCatalogService';
import { ensureCommercialReferralCode, normalizeCommissionRate } from '../services/commercialService';
import { isPlatformStaff } from '../middleware/platformAccess';
import {
  assertCommercialOwnsTenant,
  commercialReferredTenantFilter,
  isPlatformCommercial,
} from '../services/platformCommercialScope';
import { formatInvoiceForApi } from '../services/invoiceService';
import {
  computeExtendedExpiry,
  issueTenantPlanInvoice,
  resolveBillingAction,
  type TenantBillingAction,
} from '../services/tenantBillingService';
import { PAID_PLAN_KEYS } from '../config/plansConfig';

// Get global system statistics and list of all tenants (Super Admin only)
export async function getSystemStats(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const commercialId = isPlatformCommercial(req.user?.role) ? req.user?.id : undefined;
    const tenantWhere = commercialId ? commercialReferredTenantFilter(commercialId) : {};

    const [tenantCount, userCount, eventCount, guestCount] = await Promise.all([
      prisma.tenant.count({ where: tenantWhere }),
      commercialId
        ? prisma.user.count({ where: { tenant: tenantWhere } })
        : prisma.user.count(),
      commercialId
        ? prisma.event.count({ where: { tenant: tenantWhere } })
        : prisma.event.count(),
      commercialId
        ? prisma.guest.count({ where: { event: { tenant: tenantWhere } } })
        : prisma.guest.count(),
    ]);

    const tenants = await prisma.tenant.findMany({
      where: tenantWhere,
      include: {
        manager: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            events: true,
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      stats: {
        tenants: tenantCount,
        users: userCount,
        events: eventCount,
        guests: guestCount,
      },
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        licenseActive: t.licenseActive,
        licenseExpiresAt: t.licenseExpiresAt,
        licenseKey: t.licenseKey,
        createdAt: t.createdAt,
        managerName: t.manager?.name || 'Aucun',
        managerEmail: t.manager?.email || 'Aucun',
        eventsCount: t._count.events,
        usersCount: t._count.users,
      })),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des stats admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales' });
  }
}

const SUBSCRIPTION_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
};

export async function getTenantSubscriptionHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const tenantId = req.params.id as string;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        licenseActive: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Organisation non trouvée.' });
    }

    if (isPlatformCommercial(req.user?.role) && req.user?.id) {
      const owns = await assertCommercialOwnsTenant(req.user.id, tenantId);
      if (!owns) {
        return res.status(403).json({ error: 'Accès réservé aux organisations que vous avez parrainées.' });
      }
    }

    const [requests, invoices] = await Promise.all([
      prisma.subscriptionRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          platformInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              plan: true,
              amount: true,
              currency: true,
              status: true,
              type: true,
              billingPeriod: true,
              periodStart: true,
              periodEnd: true,
              durationDays: true,
              sentAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.platformInvoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const requestEntries = requests.map((r) => ({
      id: r.id,
      kind: 'REQUEST' as const,
      date: r.createdAt,
      plan: r.requestedPlan,
      durationDays: r.durationDays,
      status: r.status,
      statusLabel: SUBSCRIPTION_REQUEST_STATUS_LABELS[r.status] || r.status,
      proofOfPayment: r.proofOfPayment,
      processedAt: r.status !== 'PENDING' ? r.updatedAt : null,
      invoice: r.platformInvoice
        ? formatInvoiceForApi({ ...r.platformInvoice, tenant: { name: tenant.name } })
        : null,
    }));

    const linkedInvoiceIds = new Set(
      requests.map((r) => r.platformInvoice?.id).filter(Boolean),
    );

    const invoiceEntries = invoices
      .filter((inv) => !linkedInvoiceIds.has(inv.id))
      .map((inv) => ({
        id: inv.id,
        kind: 'INVOICE' as const,
        date: inv.createdAt,
        plan: inv.plan,
        durationDays: inv.durationDays,
        invoice: formatInvoiceForApi({ ...inv, tenant: { name: tenant.name } }),
      }));

    const history = [...requestEntries, ...invoiceEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return res.json({
      tenant,
      history,
      requestsCount: requests.length,
      invoicesCount: invoices.length,
    });
  } catch (error: any) {
    console.error('Erreur getTenantSubscriptionHistory:', error);
    return res.status(500).json({ error: 'Impossible de charger l\'historique des abonnements.' });
  }
}

export async function getAdminInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const { period, tenantId } = req.query;
    const commercialId = isPlatformCommercial(req.user?.role) ? req.user?.id : undefined;
    if (commercialId && typeof tenantId === 'string' && tenantId.trim()) {
      const owns = await assertCommercialOwnsTenant(commercialId, tenantId.trim());
      if (!owns) {
        return res.status(403).json({ error: 'Accès réservé aux organisations que vous avez parrainées.' });
      }
    }

    const where: { billingPeriod?: string; tenantId?: string; tenant?: { referredByCommercialId: string } } = {};

    if (typeof period === 'string' && period.trim()) {
      where.billingPeriod = period.trim();
    }
    if (typeof tenantId === 'string' && tenantId.trim()) {
      where.tenantId = tenantId.trim();
    } else if (commercialId) {
      where.tenant = commercialReferredTenantFilter(commercialId);
    }

    const invoices = await prisma.platformInvoice.findMany({
      where,
      include: {
        tenant: { select: { name: true } },
        commercialCommissions: {
          include: {
            commercial: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.json({
      invoices: invoices.map(formatInvoiceForApi),
    });
  } catch (error: any) {
    console.error('Erreur getAdminInvoices:', error);
    return res.status(500).json({ error: 'Impossible de charger les factures.' });
  }
}

// Create a new tenant (SaaS organization)
export async function createTenant(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const { name, plan, licenseActive, licenseExpiresAt, licenseKey } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de l\'organisation est requis.' });
    }

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        plan: (plan as PlanType) || 'FREE',
        licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : true,
        licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
        licenseKey: licenseKey || null,
        referredByCommercialId:
          req.user?.role === 'COMMERCIAL' ? req.user.id : null,
      },
    });

    return res.status(201).json({ message: 'Organisation créée avec succès', tenant: newTenant });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'organisation:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'organisation' });
  }
}

// Update tenant plan and license details
export async function updateTenantPlanOrLicense(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const {
      name,
      plan,
      licenseActive,
      licenseExpiresAt,
      licenseKey,
      billing,
    } = req.body;

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Organisation introuvable.' });
    }

    const newPlan = (plan as PlanType) ?? existing.plan;
    let nextExpiry = licenseExpiresAt !== undefined
      ? licenseExpiresAt
        ? new Date(licenseExpiresAt)
        : null
      : existing.licenseExpiresAt;

    const billingPayload = billing as {
      issueInvoice?: boolean;
      action?: TenantBillingAction;
      durationDays?: number;
      extendLicense?: boolean;
      discountPercent?: number;
      approvedAmount?: number;
    } | undefined;

    const durationDays = billingPayload?.durationDays ? parseInt(String(billingPayload.durationDays), 10) : 30;

    if (billingPayload?.extendLicense && newPlan !== 'FREE' && PAID_PLAN_KEYS.includes(newPlan)) {
      nextExpiry = computeExtendedExpiry(existing.licenseExpiresAt, durationDays);
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        plan: newPlan,
        licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : undefined,
        licenseExpiresAt: licenseExpiresAt !== undefined ? nextExpiry : undefined,
        licenseKey: licenseKey !== undefined ? licenseKey : undefined,
        licenseExpiryWarningFor:
          billingPayload?.extendLicense || billingPayload?.issueInvoice ? null : undefined,
      },
    });

    let billingResult = null;
    if (
      billingPayload?.issueInvoice &&
      newPlan !== 'FREE' &&
      PAID_PLAN_KEYS.includes(newPlan)
    ) {
      const parsedDiscount =
        billingPayload.discountPercent !== undefined && billingPayload.discountPercent !== null
          ? parseFloat(String(billingPayload.discountPercent))
          : undefined;
      const parsedApproved =
        billingPayload.approvedAmount !== undefined && billingPayload.approvedAmount !== null
          ? parseFloat(String(billingPayload.approvedAmount))
          : undefined;

      if (parsedDiscount !== undefined && (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)) {
        return res.status(400).json({ error: 'La réduction doit être entre 0 et 100 %.' });
      }

      const action = resolveBillingAction(existing.plan, newPlan, billingPayload.action);
      const periodStart = new Date();
      const periodEnd =
        nextExpiry ??
        (() => {
          const d = new Date(periodStart);
          d.setDate(d.getDate() + durationDays);
          return d;
        })();

      billingResult = await issueTenantPlanInvoice({
        tenantId: id,
        tenantName: updatedTenant.name,
        plan: newPlan,
        billing: {
          action,
          durationDays,
          discountPercent: parsedDiscount,
          approvedAmount: parsedApproved,
          periodStart,
          periodEnd,
        },
      });
    }

    const discountNote =
      billingResult?.pricing.discountAmount && billingResult.pricing.discountAmount > 0
        ? ` Réduction ${billingResult.pricing.discountPercent} % appliquée.`
        : '';
    const invoiceNote = billingResult?.invoice
      ? ` Facture ${billingResult.invoice.invoiceNumber} envoyée.${discountNote}`
      : '';
    const commercialNote =
      billingResult?.commercialNotified.length
        ? ` Commerciaux informés : ${billingResult.commercialNotified.join(', ')}.`
        : '';

    return res.json({
      message: `Organisation mise à jour.${invoiceNote}${commercialNote}`,
      tenant: updatedTenant,
      billing: billingResult
        ? {
            action: billingPayload?.action ?? resolveBillingAction(existing.plan, newPlan),
            pricing: billingResult.pricing,
            invoice: billingResult.invoice
              ? {
                  id: billingResult.invoice.id,
                  invoiceNumber: billingResult.invoice.invoiceNumber,
                  amount: billingResult.invoice.amount,
                }
              : null,
            commercialNotified: billingResult.commercialNotified,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du tenant:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'organisation' });
  }
}

// Delete tenant and all associated data
export async function deleteTenant(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.tenant.delete({
      where: { id },
    });

    return res.json({ message: 'Tenant supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du tenant:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'organisation' });
  }
}

// Get all users across the platform
export async function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const users = await prisma.user.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      tenantId: u.tenantId,
      isEmailVerified: u.isEmailVerified,
      tenantName: u.tenant?.name || 'Aucun (Super Admin)',
      createdAt: u.createdAt,
    })));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
}

// Create a new user (Super Admin only)
export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { name, email, password, role, isEmailVerified, tenantId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'L\'adresse email et le mot de passe sont requis.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cette adresse email existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const resolvedRole = (role as Role) || 'USER';
    const resolvedTenantId = resolvedRole === 'COMMERCIAL' ? null : (tenantId || null);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: resolvedRole,
        isEmailVerified: isEmailVerified !== undefined ? Boolean(isEmailVerified) : false,
        tenantId: resolvedTenantId,
        commissionRate: resolvedRole === 'COMMERCIAL' ? normalizeCommissionRate(0.2) : null,
      },
    });

    if (newUser.role === 'COMMERCIAL') {
      await ensureCommercialReferralCode(newUser.id);
    }

    // If this is the manager of the tenant and tenant managerId is not set, we can set it
    if (resolvedTenantId && resolvedRole === 'USER') {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant && !tenant.managerId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { managerId: newUser.id },
        });
      }
    }

    return res.status(201).json({ message: 'Utilisateur créé avec succès', user: newUser });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
}

// Update user details (Super Admin only)
export async function updateUserRoleOrStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { name, email, password, role, isEmailVerified, tenantId } = req.body;

    const updateData: any = {
      name: name !== undefined ? name : undefined,
      email: email !== undefined ? email : undefined,
      role: role as Role,
      isEmailVerified: isEmailVerified !== undefined ? Boolean(isEmailVerified) : undefined,
    };

    if (role === 'COMMERCIAL') {
      updateData.tenantId = null;
      if (updateData.commissionRate === undefined) {
        updateData.commissionRate = normalizeCommissionRate(0.2);
      }
    } else if (tenantId !== undefined) {
      updateData.tenantId = tenantId || null;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (updatedUser.role === 'COMMERCIAL') {
      await ensureCommercialReferralCode(updatedUser.id);
    }

    return res.json({ message: 'Utilisateur mis à jour avec succès', user: updatedUser });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
}

// Delete user
export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.user.delete({
      where: { id },
    });

    return res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
}

// Get all templates across the platform
export async function getAllTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const templates = await prisma.template.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(templates.map(t => ({
      id: t.id,
      name: t.name,
      content: t.content,
      isGlobal: t.tenantId === null,
      showOnLanding: t.showOnLanding,
      tenantName: t.tenant?.name || 'Global (Tous)',
      createdAt: t.createdAt,
    })));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des modèles:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des modèles' });
  }
}

// Create a global template
export async function createGlobalTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { name, content, showOnLanding } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Le nom et le contenu du modèle sont requis.' });
    }

    const template = await prisma.template.create({
      data: {
        name,
        content,
        showOnLanding: showOnLanding !== undefined ? Boolean(showOnLanding) : false,
        tenantId: null, // Null means it is a global template
      },
    });

    return res.status(201).json({ message: 'Modèle global créé avec succès', template });
  } catch (error: any) {
    console.error('Erreur lors de la création du modèle global:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du modèle global' });
  }
}

// Toggle showOnLanding flag for a template
export async function toggleTemplateLanding(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { showOnLanding } = req.body;

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        showOnLanding: Boolean(showOnLanding),
      },
    });

    return res.json({ message: 'Visibilité sur la landing page mise à jour', template: updatedTemplate });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de la visibilité du modèle:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la visibilité du modèle' });
  }
}

// Delete template
export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.template.delete({
      where: { id },
    });

    return res.json({ message: 'Modèle supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du modèle:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du modèle' });
  }
}

// Get all events across all tenants (Super Admin only)
export async function getAllEvents(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const events = await prisma.event.findMany({
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            guests: true,
            invitations: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return res.json(events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      location: e.location,
      reminderFrequency: e.reminderFrequency,
      latitude: e.latitude,
      longitude: e.longitude,
      tenantId: e.tenantId,
      tenantName: e.tenant?.name || 'Inconnu',
      guestCount: e._count.guests,
      invitationCount: e._count.invitations,
      createdAt: e.createdAt,
    })));
  } catch (error: any) {
    console.error('Erreur lors de la récupération de tous les événements:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de tous les événements' });
  }
}

// Create an event for any tenant (Super Admin only)
export async function createAdminEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { title, description, date, location, reminderFrequency, latitude, longitude, tenantId } = req.body;

    if (!title || !date || !location || !tenantId) {
      return res.status(400).json({ error: 'Les champs title, date, location et tenantId sont requis.' });
    }

    const event = await prisma.event.create({
      data: {
        tenantId,
        title,
        description,
        date: new Date(date),
        location,
        reminderFrequency: reminderFrequency || 'NONE',
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
      },
    });

    return res.status(201).json({ message: 'Événement créé avec succès par l\'administrateur', event });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'événement par l\'admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
  }
}

// Update any event (Super Admin only)
export async function updateAdminEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { title, description, date, location, reminderFrequency, latitude, longitude, tenantId } = req.body;

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        date: date !== undefined ? new Date(date) : existingEvent.date,
        location: location !== undefined ? location : existingEvent.location,
        reminderFrequency: reminderFrequency !== undefined ? reminderFrequency : existingEvent.reminderFrequency,
        latitude: latitude !== undefined ? (latitude !== null ? parseFloat(latitude) : null) : existingEvent.latitude,
        longitude: longitude !== undefined ? (longitude !== null ? parseFloat(longitude) : null) : existingEvent.longitude,
        tenantId: tenantId !== undefined ? tenantId : existingEvent.tenantId,
      },
    });

    return res.json({ message: 'Événement modifié avec succès', event: updatedEvent });
  } catch (error: any) {
    console.error('Erreur lors de la modification de l\'événement par l\'admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
  }
}

// Delete any event (Super Admin only)
export async function deleteAdminEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.event.delete({
      where: { id },
    });

    return res.json({ message: 'Événement supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'événement par l\'admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
  }
}

// === GUESTS MANAGEMENT (Super Admin only) ===

// Get all guests across all events
export async function getAllGuests(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const guests = await prisma.guest.findMany({
      include: {
        event: {
          select: {
            title: true,
            tenant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(
      guests.map((g) => ({
        id: g.id,
        eventId: g.eventId,
        eventTitle: g.event?.title || 'Événement inconnu',
        tenantName: g.event?.tenant?.name || 'Organisation inconnue',
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        category: g.category || 'Général',
        rsvp: g.rsvp,
        preferences: g.preferences,
        createdAt: g.createdAt,
      }))
    );
  } catch (error: any) {
    console.error('Erreur lors de la récupération de tous les invités:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de tous les invités' });
  }
}

// Create a guest for any event
export async function createAdminGuest(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { eventId, firstName, lastName, email, category, rsvp, preferences } = req.body;

    if (!eventId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Les champs eventId, firstName, lastName et email sont requis' });
    }

    // Check if guest already exists for this event
    const existingGuest = await prisma.guest.findUnique({
      where: { eventId_email: { eventId, email } },
    });

    if (existingGuest) {
      return res.status(400).json({ error: 'Un invité avec cet email existe déjà pour cet événement' });
    }

    const guest = await prisma.guest.create({
      data: {
        eventId,
        firstName,
        lastName,
        email,
        category: category || 'Général',
        rsvp: rsvp || 'PENDING',
        preferences: preferences || {},
      },
      include: {
        event: {
          select: {
            title: true,
            tenant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Invité créé avec succès',
      guest: {
        id: guest.id,
        eventId: guest.eventId,
        eventTitle: guest.event?.title || 'Événement inconnu',
        tenantName: guest.event?.tenant?.name || 'Organisation inconnue',
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        category: guest.category,
        rsvp: guest.rsvp,
        preferences: guest.preferences,
        createdAt: guest.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'invité par l\'admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'invité' });
  }
}

// Update any guest
export async function updateAdminGuest(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { eventId, firstName, lastName, email, category, rsvp, preferences } = req.body;

    const existingGuest = await prisma.guest.findUnique({
      where: { id },
    });

    if (!existingGuest) {
      return res.status(404).json({ error: 'Invité non trouvé' });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        eventId: eventId !== undefined ? eventId : existingGuest.eventId,
        firstName: firstName !== undefined ? firstName : existingGuest.firstName,
        lastName: lastName !== undefined ? lastName : existingGuest.lastName,
        email: email !== undefined ? email : existingGuest.email,
        category: category !== undefined ? category : existingGuest.category,
        rsvp: rsvp !== undefined ? rsvp : existingGuest.rsvp,
        preferences: preferences !== undefined ? preferences : (existingGuest.preferences as any),
      },
      include: {
        event: {
          select: {
            title: true,
            tenant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      message: 'Invité modifié avec succès',
      guest: {
        id: updatedGuest.id,
        eventId: updatedGuest.eventId,
        eventTitle: updatedGuest.event?.title || 'Événement inconnu',
        tenantName: updatedGuest.event?.tenant?.name || 'Organisation inconnue',
        firstName: updatedGuest.firstName,
        lastName: updatedGuest.lastName,
        email: updatedGuest.email,
        category: updatedGuest.category,
        rsvp: updatedGuest.rsvp,
        preferences: updatedGuest.preferences,
        createdAt: updatedGuest.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la modification de l\'invité par l\'admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification de l\'invité' });
  }
}

// Delete any guest
export async function deleteAdminGuest(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;

    await prisma.guest.delete({
      where: { id },
    });

    return res.json({ message: 'Invité supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'invité par l\'admin:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invité' });
  }
}

// === CONFIGURATION & SETTINGS (Super Admin only) ===

const settingsFilePath = path.join(__dirname, '..', 'config', 'settings.json');

// Ensure the directory exists
function ensureSettingsDir() {
  const dir = path.dirname(settingsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const defaultSettings = {
  platformName: "EventMaster",
  supportEmail: "mingandajeereq@gmail.com",
  maintenanceMode: false,
  allowRegistration: true,
  ultramsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || "",
  ultramsgToken: process.env.ULTRAMSG_TOKEN || "",
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  plans: getDefaultPlans(),
};

export async function getAdminSettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    // Toujours rafraîchir les forfaits depuis la BD
    const plans = await loadSubscriptionPlansFromDb();

    ensureSettingsDir();
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      const settings = JSON.parse(data);
      const { plans: _legacyPlans, ...rest } = settings;
      return res.json({
        ...defaultSettings,
        ...rest,
        plans,
      });
    }

    return res.json({ ...defaultSettings, plans });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
}

export async function updateAdminSettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const newSettings = req.body;
    ensureSettingsDir();

    let currentSettings: Record<string, unknown> = { ...defaultSettings };
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      currentSettings = { ...currentSettings, ...JSON.parse(data) };
    }

    const { plans: incomingPlans, ...otherSettings } = newSettings;

    const updatedSettings = {
      ...currentSettings,
      ...otherSettings,
    };
    // Les forfaits ne sont plus stockés dans settings.json
    delete (updatedSettings as { plans?: unknown }).plans;

    let plans = getPlansConfiguration();
    if (incomingPlans) {
      plans = await saveSubscriptionPlansToDb(incomingPlans);
    }

    fs.writeFileSync(settingsFilePath, JSON.stringify(updatedSettings, null, 2), 'utf-8');
    return res.json({
      message: 'Paramètres mis à jour avec succès',
      settings: { ...updatedSettings, plans },
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
}
