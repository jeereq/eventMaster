import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } from '../controllers/teamController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getTeamMembers);
router.post('/', createTeamMember);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;
