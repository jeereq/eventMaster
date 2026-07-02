"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReminders = processReminders;
exports.startReminderWorker = startReminderWorker;
const db_1 = require("../db");
const notificationService_1 = require("./notificationService");
const messageTemplateService_1 = require("./messageTemplateService");
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
                const templateVars = {
                    firstName: guest.firstName || '',
                    lastName: guest.lastName || '',
                    rsvpLink: `${FRONTEND_URL}/rsvp/${guest.id}`,
                    title: event.title || '',
                    description: event.description || '',
                    location: event.location || '',
                    date: formattedDate,
                };
                let body = (await (0, messageTemplateService_1.renderGuestMessage)('REMINDER_WHATSAPP', templateVars)).body;
                if (latestInvitation.body?.trim()) {
                    const customPart = (0, messageTemplateService_1.applyTemplateVariables)(latestInvitation.body, templateVars);
                    body = `${body}\n\n---\n\n${customPart}`;
                }
                body = (0, messageTemplateService_1.polishWhatsAppBody)(body);
                const channel = latestInvitation.channel || 'EMAIL';
                let channelsToSend = [];
                if (channel === 'EMAIL_AND_WHATSAPP') {
                    channelsToSend = ['EMAIL', 'WHATSAPP'];
                }
                else if (channel === 'EMAIL_AND_SMS') {
                    channelsToSend = ['EMAIL', 'SMS'];
                }
                else if (channel === 'ALL_CHANNELS') {
                    channelsToSend = ['EMAIL', 'WHATSAPP', 'SMS'];
                }
                else {
                    channelsToSend = channel.split(',').map(c => c.trim());
                }
                for (const chan of channelsToSend) {
                    if (chan === 'EMAIL') {
                        const htmlBody = `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; margin: 0; width: 100%;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  
                  <!-- Banner Header -->
                  <div style="background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%); padding: 40px 30px; text-align: center; color: #ffffff; position: relative;">
                    <span style="font-size: 32px; display: block; margin-bottom: 15px;">🔔</span>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.025em; line-height: 1.2;">Rappel : ${event.title}</h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #ffe4e6; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Réponse RSVP en attente</p>
                  </div>

                  <!-- Main Content -->
                  <div style="padding: 40px 35px; color: #334155;">
                    <p style="font-size: 16px; font-weight: 700; color: #1e1b4b; margin-top: 0; margin-bottom: 15px;">Bonjour ${guest.firstName},</p>
                    
                    <div style="font-size: 15px; line-height: 1.7; color: #475569; margin-bottom: 30px; white-space: pre-line;">
                      ${body.replace(`${FRONTEND_URL}/rsvp/${guest.id}`, '')}
                    </div>

                    <!-- Event Card -->
                    <div style="background-color: #f1f5f9; border-radius: 18px; padding: 25px; margin-bottom: 35px; border: 1px solid #e2e8f0;">
                      <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 14px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 0.05em;">📅 Détails de la Réception</h3>
                      
                      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                          <td style="padding: 8px 0; font-weight: bold; color: #1e293b; width: 80px; vertical-align: top;">Date :</td>
                          <td style="padding: 8px 0; color: #475569; vertical-align: top;">${formattedDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-weight: bold; color: #1e293b; vertical-align: top;">Lieu :</td>
                          <td style="padding: 8px 0; color: #475569; vertical-align: top;">${event.location || 'Non spécifié'}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- Action Button -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <a href="${FRONTEND_URL}/rsvp/${guest.id}" style="display: inline-block; background-color: #e11d48; color: #ffffff; padding: 16px 32px; font-weight: bold; font-size: 15px; text-decoration: none; border-radius: 14px; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.3); transition: background-color 0.2s;">
                        Confirmer ma présence (RSVP)
                      </a>
                    </div>
                    
                    <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 25px; margin-bottom: 0;">
                      Merci de bien vouloir répondre avant la date de l'événement.
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                      Cet e-mail de rappel vous a été envoyé de la part de l'organisateur via <strong>EventMaster</strong>.<br />
                      © 2026 EventMaster. Tous droits réservés.
                    </p>
                  </div>

                </div>
              </div>
            `;
                        await (0, notificationService_1.sendRealEmail)(guest.email, subject, body, htmlBody);
                    }
                    else if (chan === 'SMS') {
                        const phone = getGuestPhone(guest);
                        if (phone)
                            await (0, notificationService_1.sendRealSMS)(phone, body);
                    }
                    else if (chan === 'WHATSAPP') {
                        const phone = getGuestPhone(guest);
                        if (phone) {
                            const sendResult = await (0, notificationService_1.sendRealWhatsApp)(phone, body);
                            if (sendResult.success && event.latitude && event.longitude) {
                                await (0, notificationService_1.sendRealWhatsAppLocation)(phone, event.location || 'Lieu de l\'événement', event.latitude, event.longitude);
                            }
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
    }, 10000);
    // Run every hour
    setInterval(() => {
        processReminders();
    }, 60 * 60 * 1000);
}
