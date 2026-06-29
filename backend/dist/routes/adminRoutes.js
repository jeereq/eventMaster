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
// Tenants routes
router.post('/tenants', adminController_1.createTenant);
router.put('/tenants/:id', adminController_1.updateTenantPlanOrLicense);
router.delete('/tenants/:id', adminController_1.deleteTenant);
// Users routes
router.get('/users', adminController_1.getAllUsers);
router.post('/users', adminController_1.createUser);
router.put('/users/:id', adminController_1.updateUserRoleOrStatus);
router.delete('/users/:id', adminController_1.deleteUser);
// Templates routes
router.get('/templates', adminController_1.getAllTemplates);
router.post('/templates/global', adminController_1.createGlobalTemplate);
router.put('/templates/:id/landing', adminController_1.toggleTemplateLanding);
router.delete('/templates/:id', adminController_1.deleteTemplate);
// Events routes
router.get('/events', adminController_1.getAllEvents);
router.post('/events', adminController_1.createAdminEvent);
router.put('/events/:id', adminController_1.updateAdminEvent);
router.delete('/events/:id', adminController_1.deleteAdminEvent);
// Guests routes
router.get('/guests', adminController_1.getAllGuests);
router.post('/guests', adminController_1.createAdminGuest);
router.put('/guests/:id', adminController_1.updateAdminGuest);
router.delete('/guests/:id', adminController_1.deleteAdminGuest);
// Settings routes
router.get('/settings', adminController_1.getAdminSettings);
router.put('/settings', adminController_1.updateAdminSettings);
exports.default = router;
