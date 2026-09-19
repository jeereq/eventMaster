import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendRealEmail, sendRealWhatsApp, sendRealSms } from './notificationService';
import { wrapBrandedEmail } from '../utils/brandedMessaging';
import { escapeHtml, getPlatformBrand, mixHexWithWhite } from '../utils/brandingUtils';
import { getContactDestinations } from './platformSettingsService';

export type VerificationMethod = 'EMAIL' | 'WHATSAPP' | 'SMS';

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
  /** Compte créé par un manager d'organisation (invitation équipe). */
  invitedToTeam?: boolean;
  /** Compte manager créé par un commercial plateforme. */
  invitedByCommercial?: boolean;
  /** Compte créé par le Super Admin de la plateforme. */
  invitedByAdmin?: boolean;
  /** Mot de passe temporaire pour rappel d'accès si fourni. */
  initialPassword?: string;
}): Promise<{ sentVia: VerificationMethod }> {
  const { name, email, phone, code, method, invitedToTeam, invitedByCommercial, invitedByAdmin, initialPassword } = params;
  const expiryMinutes = OTP_TTL_MS / 60000;
  const loginHint =
    invitedToTeam || invitedByCommercial || invitedByAdmin
      ? '\n\nUne fois le code validé, connectez-vous sur EventMaster avec votre e-mail et le mot de passe communiqué.'
      : '';

  const inviteIntroWhatsapp = invitedByAdmin
    ? 'L’administrateur EventMaster vous a créé un compte sur la plateforme.\n\n'
    : invitedByCommercial
      ? 'Votre commercial EventMaster a créé votre organisation et votre compte manager.\n\n'
      : invitedToTeam
        ? 'Votre organisation vous a ajouté sur *EventMaster*.\n\n'
        : '';

  if (method === 'WHATSAPP' && phone) {
    const body = `Bonjour *${name}*,\n\n${inviteIntroWhatsapp}Votre code de validation *EventMaster* est :\n\n🔐 *${code}*\n\nCe code expire dans ${expiryMinutes} minutes.\n\nNe partagez ce code avec personne.${loginHint}\n\nL'équipe EventMaster ✨`;
    await sendRealWhatsApp(phone, body);
    return { sentVia: 'WHATSAPP' };
  }

  if (method === 'SMS' && phone) {
    const adminHint = invitedByAdmin ? 'Votre compte EventMaster a été créé. ' : '';
    const body = `EventMaster : Bonjour ${name}, ${adminHint}votre code de validation est ${code}. Valable ${expiryMinutes} min. Ne le partagez pas.${loginHint}`;
    await sendRealSms(phone, body);
    return { sentVia: 'SMS' };
  }

  const subject = invitedByAdmin
    ? 'Activez votre compte EventMaster (créé par l’administrateur)'
    : invitedByCommercial
      ? 'Activez votre compte manager EventMaster'
      : invitedToTeam
        ? 'Activez votre compte EventMaster (invitation équipe)'
        : 'Votre code de validation EventMaster';
  const intro = invitedByAdmin
    ? 'L’administrateur EventMaster vient de vous créer un compte sur la plateforme.'
    : invitedByCommercial
      ? 'Votre commercial EventMaster a créé votre organisation et votre compte manager.'
      : invitedToTeam
        ? 'Votre organisation vous a créé un compte sur EventMaster.'
        : 'Utilisez le code ci-dessous pour activer votre compte EventMaster :';
  const text = `Bonjour ${name},\n\n${intro}\n\nVotre code de validation : ${code}\n\nCe code expire dans ${expiryMinutes} minutes.\n\nNe partagez ce code avec personne.${loginHint}\n\nL'équipe EventMaster`;
  const postCodeHint = invitedByAdmin
    ? `<div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;font-size:13px;color:#475569;">
        <p style="margin:0 0 6px;font-weight:600;color:#1e293b;">Identifiants de connexion :</p>
        <p style="margin:0;">• E-mail : <strong>${escapeHtml(email)}</strong></p>
        ${initialPassword ? `<p style="margin:4px 0 0;">• Mot de passe temporaire : <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:13px;">${escapeHtml(initialPassword)}</code></p>` : '<p style="margin:4px 0 0;">• Utilisez le mot de passe défini par votre administrateur.</p>'}
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Après validation du code ci-dessus, connectez-vous pour accéder à votre espace.</p>
      </div>`
    : invitedByCommercial
      ? '<p style="font-size: 0.875rem; color: #6b7280;">Après validation, connectez-vous avec votre e-mail et le mot de passe fourni par votre commercial.</p>'
      : invitedToTeam
        ? '<p style="font-size: 0.875rem; color: #6b7280;">Après validation, connectez-vous avec votre e-mail et le mot de passe fourni par votre organisation.</p>'
        : '';
  const htmlTitle = invitedByAdmin
    ? 'Votre compte EventMaster'
    : invitedByCommercial
      ? 'Votre organisation EventMaster'
      : invitedToTeam
        ? 'Invitation équipe EventMaster'
        : 'Validation de votre compte';
  const brand = getPlatformBrand();
  const { platformName } = getContactDestinations();
  const tint = mixHexWithWhite(brand.primary, 0.88);
  const html = wrapBrandedEmail({
    branding: brand,
    orgName: platformName,
    title: htmlTitle,
    eyebrow: 'Sécurité',
    headerEmoji: '🔐',
    innerHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(intro)}</p>
      <div style="text-align:center;margin:8px 0 20px;">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:${brand.primary};background:${tint};padding:16px 24px;border-radius:14px;display:inline-block;">${escapeHtml(code)}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">Ce code expire dans ${expiryMinutes} minutes.</p>
      ${postCodeHint}
    `,
    footerNote: 'Si vous n’attendiez pas ce message, ignorez-le.',
  });
  await sendRealEmail(email, subject, text, html);
  return { sentVia: 'EMAIL' };
}

/** Envoie un e-mail de confirmation / bienvenue avec identifiants quand le compte est validé directement */
export async function sendAdminUserWelcomeEmail(params: {
  name: string;
  email: string;
  password?: string;
  role: string;
  tenantName?: string | null;
}): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  const brand = getPlatformBrand();
  const { platformName } = getContactDestinations();
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
  const loginUrl = `${frontendUrl}/login`;

  const roleLabel =
    params.role === 'SUPER_ADMIN'
      ? 'Super Administrateur'
      : params.role === 'COMMERCIAL'
        ? 'Commercial plateforme'
        : 'Membre d’organisation';

  const subject = 'Bienvenue sur EventMaster — Votre compte a été créé';
  const text = `Bonjour ${params.name},\n\nL'administrateur EventMaster vous a créé un compte sur la plateforme.\n\nVos identifiants de connexion :\n- E-mail : ${params.email}\n${params.password ? `- Mot de passe temporaire : ${params.password}\n` : ''}- Rôle : ${roleLabel}\n${params.tenantName ? `- Organisation : ${params.tenantName}\n` : ''}\nConnectez-vous dès maintenant : ${loginUrl}\n\nPour votre sécurité, modifiez votre mot de passe dès votre première connexion dans votre profil.\n\nL'équipe EventMaster`;

  const html = wrapBrandedEmail({
    branding: brand,
    orgName: platformName,
    title: 'Votre compte a été créé',
    eyebrow: 'Bienvenue',
    headerEmoji: '🎉',
    innerHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${escapeHtml(params.name)}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">L'administrateur de la plateforme vient de vous créer un compte actif sur <strong>${escapeHtml(platformName)}</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin:20px 0;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">Vos informations de connexion :</p>
        <p style="margin:0 0 6px;font-size:14px;color:#334155;">• Identifiant / E-mail : <strong style="color:#0f172a;">${escapeHtml(params.email)}</strong></p>
        ${params.password ? `<p style="margin:0 0 6px;font-size:14px;color:#334155;">• Mot de passe temporaire : <code style="background:#e2e8f0;padding:3px 8px;border-radius:6px;font-family:monospace;font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(params.password)}</code></p>` : ''}
        <p style="margin:0 0 6px;font-size:14px;color:#334155;">• Rôle attribué : <strong>${escapeHtml(roleLabel)}</strong></p>
        ${params.tenantName ? `<p style="margin:0;font-size:14px;color:#334155;">• Organisation : <strong>${escapeHtml(params.tenantName)}</strong></p>` : ''}
      </div>
      <p style="margin:16px 0 24px;font-size:13px;color:#64748b;line-height:1.5;">Nous vous recommandons de modifier ce mot de passe dès votre première connexion dans la section <em>Mon profil</em>.</p>
    `,
    cta: {
      href: loginUrl,
      label: 'Accéder à mon compte',
    },
    footerNote: 'Ce compte a été configuré par un administrateur EventMaster.',
  });

  return sendRealEmail(params.email, subject, text, html);
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
