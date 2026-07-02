import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import {
  getNotificationCredentials,
  isSendGridConfigured,
  logNotificationConfigStatus,
} from '../config/notificationConfig';

logNotificationConfigStatus();

function formatPhoneE164(to: string): string {
  let formattedTo = to.trim().replace(/[\s\-()]/g, '');
  if (!formattedTo.startsWith('+')) {
    if (formattedTo.startsWith('0')) {
      formattedTo = '+243' + formattedTo.slice(1);
    } else {
      formattedTo = '+' + formattedTo;
    }
  }
  return formattedTo;
}

function getTwilioClient() {
  const { twilioSid, twilioAuthToken } = getNotificationCredentials();
  if (!twilioSid || !twilioAuthToken) return null;
  return twilio(twilioSid, twilioAuthToken);
}

/**
 * Envoie un e-mail via SendGrid uniquement (aucune simulation).
 */
export async function sendRealEmail(
  to: string,
  subject: string,
  textBody: string,
  htmlBody?: string,
): Promise<{ success: boolean; simulated: boolean; messageId?: string; error?: string }> {
  if (!isSendGridConfigured()) {
    const errMsg =
      'SendGrid non configuré. Définissez sendgridApiKey et sendgridFrom (settings.json ou variables d\'environnement).';
    console.error(`[Notification Service] ${errMsg} Destinataire: ${to}`);
    return { success: false, simulated: false, error: errMsg };
  }

  const { sendgridApiKey, sendgridFrom } = getNotificationCredentials();

  try {
    sgMail.setApiKey(sendgridApiKey);
    const msg = {
      to,
      from: sendgridFrom,
      subject,
      text: textBody,
      html: htmlBody || textBody.replace(/\n/g, '<br>'),
    };

    const response = await sgMail.send(msg);
    const messageId = response[0]?.headers?.['x-message-id'] || 'sg-sent';
    console.log(`[Notification Service] SendGrid email sent successfully to ${to}. Message ID: ${messageId}`);
    return { success: true, simulated: false, messageId };
  } catch (error: any) {
    const errMsg = error.response?.body?.errors?.[0]?.message || error.message || String(error);
    console.error(`[Notification Service] Failed to send SendGrid email to ${to}:`, error.response?.body || error);
    return { success: false, simulated: false, error: errMsg };
  }
}

/**
 * Send a real SMS using Twilio or fall back to simulation
 */
export async function sendRealSMS(to: string, body: string): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  const formattedTo = formatPhoneE164(to);
  const { twilioPhone } = getNotificationCredentials();
  const twilioClient = getTwilioClient();

  if (twilioClient && twilioPhone) {
    try {
      const message = await twilioClient.messages.create({
        body,
        from: twilioPhone,
        to: formattedTo,
      });
      console.log(`[Notification Service] SMS sent successfully to ${formattedTo}. SID: ${message.sid}`);
      return { success: true, simulated: false, messageSid: message.sid };
    } catch (error: any) {
      console.error(`[Notification Service] Failed to send SMS to ${formattedTo}:`, error);
      return { success: false, simulated: false, error: error.message || String(error) };
    }
  }

  console.log(`[Simulation] Sending SMS to ${formattedTo}:\nBody: ${body}\n`);
  return { success: true, simulated: true };
}

async function sendUltraMsgRequest(
  endpoint: 'chat' | 'location' | 'image',
  formattedTo: string,
  params: URLSearchParams
): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  const { ultramsgInstanceId, ultramsgToken } = getNotificationCredentials();

  if (!ultramsgInstanceId || !ultramsgToken) {
    return { success: true, simulated: true };
  }

  try {
    const url = `https://api.ultramsg.com/${ultramsgInstanceId}/messages/${endpoint}`;
    params.set('token', ultramsgToken);
    if (!params.has('to')) {
      params.set('to', formattedTo);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json() as any;
    const isSent = data.sent === 'true' || data.sent === true || data.success || data.id;

    if (response.ok && isSent) {
      const messageId = data.id || 'um-sent';
      console.log(`[Notification Service] UltraMsg ${endpoint} sent successfully to ${formattedTo}. ID: ${messageId}`);
      return { success: true, simulated: false, messageSid: messageId };
    }

    const errMsg = data.error || data.message || JSON.stringify(data);
    console.error(`[Notification Service] UltraMsg ${endpoint} API error for ${formattedTo}:`, errMsg);
    return { success: false, simulated: false, error: errMsg };
  } catch (error: any) {
    console.error(`[Notification Service] Failed to send UltraMsg ${endpoint} to ${formattedTo}:`, error);
    return { success: false, simulated: false, error: error.message || String(error) };
  }
}

/**
 * Send a real WhatsApp message using UltraMsg or fall back to simulation
 */
export async function sendRealWhatsApp(to: string, body: string): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  const formattedTo = formatPhoneE164(to);
  const { ultramsgInstanceId, ultramsgToken } = getNotificationCredentials();

  if (!ultramsgInstanceId || !ultramsgToken) {
    console.log(`[Simulation] Sending UltraMsg WhatsApp to ${formattedTo}:\nBody: ${body}\n`);
    return { success: true, simulated: true };
  }

  const params = new URLSearchParams();
  params.append('to', formattedTo);
  params.append('body', body);
  return sendUltraMsgRequest('chat', formattedTo, params);
}

/**
 * Send a real WhatsApp Location message using UltraMsg or fall back to simulation
 */
export async function sendRealWhatsAppLocation(
  to: string,
  address: string,
  lat: number,
  lng: number
): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  const formattedTo = formatPhoneE164(to);
  const { ultramsgInstanceId, ultramsgToken } = getNotificationCredentials();

  if (!ultramsgInstanceId || !ultramsgToken) {
    console.log(`[Simulation] Sending UltraMsg WhatsApp Location to ${formattedTo}:\nAddress: ${address}\nGPS: ${lat}, ${lng}\n`);
    return { success: true, simulated: true };
  }

  const params = new URLSearchParams();
  params.append('to', formattedTo);
  params.append('address', address);
  params.append('lat', lat.toString());
  params.append('lng', lng.toString());
  return sendUltraMsgRequest('location', formattedTo, params);
}

/**
 * Send a real WhatsApp Image using UltraMsg or fall back to simulation
 */
export async function sendRealWhatsAppImage(
  to: string,
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  const formattedTo = formatPhoneE164(to);
  const { ultramsgInstanceId, ultramsgToken } = getNotificationCredentials();

  if (!ultramsgInstanceId || !ultramsgToken) {
    console.log(`[Simulation] Sending UltraMsg WhatsApp Image to ${formattedTo}:\nImage URL: ${imageUrl}\nCaption: ${caption}\n`);
    return { success: true, simulated: true };
  }

  const params = new URLSearchParams();
  params.append('to', formattedTo);
  params.append('image', imageUrl);
  params.append('caption', caption);
  return sendUltraMsgRequest('image', formattedTo, params);
}
