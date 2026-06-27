"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rsvpController_1 = require("../controllers/rsvpController");
const router = (0, express_1.Router)();
router.get('/:guestId', rsvpController_1.getGuestRsvpDetails);
router.post('/:guestId', rsvpController_1.submitRsvp);
exports.default = router;
