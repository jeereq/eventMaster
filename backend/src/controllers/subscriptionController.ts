import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { PlanType } from '@prisma/client';
import { getPlansConfiguration } from '../config/plansConfig';
import { recordCommercialCommission } from '../services/commercialService';

// 1. Submit a subscription request (Tenant)
export async function submitSubscriptionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const { requestedPlan, durationDays, proofOfPayment } = req.body;

    if (!requestedPlan || !['STANDARD', 'PREMIUM', 'ENTERPRISE'].includes(requestedPlan)) {
      return res.status(400).json({ error: 'Le forfait demandé est invalide.' });
    }

    const days = durationDays ? parseInt(durationDays) : 30;
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'La durée demandée est invalide.' });
    }

    // Create subscription request
    const request = await prisma.subscriptionRequest.create({
      data: {
        tenantId,
        requestedPlan: requestedPlan as PlanType,
        durationDays: days,
        proofOfPayment: proofOfPayment || null,
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      message: 'Votre demande d\'abonnement a été soumise avec succès au Super Admin !',
      request,
    });
  } catch (error: any) {
    console.error('Erreur lors de la soumission de la demande d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de la soumission de la demande.' });
  }
}

// 2. Get my subscription requests (Tenant)
export async function getMySubscriptionRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const requests = await prisma.subscriptionRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des demandes d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de vos demandes.' });
  }
}

// 3. Get all subscription requests (Super Admin)
export async function getAdminSubscriptionRequests(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const requests = await prisma.subscriptionRequest.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true,
            licenseActive: true,
            licenseExpiresAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    console.error('Erreur lors de la récupération globale des demandes d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des demandes.' });
  }
}

// 4. Approve a subscription request (Super Admin)
export async function approveSubscriptionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const requestId = req.params.id as string;

    const request = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
    }

    // Calculate expiry date (30 days or custom duration)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + request.durationDays);

    // Generate a unique license key EM-XXXX-XXXX-XXXX
    const generateLicenseKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `EM-${segment()}-${segment()}-${segment()}`;
    };
    const newLicenseKey = generateLicenseKey();

    // Update Tenant and Request in a transaction
    const [updatedRequest, updatedTenant] = await prisma.$transaction([
      prisma.subscriptionRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      }),
      prisma.tenant.update({
        where: { id: request.tenantId },
        data: {
          plan: request.requestedPlan,
          licenseActive: true,
          licenseExpiresAt: expiryDate,
          licenseKey: newLicenseKey,
        },
      }),
    ]);

    await recordCommercialCommission({
      tenantId: request.tenantId,
      plan: request.requestedPlan,
      source: 'SUBSCRIPTION_APPROVAL',
    });

    return res.json({
      message: 'La demande d\'abonnement a été approuvée avec succès ! La licence est active pour 30 jours.',
      request: updatedRequest,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        plan: updatedTenant.plan,
        licenseActive: updatedTenant.licenseActive,
        licenseExpiresAt: updatedTenant.licenseExpiresAt,
        licenseKey: updatedTenant.licenseKey,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'approbation de la demande d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'approbation de la demande.' });
  }
}

// 5. Reject a subscription request (Super Admin)
export async function rejectSubscriptionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const requestId = req.params.id as string;

    const request = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
    }

    const updatedRequest = await prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return res.json({
      message: 'La demande d\'abonnement a été rejetée.',
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error('Erreur lors du rejet de la demande d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors du rejet de la demande.' });
  }
}

// 6. Get public/authenticated subscription plans from settings
export async function getSubscriptionPlans(req: AuthenticatedRequest, res: Response) {
  return res.json(getPlansConfiguration());
}
