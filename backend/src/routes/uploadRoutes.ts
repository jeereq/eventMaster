import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import { uploadTemplateImage } from '../controllers/uploadController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(requireAuth);
router.use(requireActiveLicense);

router.post('/image', upload.single('file'), uploadTemplateImage);

export default router;
