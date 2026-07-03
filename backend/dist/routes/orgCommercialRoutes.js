"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const orgCommercialController_1 = require("../controllers/orgCommercialController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/dashboard', orgCommercialController_1.getOrgCommercialDashboard);
exports.default = router;
