import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import { uploadTemplateImage, uploadVenueVideo } from '../controllers/uploadController';

const router = Router();
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

function withMulterLimit(mw: ReturnType<typeof uploadImage.single>) {
  return (req: Request, res: Response, next: NextFunction) => {
    mw(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Fichier trop volumineux.' });
      }
      next(err);
    });
  };
}

router.use(requireAuth);
router.use(requireActiveLicense);

router.post('/image', withMulterLimit(uploadImage.single('file')), uploadTemplateImage);
router.post('/video', withMulterLimit(uploadVideo.single('file')), uploadVenueVideo);

export default router;
