"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/public/templates
// Public endpoint to fetch templates that are configured to be shown on the landing page
router.get('/templates', async (req, res) => {
    try {
        const templates = await db_1.prisma.template.findMany({
            where: {
                showOnLanding: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(templates.map(t => ({
            id: t.id,
            name: t.name,
            content: t.content,
            createdAt: t.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des modèles publics:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des modèles publics' });
    }
});
exports.default = router;
