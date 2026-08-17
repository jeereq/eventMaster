import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { requireAuth, requireActiveLicense } from '../middleware/auth';
import { uploadTemplateImage, uploadMarketplaceMedia } from '../controllers/uploadController';

const router = Router();
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

function withMulterLimit(mw: ReturnType<typeof uploadImage.single>) {
  return (req: Request, res: Response, next: NextFunction) => {
    mw(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Fichier trop volumineux.' });
      }
      if (err) return next(err);
      next();
    });
  };
}

router.use(requireAuth);
router.use(requireActiveLicense);

router.post('/image', withMulterLimit(uploadImage.single('file')), uploadTemplateImage);
router.post('/media', withMulterLimit(uploadMedia.single('file')), uploadMarketplaceMedia);
router.post('/video', withMulterLimit(uploadMedia.single('file')), uploadMarketplaceMedia);

export default router;
