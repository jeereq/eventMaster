import { Router } from 'express';
import { getTemplates, createTemplate, getTemplateById, updateTemplate, deleteTemplate } from '../controllers/templateController';
import { requireAuth, requireActiveLicense } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getTemplates);
router.post('/', createTemplate);
router.get('/:id', getTemplateById);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
