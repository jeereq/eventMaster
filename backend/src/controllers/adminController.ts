import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { PlanType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getDefaultPlans, getPlansConfiguration, mergePlansForSave } from '../config/plansConfig';
import { ensureCommercialReferralCode, normalizeCommissionRate } from '../services/commercialService';
import { isPlatformStaff } from '../middleware/platformAccess';

// Get global system statistics and list of all tenants (Super Admin only)
export async function getSystemStats(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const [tenantCount, userCount, eventCount, guestCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.event.count(),
      prisma.guest.count(),
    ]);

    const tenants = await prisma.tenant.findMany({
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
    const { name, plan, licenseActive, licenseExpiresAt, licenseKey } = req.body;

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        plan: plan as PlanType,
        licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : undefined,
        licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
        licenseKey: licenseKey !== undefined ? licenseKey : undefined,
      },
    });

    return res.json({ message: 'Tenant mis à jour avec succès', tenant: updatedTenant });
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

    ensureSettingsDir();
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      const settings = JSON.parse(data);
      return res.json({
        ...defaultSettings,
        ...settings,
        plans: getPlansConfiguration(),
      });
    }

    return res.json({ ...defaultSettings, plans: getPlansConfiguration() });
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
    
    let currentSettings = { ...defaultSettings };
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      currentSettings = { ...currentSettings, ...JSON.parse(data) };
    }

    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
    };

    if (newSettings.plans) {
      updatedSettings.plans = mergePlansForSave(newSettings.plans);
    }

    fs.writeFileSync(settingsFilePath, JSON.stringify(updatedSettings, null, 2), 'utf-8');
    return res.json({ message: 'Paramètres mis à jour avec succès', settings: updatedSettings });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
}
