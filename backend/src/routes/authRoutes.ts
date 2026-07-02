import { Router } from 'express';
import { register, login, verifyEmail, getProfile, updateProfile, forgotPassword, resetPassword } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { acceptUserLegalHandler, getUserLegalStatusHandler } from '../controllers/legalController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/legal-status', requireAuth, getUserLegalStatusHandler);
router.post('/legal-accept', requireAuth, acceptUserLegalHandler);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);

export default router;
