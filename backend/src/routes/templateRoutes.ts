import { Router } from 'express';
import {
  getTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  composeTemplateWithAi,
} from '../controllers/templateController';
import { requireAuth, requireActiveLicense } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getTemplates);
router.post('/', createTemplate);
router.post('/ai/compose', composeTemplateWithAi);
router.post('/:id/duplicate', duplicateTemplate);
router.get('/:id', getTemplateById);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
