"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMembers = getTeamMembers;
exports.createTeamMember = createTeamMember;
exports.deleteTeamMember = deleteTeamMember;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const tenantAccess_1 = require("../utils/tenantAccess");
async function getTeamMembers(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (req.user?.role !== 'USER') {
            return res.status(403).json({ error: 'Accès réservé aux membres d\'organisation.' });
        }
        const members = await db_1.prisma.user.findMany({
            where: { tenantId, role: 'USER' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isEmailVerified: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { managerId: true },
        });
        return res.json({
            members: members.map((m) => ({
                ...m,
                isOwner: tenant?.managerId === m.id,
            })),
            isManager: tenant?.managerId === userId,
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération de l\'équipe:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de l\'équipe.' });
    }
}
async function createTeamMember(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const manager = await (0, tenantAccess_1.isTenantManager)(userId, tenantId);
        if (!manager) {
            return res.status(403).json({ error: 'Seul le propriétaire de l\'organisation peut créer des utilisateurs.' });
        }
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Le nom, l\'e-mail et le mot de passe sont requis.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        }
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Un utilisateur avec cette adresse e-mail existe déjà.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const newUser = await db_1.prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                passwordHash,
                role: 'USER',
                tenantId,
                isEmailVerified: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isEmailVerified: true,
                createdAt: true,
            },
        });
        return res.status(201).json({
            message: 'Utilisateur créé avec succès. Il peut se connecter immédiatement avec les identifiants définis.',
            member: { ...newUser, isOwner: false },
        });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur d\'équipe:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
    }
}
async function deleteTeamMember(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const memberId = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const manager = await (0, tenantAccess_1.isTenantManager)(userId, tenantId);
        if (!manager) {
            return res.status(403).json({ error: 'Seul le propriétaire de l\'organisation peut supprimer des utilisateurs.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.managerId === memberId) {
            return res.status(400).json({ error: 'Impossible de supprimer le propriétaire de l\'organisation.' });
        }
        const member = await db_1.prisma.user.findFirst({
            where: { id: memberId, tenantId, role: 'USER' },
        });
        if (!member) {
            return res.status(404).json({ error: 'Utilisateur introuvable dans votre organisation.' });
        }
        await db_1.prisma.user.delete({ where: { id: memberId } });
        return res.json({ message: 'Utilisateur supprimé de l\'organisation.' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur d\'équipe:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur.' });
    }
}
