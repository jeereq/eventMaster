"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlatformStaff = isPlatformStaff;
exports.isSuperAdmin = isSuperAdmin;
exports.requirePlatformStaff = requirePlatformStaff;
exports.requireSuperAdmin = requireSuperAdmin;
exports.assertSuperAdmin = assertSuperAdmin;
exports.platformStaffOnly = platformStaffOnly;
const auth_1 = require("./auth");
function isPlatformStaff(role) {
    return role === 'SUPER_ADMIN' || role === 'COMMERCIAL';
}
function isSuperAdmin(role) {
    return role === 'SUPER_ADMIN';
}
function requirePlatformStaff() {
    return (0, auth_1.requireRole)(['SUPER_ADMIN', 'COMMERCIAL']);
}
function requireSuperAdmin() {
    return (0, auth_1.requireRole)(['SUPER_ADMIN']);
}
function assertSuperAdmin(req, res) {
    if (req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        return false;
    }
    return true;
}
function platformStaffOnly(req, res, next) {
    if (!isPlatformStaff(req.user?.role)) {
        return res.status(403).json({ error: 'Accès réservé au personnel plateforme.' });
    }
    next();
}
