"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStats = getSystemStats;
const db_1 = require("../db");
// Get global system statistics and list of all tenants (Super Admin only)
async function getSystemStats(req, res) {
    try {
        // Double check role
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        // Fetch global counts
        const [tenantCount, userCount, eventCount, guestCount] = await Promise.all([
            db_1.prisma.tenant.count(),
            db_1.prisma.user.count(),
            db_1.prisma.event.count(),
            db_1.prisma.guest.count(),
        ]);
        // Fetch all tenants with their managers and event counts
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
