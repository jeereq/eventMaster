"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReminders = processReminders;
exports.startReminderWorker = startReminderWorker;
const db_1 = require("../db");
const notificationService_1 = require("./notificationService");
const notificationChannels_1 = require("../utils/notificationChannels");
const messageTemplateService_1 = require("./messageTemplateService");
const guestGuidelines_1 = require("../utils/guestGuidelines");
const brandedMessaging_1 = require("../utils/brandedMessaging");
const brandingUtils_1 = require("../utils/brandingUtils");
const whatsappTone_1 = require("../utils/whatsappTone");
const taskDueReminderService_1 = require("./taskDueReminderService");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const remindersFilePath = path_1.default.join(__dirname, '..', 'config', 'reminders.json');
// Ensure the directory exists
function ensureRemindersDir() {
    const dir = path_1.default.dirname(remindersFilePath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
// Read last reminder dates
function getLastReminders() {
    ensureRemindersDir();
    if (fs_1.default.existsSync(remindersFilePath)) {
        try {
            const data = fs_1.default.readFileSync(remindersFilePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (err) {
            console.error('[Reminder Service] Error reading reminders file:', err);
        }
    }
    return {};
}
// Save last reminder dates
function saveLastReminders(reminders) {
    ensureRemindersDir();
    try {
        fs_1.default.writeFileSync(remindersFilePath, JSON.stringify(reminders, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('[Reminder Service] Error writing reminders file:', err);
    }
}
// Helper function to extract guest phone number
function getGuestPhone(guest) {
    if (guest.preferences && typeof guest.preferences === 'object') {
        const prefs = guest.preferences;
        if (prefs.phone)
            return prefs.phone;
        if (prefs.telephone)
            return prefs.telephone;
    }
    const emailStr = guest.email.trim();
    const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(emailStr);
    if (isPhone) {
        return emailStr;
    }
    return null;
}
// Main logic to process reminders
async function processReminders() {
    console.log('[Reminder Service] Starting automatic reminders check...');
    try {
        // 1. Get all events with active reminders
        const events = await db_1.prisma.event.findMany({
            where: {
                reminderFrequency: {
                    not: 'NONE',
                },
            },
        });
        if (events.length === 0) {
            console.log('[Reminder Service] No events with active reminder frequency.');
            return;
        }
        const lastReminders = getLastReminders();
        const now = new Date();
        for (const event of events) {
            const freq = event.reminderFrequency; // DAILY, WEEKLY, etc.
            const lastSentStr = lastReminders[event.id];
            let shouldSend = false;
            if (!lastSentStr) {
                // Never sent before, let's send now
                shouldSend = true;
            }
            else {
                const lastSent = new Date(lastSentStr);
                const diffMs = now.getTime() - lastSent.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                if (freq === 'DAILY' && diffHours >= 23.5) {
                    shouldSend = true;
                }
                else if (freq === 'WEEKLY' && diffHours >= 167.5) {
                    shouldSend = true;
                }
                else if (freq === 'EVERY_3_DAYS' && diffHours >= 71.5) {
                    shouldSend = true;
                }
                else if (freq === 'EVERY_5_DAYS' && diffHours >= 119.5) {
                    shouldSend = true;
                }
            }
            if (!shouldSend) {
                console.log(`[Reminder Service] Event "${event.title}" (${event.id}) reminder is not due yet. Last sent: ${lastSentStr || 'Never'}`);
                continue;
            }
            // 2. Find pending guests for this event
            const pendingGuests = await db_1.prisma.guest.findMany({
                where: {
                    eventId: event.id,
                    rsvp: 'PENDING',
                },
            });
            if (pendingGuests.length === 0) {
                console.log(`[Reminder Service] Event "${event.title}" has no pending guests.`);
                // Still update the timestamp to avoid checking constantly
                lastReminders[event.id] = now.toISOString();
                saveLastReminders(lastReminders);
                continue;
            }
            // 3. Find the latest invitation template/content for this event
            const latestInvitation = await db_1.prisma.invitation.findFirst({
                where: {
                    eventId: event.id,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            if (!latestInvitation) {
                console.log(`[Reminder Service] Event "${event.title}" has pending guests but no invitation has been created yet.`);
                continue;
            }
            console.log(`[Reminder Service] Sending reminders for event "${event.title}" to ${pendingGuests.length} pending guests...`);
            const orgBrand = await (0, brandedMessaging_1.loadOrgBrand)(event.tenantId);
            const formattedDate = event.date ? new Date(event.date).toLocaleDateString('fr-FR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '';
            const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
            // 4. Send reminders to each pending guest
            for (const guest of pendingGuests) {
                // Variable replacement with a gentle reminder prefix
                let subject = `[Rappel] ${latestInvitation.subject || ''}`;
                subject = subject
                    .replaceAll('{{firstName}}', guest.firstName || '')
                    .replaceAll('{{lastName}}', guest.lastName || '')
                    .replaceAll('{{title}}', event.title || '')
                    .replaceAll('{{description}}', event.description || '')
                    .replaceAll('{{location}}', event.location || '')
                    .replaceAll('{{date}}', formattedDate);
                const rsvpLink = `${FRONTEND_URL}/rsvp/${guest.id}`;
                const templateVars = {
                    firstName: guest.firstName || '',
                    lastName: guest.lastName || '',
                    rsvpLink,
                    title: event.title || '',
                    description: event.description || '',
                    location: event.location || '',
                    date: formattedDate,
                    orgName: orgBrand.orgName,
                };
                let emailCustom = '';
                if (latestInvitation.body?.trim()) {
                    emailCustom = (0, guestGuidelines_1.applyInvitationGuidelineVariables)((0, messageTemplateService_1.applyTemplateVariables)(latestInvitation.body, templateVars), event.guestGuidelines);
                }
                const waCustom = (0, guestGuidelines_1.applyInvitationGuidelineVariables)((0, messageTemplateService_1.applyTemplateVariables)((0, whatsappTone_1.resolveWhatsAppInvitationBody)(latestInvitation.body || '', latestInvitation.whatsappBody), templateVars), event.guestGuidelines);
                let reminderWa = (await (0, messageTemplateService_1.renderGuestMessage)('REMINDER_WHATSAPP', templateVars)).body;
                if (waCustom.trim()) {
                    reminderWa = `${reminderWa}\n\n---\n\n${waCustom}`;
                }
                const alreadyGreets = (0, brandedMessaging_1.messageAlreadyGreets)(emailCustom || reminderWa);
                const whatsappPayload = (0, brandedMessaging_1.wrapBrandedWhatsApp)(reminderWa, orgBrand.orgName, {
                    guidelinesBlock: (0, guestGuidelines_1.guestGuidelinesInvitationText)(event.guestGuidelines),
                });
                const channel = latestInvitation.channel || 'EMAIL';
                const channelsToSend = (0, notificationChannels_1.resolveDeliveryChannels)(channel);
                for (const chan of channelsToSend) {
                    if (chan === 'EMAIL') {
                        const emailSource = emailCustom.trim() || reminderWa;
                        const plainBody = (0, brandingUtils_1.escapeHtml)(emailSource.replace(rsvpLink, '')).replace(/\n/g, '<br />');
                        const htmlBody = (0, brandedMessaging_1.wrapBrandedEmail)({
                            branding: orgBrand.branding,
                            orgName: orgBrand.orgName,
                            title: `Rappel : ${event.title || 'Événement'}`,
                            eyebrow: 'Réponse RSVP en attente',
                            headerEmoji: '🔔',
                            innerHtml: `
                ${alreadyGreets ? '' : `<p style="font-size:16px;font-weight:700;color:#1e1b4b;margin:0 0 15px;">Bonjour ${(0, brandingUtils_1.escapeHtml)(guest.firstName || '')},</p>`}
                <div style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:28px;">${plainBody}</div>
                ${(0, brandedMessaging_1.brandedEventDetailsHtml)(orgBrand.branding, [
                                { label: 'Date', value: formattedDate },
                                { label: 'Lieu', value: event.location || 'Non spécifié' },
                            ])}
              `,
                            cta: { href: rsvpLink, label: 'Confirmer ma présence (RSVP)' },
                            footerNote: 'Merci de bien vouloir répondre avant la date de l’événement.',
                        });
                        await (0, notificationService_1.sendRealEmail)(guest.email, subject, emailSource, htmlBody);
                    }
                    else if (chan === 'WHATSAPP') {
                        const phone = getGuestPhone(guest);
                        if (phone) {
                            await (0, notificationService_1.sendRealWhatsApp)(phone, whatsappPayload);
                        }
                    }
                }
            }
            // 5. Update last reminder date for this event
            lastReminders[event.id] = now.toISOString();
            saveLastReminders(lastReminders);
            console.log(`[Reminder Service] Reminders successfully sent for event "${event.title}".`);
        }
    }
    catch (error) {
        console.error('[Reminder Service] Error processing automatic reminders:', error);
    }
}
// Start background worker
function startReminderWorker() {
    console.log('[Reminder Service] Initializing automatic reminders background worker...');
    // Run on startup (after 10 seconds to let server bind)
    setTimeout(() => {
        processReminders();
        void (0, taskDueReminderService_1.processTaskDueReminders)();
    }, 10000);
    // Run every hour
    setInterval(() => {
        processReminders();
        void (0, taskDueReminderService_1.processTaskDueReminders)();
    }, 60 * 60 * 1000);
}
