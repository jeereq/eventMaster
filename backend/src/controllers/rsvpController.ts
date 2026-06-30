import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendRealEmail, sendRealSMS, sendRealWhatsApp, sendRealWhatsAppImage } from '../services/notificationService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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

// Public endpoint to get guest and event details
export async function getGuestRsvpDetails(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        event: {
          select: {
            title: true,
            description: true,
            date: true,
            location: true,
            latitude: true,
            longitude: true,
            tablePlan: true,
            invitations: {
              where: {
                templateId: { not: null }
              },
              select: {
                template: true
              },
              take: 1
            }
          },
        },
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
    }

    // Extract table details if the guest is assigned to a table
    let tableDetails = null;
    const eventObj = guest.event as any;
    if (eventObj && eventObj.tablePlan && typeof eventObj.tablePlan === 'object') {
      const plan = eventObj.tablePlan;
      if (Array.isArray(plan.tables)) {
        for (const table of plan.tables) {
          const seats = Object.values(table.seats || {});
          if (seats.includes(guestId)) {
            const neighborIds = seats.filter((id: any) => id && id !== guestId) as string[];
            let neighbors: any[] = [];
            if (neighborIds.length > 0) {
              neighbors = await prisma.guest.findMany({
                where: { id: { in: neighborIds } },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              });
            }
            tableDetails = {
              tableName: table.name,
              shape: table.shape,
              capacity: table.capacity,
              neighbors
            };
            break;
          }
        }
      }
    }

    return res.json({
      ...guest,
      tableDetails
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des détails RSVP de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du RSVP' });
  }
}

// Public endpoint to submit RSVP response and preferences
export async function submitRsvp(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const { rsvp, preferences } = req.body; // Expects rsvp: 'ACCEPTED' | 'DECLINED' and preferences: object

    if (!rsvp || !['ACCEPTED', 'DECLINED'].includes(rsvp)) {
      return res.status(400).json({ error: 'Le statut RSVP doit être ACCEPTED ou DECLINED.' });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { 
        event: {
          include: {
            tenant: {
              include: {
                manager: true
              }
            }
          }
        } 
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        rsvp,
        preferences: preferences || {},
      },
    });

    // Send QR Code notifications asynchronously if RSVP is accepted
    const formattedDate = guest.event.date ? new Date(guest.event.date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    if (rsvp === 'ACCEPTED') {
      // Customized QR Code with platform colors (Indigo: #4f46e5) - point to the public RSVP landing page for this guest
      const rsvpUrl = `${FRONTEND_URL}/rsvp/${guest.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rsvpUrl)}&color=4f-46-e5&bgcolor=ffffff&qzone=2`;

      const subject = `Confirmation de votre présence - ${guest.event.title}`;
      const textBody = `Bonjour ${guest.firstName},\n\nVotre présence à l'événement "${guest.event.title}" a été confirmée avec succès !\n\nVoici votre badge d'émargement QR Code : ${qrCodeUrl}\n\nPrésentez ce QR Code à l'entrée pour valider votre présence.\n\nDate : ${formattedDate}\nLieu : ${guest.event.location || 'Non défini'}\n\nMerci et à très bientôt !`;
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e1b4b; text-align: center; margin-bottom: 5px;">Présence Confirmée !</h2>
          <p style="text-align: center; color: #4f46e5; font-weight: bold; margin-top: 0; margin-bottom: 20px;">Merci, ${guest.firstName} !</p>
          <p>Bonjour <strong>${guest.firstName} ${guest.lastName}</strong>,</p>
          <p>Votre présence à l'événement <strong>${guest.event.title}</strong> a été enregistrée avec succès.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 10px;">Votre Badge d'Émargement</span>
            <img src="${qrCodeUrl}" alt="QR Code d'émargement" style="width: 180px; height: 180px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px; background-color: white;" />
            <p style="font-size: 12px; color: #64748b; margin-top: 10px; margin-bottom: 0;">Présentez ce QR Code à l'entrée pour valider votre présence.</p>
          </div>

          <div style="margin-top: 20px; font-size: 14px; color: #334155; background-color: #f1f5f9; padding: 15px; border-radius: 8px;">
            <strong>Détails de l'événement :</strong><br />
            📅 Date : ${formattedDate}<br />
            📍 Lieu : ${guest.event.location || 'Non défini'}
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Cet e-mail automatique a été envoyé par EventMaster.</p>
        </div>
      `;

      const whatsappCaption = `Bonjour ${guest.firstName},\n\nVotre présence à l'événement *${guest.event.title}* a été confirmée avec succès !\n\nPrésentez ce QR Code à l'entrée pour valider votre présence.\n\n📅 Date : ${formattedDate}\n📍 Lieu : ${guest.event.location || 'Non défini'}\n\nMerci et à très bientôt !`;
      const smsBody = `Bonjour ${guest.firstName}, votre présence à "${guest.event.title}" est confirmée. Voici votre QR Code d'entrée : ${qrCodeUrl}. Présentez-le à l'accueil. Merci !`;

      // Run sending in the background to avoid blocking the user response
      (async () => {
        try {
          // 1. Send Email if valid email address
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim());
          if (isEmail) {
            console.log(`[RSVP Controller] Sending confirmation email with QR Code to ${guest.email}...`);
            await sendRealEmail(guest.email, subject, textBody, htmlBody);
          }

          // 2. Send Phone notifications (WhatsApp / SMS)
          const phone = getGuestPhone(guest);
          if (phone) {
            console.log(`[RSVP Controller] Sending confirmation WhatsApp Image with QR Code to ${phone}...`);
            await sendRealWhatsAppImage(phone, qrCodeUrl, whatsappCaption);
            
            console.log(`[RSVP Controller] Sending confirmation SMS with QR Code link to ${phone}...`);
            await sendRealSMS(phone, smsBody);
          }
        } catch (notifErr) {
          console.error('[RSVP Controller] Error sending QR Code confirmation notifications:', notifErr);
        }
      })();
    }

    // Inform the Event Owner (Tenant Manager) asynchronously
    const owner = guest.event.tenant?.manager;
    if (owner && owner.email) {
      const ownerSubject = `[Notification RSVP] ${guest.firstName} ${guest.lastName} a répondu !`;
      const statusLabel = rsvp === 'ACCEPTED' ? 'Présence confirmée (Oui)' : 'Absence (Décliné)';
      
      let preferencesDetails = '';
      if (preferences && typeof preferences === 'object') {
        const prefs = preferences as any;
        if (prefs.allergies || prefs.specialMeal || prefs.notes) {
          preferencesDetails = `\n\nPréférences indiquées :\n` +
            `- Allergies : ${prefs.allergies || 'Aucune'}\n` +
            `- Repas spécial : ${prefs.specialMeal || 'Aucun'}\n` +
            `- Notes de table : ${prefs.notes || 'Aucune'}`;
        }
      }

      const ownerTextBody = `Bonjour ${owner.name || 'Organisateur'},\n\nUn invité vient de soumettre sa réponse RSVP pour votre événement "${guest.event.title}".\n\n` +
        `Invité : ${guest.firstName} ${guest.lastName}\n` +
        `Email : ${guest.email}\n` +
        `Statut : ${statusLabel}${preferencesDetails}\n\n` +
        `Vous pouvez suivre l'état complet de vos invités en temps réel sur votre tableau de bord EventMaster.\n\nCordialement,\nL'équipe EventMaster`;

      const ownerHtmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e1b4b; margin-bottom: 5px;">Nouvelle Réponse RSVP !</h2>
          <p style="color: #64748b; margin-top: 0; margin-bottom: 20px;">Un invité a répondu pour l'événement <strong>${guest.event.title}</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569; width: 120px;">Invité :</td>
                <td style="padding: 6px 0; color: #1e293b;">${guest.firstName} ${guest.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Email :</td>
                <td style="padding: 6px 0; color: #1e293b;">${guest.email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Statut RSVP :</td>
                <td style="padding: 6px 0;">
                  <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 20px; ${rsvp === 'ACCEPTED' ? 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;'}">
                    ${statusLabel}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          ${preferencesDetails ? `
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 14px; color: #78350f;">
            <strong style="display: block; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #b45309;">Préférences et exigences de table :</strong>
            • <strong>Allergies :</strong> ${preferences.allergies || 'Aucune'}<br />
            • <strong>Repas spécial :</strong> ${preferences.specialMeal || 'Aucun'}<br />
            • <strong>Notes/Commentaires :</strong> ${preferences.notes || 'Aucun'}
          </div>
          ` : ''}

          <p style="font-size: 14px; color: #475569;">Vous pouvez consulter votre liste d'invités complète et mise à jour sur votre espace d'administration.</p>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1);">Accéder au Tableau de Bord</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Cet e-mail de notification automatique a été envoyé par EventMaster.</p>
        </div>
      `;

      const ownerPhone = getGuestPhone(owner); // Reusing phone extractor helper for the owner if stored in preferences/details
      const ownerWhatsappBody = `🔔 *Nouvelle réponse RSVP !*\n\nUn invité a répondu pour l'événement *${guest.event.title}*.\n\n👤 *Invité* : ${guest.firstName} ${guest.lastName}\n📬 *Statut* : ${rsvp === 'ACCEPTED' ? '✅ Présent' : '❌ Décliné'}${preferencesDetails ? `\n\n⚠️ *Préférences* :${preferencesDetails}` : ''}\n\nConsultez vos statistiques sur votre tableau de bord EventMaster.`;

      // Run owner notification asynchronously
      (async () => {
        try {
          // 1. Send Email to Owner
          console.log(`[RSVP Controller] Sending RSVP notification email to owner/manager: ${owner.email}...`);
          await sendRealEmail(owner.email, ownerSubject, ownerTextBody, ownerHtmlBody);

          // 2. Send WhatsApp to Owner if phone is configured
          if (ownerPhone) {
            console.log(`[RSVP Controller] Sending RSVP notification WhatsApp to owner: ${ownerPhone}...`);
            await sendRealWhatsApp(ownerPhone, ownerWhatsappBody);
          }
        } catch (ownerNotifErr) {
          console.error('[RSVP Controller] Error sending notification to event owner:', ownerNotifErr);
        }
      })();
    }

    return res.json({
      message: 'Votre réponse RSVP a été enregistrée avec succès.',
      guest: {
        id: updatedGuest.id,
        firstName: updatedGuest.firstName,
        lastName: updatedGuest.lastName,
        rsvp: updatedGuest.rsvp,
        preferences: updatedGuest.preferences,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la soumission du RSVP:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre réponse RSVP.' });
  }
}
