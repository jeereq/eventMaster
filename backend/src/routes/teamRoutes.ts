import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import { getTeamMembers, createTeamMember, deleteTeamMember } from '../controllers/teamController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getTeamMembers);
router.post('/', createTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;
