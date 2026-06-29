import { prisma } from '../db';
import { sendRealEmail, sendRealSMS, sendRealWhatsApp, sendRealWhatsAppLocation } from './notificationService';
import fs from 'fs';
import path from 'path';

const remindersFilePath = path.join(__dirname, '..', 'config', 'reminders.json');

// Ensure the directory exists
function ensureRemindersDir() {
  const dir = path.dirname(remindersFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read last reminder dates
function getLastReminders(): Record<string, string> {
  ensureRemindersDir();
  if (fs.existsSync(remindersFilePath)) {
    try {
      const data = fs.readFileSync(remindersFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('[Reminder Service] Error reading reminders file:', err);
    }
  }
  return {};
}

// Save last reminder dates
function saveLastReminders(reminders: Record<string, string>) {
  ensureRemindersDir();
  try {
    fs.writeFileSync(remindersFilePath, JSON.stringify(reminders, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Reminder Service] Error writing reminders file:', err);
  }
}

// Helper function to extract guest phone number
function getGuestPhone(guest: any): string | null {
  if (guest.preferences && typeof guest.preferences === 'object') {
    const prefs = guest.preferences as any;
    if (prefs.phone) return prefs.phone;
    if (prefs.telephone) return prefs.telephone;
  }
  const emailStr = guest.email.trim();
  const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(emailStr);
  if (isPhone) {
    return emailStr;
  }
  return null;
}

// Main logic to process reminders
export async function processReminders() {
  console.log('[Reminder Service] Starting automatic reminders check...');
  try {
    // 1. Get all events with active reminders
    const events = await prisma.event.findMany({
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
      } else {
        const lastSent = new Date(lastSentStr);
        const diffMs = now.getTime() - lastSent.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (freq === 'DAILY' && diffHours >= 23.5) {
          shouldSend = true;
        } else if (freq === 'WEEKLY' && diffHours >= 167.5) {
          shouldSend = true;
        } else if (freq === 'EVERY_3_DAYS' && diffHours >= 71.5) {
          shouldSend = true;
        } else if (freq === 'EVERY_5_DAYS' && diffHours >= 119.5) {
          shouldSend = true;
        }
      }

      if (!shouldSend) {
        console.log(`[Reminder Service] Event "${event.title}" (${event.id}) reminder is not due yet. Last sent: ${lastSentStr || 'Never'}`);
        continue;
      }

      // 2. Find pending guests for this event
      const pendingGuests = await prisma.guest.findMany({
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
      const latestInvitation = await prisma.invitation.findFirst({
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
        
        let body = `Bonjour ${guest.firstName},\n\nIl s'agit d'un petit rappel concernant l'événement "${event.title}". Nous attendons votre réponse avec impatience !\n\n---\n\n` + (latestInvitation.body || '');
        body = body
          .replaceAll('{{firstName}}', guest.firstName || '')
          .replaceAll('{{lastName}}', guest.lastName || '')
          .replaceAll('{{rsvpLink}}', `${FRONTEND_URL}/rsvp/${guest.id}`)
          .replaceAll('{{title}}', event.title || '')
          .replaceAll('{{description}}', event.description || '')
          .replaceAll('{{location}}', event.location || '')
          .replaceAll('{{date}}', formattedDate);

        const channel = latestInvitation.channel || 'EMAIL';
        let channelsToSend: string[] = [];
        if (channel === 'EMAIL_AND_WHATSAPP') {
          channelsToSend = ['EMAIL', 'WHATSAPP'];
        } else if (channel === 'EMAIL_AND_SMS') {
          channelsToSend = ['EMAIL', 'SMS'];
        } else if (channel === 'ALL_CHANNELS') {
          channelsToSend = ['EMAIL', 'WHATSAPP', 'SMS'];
        } else {
          channelsToSend = channel.split(',').map(c => c.trim());
        }

        for (const chan of channelsToSend) {
          if (chan === 'EMAIL') {
            await sendRealEmail(guest.email, subject, body);
          } else if (chan === 'SMS') {
            const phone = getGuestPhone(guest);
            if (phone) await sendRealSMS(phone, body);
          } else if (chan === 'WHATSAPP') {
            const phone = getGuestPhone(guest);
            if (phone) {
              const sendResult = await sendRealWhatsApp(phone, body);
              if (sendResult.success && event.latitude && event.longitude) {
                await sendRealWhatsAppLocation(phone, event.location || 'Lieu de l\'événement', event.latitude, event.longitude);
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
  } catch (error) {
    console.error('[Reminder Service] Error processing automatic reminders:', error);
  }
}

// Start background worker
export function startReminderWorker() {
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
