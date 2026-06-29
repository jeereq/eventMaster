import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/public/templates
// Public endpoint to fetch templates that are configured to be shown on the landing page
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
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
  } catch (error: any) {
    console.error('Erreur lors de la récupération des modèles publics:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des modèles publics' });
  }
});

export default router;
