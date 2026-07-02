import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';

export type VerificationMethod = 'EMAIL' | 'WHATSAPP';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtpCode(code: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash || !code) return false;
  return bcrypt.compare(code, hash);
}

export function getOtpExpiryDate(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function isOtpExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() < Date.now();
}

export function canResendOtp(updatedAt: Date, otpExpiresAt: Date | null | undefined): boolean {
  const lastSentApprox = otpExpiresAt
    ? new Date(otpExpiresAt.getTime() - OTP_TTL_MS)
    : updatedAt;
  return Date.now() - lastSentApprox.getTime() >= RESEND_COOLDOWN_MS;
}

export async function sendRegistrationOtp(params: {
  name: string;
  email: string;
  phone?: string | null;
  code: string;
  method: VerificationMethod;
}): Promise<{ sentVia: VerificationMethod }> {
  const { name, email, phone, code, method } = params;
  const expiryMinutes = OTP_TTL_MS / 60000;

  if (method === 'WHATSAPP' && phone) {
    const body = `Bonjour *${name}*,\n\nVotre code de validation *EventMaster* est :\n\n🔐 *${code}*\n\nCe code expire dans ${expiryMinutes} minutes.\n\nNe partagez ce code avec personne.\n\nL'équipe EventMaster ✨`;
    await sendRealWhatsApp(phone, body);
    return { sentVia: 'WHATSAPP' };
  }

  const subject = 'Votre code de validation EventMaster';
  const text = `Bonjour ${name},\n\nVotre code de validation EventMaster est : ${code}\n\nCe code expire dans ${expiryMinutes} minutes.\n\nNe partagez ce code avec personne.\n\nL'équipe EventMaster`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #4f46e5; text-align: center;">Validation de votre compte</h2>
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Utilisez le code ci-dessous pour activer votre compte EventMaster :</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 16px 24px; border-radius: 12px; display: inline-block;">${code}</span>
      </div>
      <p style="font-size: 0.875rem; color: #6b7280; text-align: center;">Ce code expire dans ${expiryMinutes} minutes.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 0.875rem; color: #9ca3af; text-align: center;">Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>
    </div>
  `;
  await sendRealEmail(email, subject, text, html);
  return { sentVia: 'EMAIL' };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  return `${phone.slice(0, 4)}${'*'.repeat(digits.length - 6)}${phone.slice(-2)}`;
}
