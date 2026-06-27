"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// Protect all admin routes with authentication and SUPER_ADMIN role
router.use(auth_1.requireAuth);
router.use((0, auth_1.requireRole)(['SUPER_ADMIN']));
// GET /api/admin/stats
router.get('/stats', adminController_1.getSystemStats);
exports.default = router;
