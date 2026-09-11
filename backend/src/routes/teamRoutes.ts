import { Router } from 'express';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  updateMemberCommissionRate,
  updateOrgCommercialSettings,
  resendTeamMemberVerification,
  getOrgNotificationSettings,
  updateOrgNotificationSettings,
} from '../controllers/teamController';

const router = Router();

router.use(requireAuth);
router.use(requireActiveLicense);

router.get('/', getTeamMembers);
router.post('/', createTeamMember);
router.get('/notification-settings', getOrgNotificationSettings);
router.put('/notification-settings', updateOrgNotificationSettings);
router.put('/commercial-settings', updateOrgCommercialSettings);
router.put('/:id/commission', updateMemberCommissionRate);
router.post('/:id/resend-verification', resendTeamMemberVerification);
router.put('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;
