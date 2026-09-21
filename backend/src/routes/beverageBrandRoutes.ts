import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getBeverageBrands } from '../controllers/beverageBrandController';

const router = Router();

router.get('/', requireAuth, getBeverageBrands);

export default router;
