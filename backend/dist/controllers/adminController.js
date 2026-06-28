"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStats = getSystemStats;
exports.updateTenantPlanOrLicense = updateTenantPlanOrLicense;
exports.deleteTenant = deleteTenant;
exports.getAllUsers = getAllUsers;
exports.updateUserRoleOrStatus = updateUserRoleOrStatus;
exports.deleteUser = deleteUser;
exports.getAllTemplates = getAllTemplates;
exports.createGlobalTemplate = createGlobalTemplate;
exports.deleteTemplate = deleteTemplate;
const db_1 = require("../db");
// Get global system statistics and list of all tenants (Super Admin only)
async function getSystemStats(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const [tenantCount, userCount, eventCount, guestCount] = await Promise.all([
            db_1.prisma.tenant.count(),
            db_1.prisma.user.count(),
            db_1.prisma.event.count(),
            db_1.prisma.guest.count(),
        ]);
        const tenants = await db_1.prisma.tenant.findMany({
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
    }
    catch (error) {
        console.error('Erreur lors de la récupération des stats admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales' });
    }
}
// Update tenant plan and license details
async function updateTenantPlanOrLicense(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { plan, licenseActive, licenseExpiresAt, licenseKey } = req.body;
        const updatedTenant = await db_1.prisma.tenant.update({
            where: { id },
            data: {
                plan: plan,
                licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : undefined,
                licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
                licenseKey: licenseKey !== undefined ? licenseKey : undefined,
            },
        });
        return res.json({ message: 'Tenant mis à jour avec succès', tenant: updatedTenant });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du tenant:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'organisation' });
    }
}
// Delete tenant and all associated data
async function deleteTenant(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.tenant.delete({
            where: { id },
        });
        return res.json({ message: 'Tenant supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du tenant:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'organisation' });
    }
}
// Get all users across the platform
async function getAllUsers(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const users = await db_1.prisma.user.findMany({
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
            isEmailVerified: u.isEmailVerified,
            tenantName: u.tenant?.name || 'Aucun (Super Admin)',
            createdAt: u.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
}
// Update user role or status
async function updateUserRoleOrStatus(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { role, isEmailVerified } = req.body;
        const updatedUser = await db_1.prisma.user.update({
            where: { id },
            data: {
                role: role,
                isEmailVerified: isEmailVerified !== undefined ? Boolean(isEmailVerified) : undefined,
            },
        });
        return res.json({ message: 'Utilisateur mis à jour avec succès', user: updatedUser });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
}
// Delete user
async function deleteUser(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.user.delete({
            where: { id },
        });
        return res.json({ message: 'Utilisateur supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
    }
}
// Get all templates across the platform
async function getAllTemplates(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const templates = await db_1.prisma.template.findMany({
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
            tenantName: t.tenant?.name || 'Global (Tous)',
            createdAt: t.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des modèles:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des modèles' });
    }
}
// Create a global template
async function createGlobalTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { name, content } = req.body;
        if (!name || !content) {
            return res.status(400).json({ error: 'Le nom et le contenu du modèle sont requis.' });
        }
        const template = await db_1.prisma.template.create({
            data: {
                name,
                content,
                tenantId: null, // Null means it is a global template
            },
        });
        return res.status(201).json({ message: 'Modèle global créé avec succès', template });
    }
    catch (error) {
        console.error('Erreur lors de la création du modèle global:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du modèle global' });
    }
}
// Delete template
async function deleteTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.template.delete({
            where: { id },
        });
        return res.json({ message: 'Modèle supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du modèle:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du modèle' });
    }
}
