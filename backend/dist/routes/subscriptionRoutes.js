"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const subscriptionController_1 = require("../controllers/subscriptionController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Get subscription plans
router.get('/plans', subscriptionController_1.getSubscriptionPlans);
// Submit a new subscription request
router.post('/request', subscriptionController_1.submitSubscriptionRequest);
// Get my subscription requests
router.get('/my-requests', subscriptionController_1.getMySubscriptionRequests);
exports.default = router;
