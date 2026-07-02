"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRealEmail = sendRealEmail;
exports.sendRealSMS = sendRealSMS;
exports.sendRealWhatsApp = sendRealWhatsApp;
exports.sendRealWhatsAppLocation = sendRealWhatsAppLocation;
exports.sendRealWhatsAppImage = sendRealWhatsAppImage;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const twilio_1 = __importDefault(require("twilio"));
const notificationConfig_1 = require("../config/notificationConfig");
(0, notificationConfig_1.logNotificationConfigStatus)();
function formatPhoneE164(to) {
    let formattedTo = to.trim().replace(/[\s\-()]/g, '');
    if (!formattedTo.startsWith('+')) {
        if (formattedTo.startsWith('0')) {
            formattedTo = '+243' + formattedTo.slice(1);
        }
        else {
            formattedTo = '+' + formattedTo;
        }
    }
    return formattedTo;
}
function getTwilioClient() {
    const { twilioSid, twilioAuthToken } = (0, notificationConfig_1.getNotificationCredentials)();
    if (!twilioSid || !twilioAuthToken)
        return null;
    return (0, twilio_1.default)(twilioSid, twilioAuthToken);
}
/**
 * Send a real email using SendGrid or fall back to simulation
 */
async function sendRealEmail(to, subject, textBody, htmlBody) {
    const { sendgridApiKey, sendgridFrom } = (0, notificationConfig_1.getNotificationCredentials)();
    if (sendgridApiKey) {
        try {
            mail_1.default.setApiKey(sendgridApiKey);
            const msg = {
                to,
                from: sendgridFrom,
                subject,
                text: textBody,
                html: htmlBody || textBody.replace(/\n/g, '<br>'),
            };
            const response = await mail_1.default.send(msg);
            const messageId = response[0]?.headers?.['x-message-id'] || 'sg-sent';
            console.log(`[Notification Service] SendGrid email sent successfully to ${to}. Message ID: ${messageId}`);
            return { success: true, simulated: false, messageId };
        }
        catch (error) {
            const errMsg = error.response?.body?.errors?.[0]?.message || error.message || String(error);
            console.error(`[Notification Service] Failed to send SendGrid email to ${to}:`, error.response?.body || error);
            return { success: false, simulated: false, error: errMsg };
        }
    }
    console.log(`[Simulation] Sending SendGrid Email to ${to}:\nFrom: ${sendgridFrom}\nSubject: ${subject}\nBody: ${textBody}\n`);
    return { success: true, simulated: true };
}
/**
 * Send a real SMS using Twilio or fall back to simulation
 */
async function sendRealSMS(to, body) {
    const formattedTo = formatPhoneE164(to);
    const { twilioPhone } = (0, notificationConfig_1.getNotificationCredentials)();
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
        }
        catch (error) {
            console.error(`[Notification Service] Failed to send SMS to ${formattedTo}:`, error);
            return { success: false, simulated: false, error: error.message || String(error) };
        }
    }
    console.log(`[Simulation] Sending SMS to ${formattedTo}:\nBody: ${body}\n`);
    return { success: true, simulated: true };
}
async function sendUltraMsgRequest(endpoint, formattedTo, params) {
    const { ultramsgInstanceId, ultramsgToken } = (0, notificationConfig_1.getNotificationCredentials)();
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
        const data = await response.json();
        const isSent = data.sent === 'true' || data.sent === true || data.success || data.id;
        if (response.ok && isSent) {
            const messageId = data.id || 'um-sent';
            console.log(`[Notification Service] UltraMsg ${endpoint} sent successfully to ${formattedTo}. ID: ${messageId}`);
            return { success: true, simulated: false, messageSid: messageId };
        }
        const errMsg = data.error || data.message || JSON.stringify(data);
        console.error(`[Notification Service] UltraMsg ${endpoint} API error for ${formattedTo}:`, errMsg);
        return { success: false, simulated: false, error: errMsg };
    }
    catch (error) {
        console.error(`[Notification Service] Failed to send UltraMsg ${endpoint} to ${formattedTo}:`, error);
        return { success: false, simulated: false, error: error.message || String(error) };
    }
}
/**
 * Send a real WhatsApp message using UltraMsg or fall back to simulation
 */
async function sendRealWhatsApp(to, body) {
    const formattedTo = formatPhoneE164(to);
    const { ultramsgInstanceId, ultramsgToken } = (0, notificationConfig_1.getNotificationCredentials)();
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
async function sendRealWhatsAppLocation(to, address, lat, lng) {
    const formattedTo = formatPhoneE164(to);
    const { ultramsgInstanceId, ultramsgToken } = (0, notificationConfig_1.getNotificationCredentials)();
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
async function sendRealWhatsAppImage(to, imageUrl, caption) {
    const formattedTo = formatPhoneE164(to);
    const { ultramsgInstanceId, ultramsgToken } = (0, notificationConfig_1.getNotificationCredentials)();
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
