"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const uploadController_1 = require("../controllers/uploadController");
const router = (0, express_1.Router)();
const uploadImage = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const uploadMedia = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 80 * 1024 * 1024 },
});
function withMulterLimit(mw) {
    return (req, res, next) => {
        mw(req, res, (err) => {
            if (err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Fichier trop volumineux.' });
            }
            if (err)
                return next(err);
            next();
        });
    };
}
router.use(auth_1.requireAuth);
router.post('/avatar', withMulterLimit(uploadImage.single('file')), uploadController_1.uploadAvatar);
router.use(auth_1.requireActiveLicense);
router.post('/image', withMulterLimit(uploadImage.single('file')), uploadController_1.uploadTemplateImage);
router.post('/media', withMulterLimit(uploadMedia.single('file')), uploadController_1.uploadMarketplaceMedia);
router.post('/video', withMulterLimit(uploadMedia.single('file')), uploadController_1.uploadMarketplaceMedia);
exports.default = router;
