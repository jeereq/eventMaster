import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

// Load environment variables for SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridFrom = process.env.SENDGRID_FROM || 'no-reply@eventmaster.cd';

// Load environment variables for Twilio
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

// Load environment variables for UltraMsg (WhatsApp alternative)
const ultramsgInstanceId = process.env.ULTRAMSG_INSTANCE_ID;
const ultramsgToken = process.env.ULTRAMSG_TOKEN;

// Initialize SendGrid Mail
let isSendGridInitialized = false;
if (sendgridApiKey) {
  try {
    sgMail.setApiKey(sendgridApiKey);
    isSendGridInitialized = true;
    console.log('[Notification Service] SendGrid client initialized successfully.');
  } catch (error) {
    console.error('[Notification Service] Failed to initialize SendGrid client:', error);
  }
} else {
  console.warn('[Notification Service] SENDGRID_API_KEY missing in environment variables. Email sending will be simulated.');
}

// Initialize Twilio Client
let twilioClient: any = null;
if (twilioSid && twilioAuthToken) {
  try {
    twilioClient = twilio(twilioSid, twilioAuthToken);
    console.log('[Notification Service] Twilio client initialized successfully.');
  } catch (error) {
    console.error('[Notification Service] Failed to initialize Twilio client:', error);
  }
} else {
  console.warn('[Notification Service] Twilio credentials missing in environment variables. SMS sending will be simulated.');
}

// Initialize UltraMsg Client
let isUltraMsgInitialized = false;
if (ultramsgInstanceId && ultramsgToken) {
  isUltraMsgInitialized = true;
  console.log('[Notification Service] UltraMsg client initialized successfully for WhatsApp.');
} else {
  console.warn('[Notification Service] ULTRAMSG_INSTANCE_ID or ULTRAMSG_TOKEN missing in environment variables. WhatsApp sending will be simulated.');
}

/**
 * Send a real email using SendGrid or fall back to simulation
 */
export async function sendRealEmail(to: string, subject: string, textBody: string, htmlBody?: string): Promise<{ success: boolean; simulated: boolean; messageId?: string }> {
  if (isSendGridInitialized) {
    try {
      const msg = {
        to,
        from: sendgridFrom,
        subject,
        text: textBody,
        html: htmlBody || textBody.replace(/\n/g, '<br>'),
      };
      
      const response = await sgMail.send(msg);
      // SendGrid returns an array of responses, the first one contains headers with X-Message-Id
      const messageId = response[0]?.headers?.['x-message-id'] || 'sg-sent';
      console.log(`[Notification Service] SendGrid email sent successfully to ${to}. Message ID: ${messageId}`);
      return { success: true, simulated: false, messageId };
    } catch (error: any) {
      console.error(`[Notification Service] Failed to send SendGrid email to ${to}:`, error.response?.body || error);
      return { success: false, simulated: false };
    }
  } else {
    console.log(`[Simulation] Sending SendGrid Email to ${to}:\nFrom: ${sendgridFrom}\nSubject: ${subject}\nBody: ${textBody}\n`);
    return { success: true, simulated: true };
  }
}

/**
 * Send a real SMS using Twilio or fall back to simulation
 */
export async function sendRealSMS(to: string, body: string): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  // Ensure phone number is in E.164 format (starts with +)
  let formattedTo = to.trim();
  if (!formattedTo.startsWith('+')) {
    // Default to DRC country code (+243) if it starts with 0, or just prepend + if needed
    if (formattedTo.startsWith('0')) {
      formattedTo = '+243' + formattedTo.slice(1);
    } else {
      formattedTo = '+' + formattedTo;
    }
  }

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
  } else {
    console.log(`[Simulation] Sending SMS to ${formattedTo}:\nBody: ${body}\n`);
    return { success: true, simulated: true };
  }
}

/**
 * Send a real WhatsApp message using UltraMsg or fall back to simulation
 */
export async function sendRealWhatsApp(to: string, body: string): Promise<{ success: boolean; simulated: boolean; messageSid?: string; error?: string }> {
  // Ensure phone number is in E.164 format (starts with +)
  let formattedTo = to.trim();
  if (!formattedTo.startsWith('+')) {
    if (formattedTo.startsWith('0')) {
      formattedTo = '+243' + formattedTo.slice(1);
    } else {
      formattedTo = '+' + formattedTo;
    }
  }

  if (isUltraMsgInitialized && ultramsgInstanceId && ultramsgToken) {
    try {
      const url = `https://api.ultramsg.com/${ultramsgInstanceId}/messages/chat`;
      const params = new URLSearchParams();
      params.append('token', ultramsgToken);
      params.append('to', formattedTo);
      params.append('body', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await response.json() as any;

      if (response.ok && (data.sent === 'true' || data.success || data.id)) {
        const messageId = data.id || 'um-sent';
        console.log(`[Notification Service] UltraMsg WhatsApp sent successfully to ${formattedTo}. ID: ${messageId}`);
        return { success: true, simulated: false, messageSid: messageId };
      } else {
        const errMsg = data.error || data.message || JSON.stringify(data);
        console.error(`[Notification Service] UltraMsg API returned error for ${formattedTo}:`, errMsg);
        return { success: false, simulated: false, error: errMsg };
      }
    } catch (error: any) {
      console.error(`[Notification Service] Failed to send UltraMsg WhatsApp to ${formattedTo}:`, error);
      return { success: false, simulated: false, error: error.message || String(error) };
    }
  } else {
    console.log(`[Simulation] Sending UltraMsg WhatsApp to ${formattedTo}:\nBody: ${body}\n`);
    return { success: true, simulated: true };
  }
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
  // Ensure phone number is in E.164 format (starts with +)
  let formattedTo = to.trim();
  if (!formattedTo.startsWith('+')) {
    if (formattedTo.startsWith('0')) {
      formattedTo = '+243' + formattedTo.slice(1);
    } else {
      formattedTo = '+' + formattedTo;
    }
  }

  if (isUltraMsgInitialized && ultramsgInstanceId && ultramsgToken) {
    try {
      const url = `https://api.ultramsg.com/${ultramsgInstanceId}/messages/location`;
      const params = new URLSearchParams();
      params.append('token', ultramsgToken);
      params.append('to', formattedTo);
      params.append('address', address);
      params.append('lat', lat.toString());
      params.append('lng', lng.toString());

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await response.json() as any;

      if (response.ok && (data.sent === 'true' || data.success || data.id)) {
        const messageId = data.id || 'um-loc-sent';
        console.log(`[Notification Service] UltraMsg WhatsApp Location sent successfully to ${formattedTo}. ID: ${messageId}`);
        return { success: true, simulated: false, messageSid: messageId };
      } else {
        const errMsg = data.error || data.message || JSON.stringify(data);
        console.error(`[Notification Service] UltraMsg Location API returned error for ${formattedTo}:`, errMsg);
        return { success: false, simulated: false, error: errMsg };
      }
    } catch (error: any) {
      console.error(`[Notification Service] Failed to send UltraMsg WhatsApp Location to ${formattedTo}:`, error);
      return { success: false, simulated: false, error: error.message || String(error) };
    }
  } else {
    console.log(`[Simulation] Sending UltraMsg WhatsApp Location to ${formattedTo}:\nAddress: ${address}\nGPS: ${lat}, ${lng}\n`);
    return { success: true, simulated: true };
  }
}
