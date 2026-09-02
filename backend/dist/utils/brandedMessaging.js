"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOrgBrand = loadOrgBrand;
exports.orgBrandFromTenant = orgBrandFromTenant;
exports.withOrgSignoff = withOrgSignoff;
exports.messageAlreadyGreets = messageAlreadyGreets;
exports.wrapBrandedWhatsApp = wrapBrandedWhatsApp;
exports.wrapBrandedEmail = wrapBrandedEmail;
exports.brandedEventDetailsHtml = brandedEventDetailsHtml;
const db_1 = require("../db");
const brandingUtils_1 = require("./brandingUtils");
async function loadOrgBrand(tenantId) {
    if (!tenantId) {
        return { orgName: 'EventMaster', branding: (0, brandingUtils_1.resolveBranding)(null) };
    }
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, branding: true },
    });
    return {
        orgName: tenant?.name?.trim() || 'Organisation',
        branding: (0, brandingUtils_1.resolveBranding)(tenant?.branding),
    };
}
function orgBrandFromTenant(tenant) {
    return {
        orgName: tenant?.name?.trim() || 'Organisation',
        branding: (0, brandingUtils_1.resolveBranding)(tenant?.branding),
    };
}
/** Remplace le signoff EventMaster par le nom de l’organisation. */
function withOrgSignoff(body, orgName) {
    const name = orgName.trim() || 'Organisation';
    return body
        .replace(/\{\{orgName\}\}/g, name)
        .replace(/L'équipe organisatrice · EventMaster/g, name)
        .replace(/L'équipe EventMaster/g, name)
        .replace(/_EventMaster — suivi en temps réel_/g, `_${name} — suivi en temps réel_`)
        .replace(/— EventMaster\b/g, `— ${name}`)
        .replace(/via \*EventMaster\*/g, `via *${name}*`)
        .replace(/via EventMaster/g, `via ${name}`)
        .replace(/envoyé par EventMaster/g, `envoyé par ${name}`)
        .replace(/EventMaster ✨/g, `${name}`)
        .trim();
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function messageAlreadyGreets(body) {
    return /^(bonjour|bonsoir|cher|chère|salut)\b/i.test(body.replace(/^\s+/, '').trim());
}
/**
 * WhatsApp n’accepte pas les couleurs HTML : l’identité passe par le nom d’org,
 * un bandeau texte, et les infos pratiques (tenue / thème) si elles manquent.
 */
function wrapBrandedWhatsApp(body, orgName, extras) {
    const name = orgName.trim() || 'Organisation';
    let text = withOrgSignoff(body, name)
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    const guidelines = extras?.guidelinesBlock?.trim() || '';
    if (guidelines) {
        const alreadyPresent = text.includes(guidelines.slice(0, Math.min(28, guidelines.length))) ||
            /tenue\s*:/i.test(text);
        if (!alreadyPresent) {
            const signoff = `— ${name}`;
            if (text.endsWith(signoff)) {
                text = `${text.slice(0, -signoff.length).trim()}\n\n${guidelines}\n\n${signoff}`;
            }
            else {
                text = `${text}\n\n${guidelines}`;
            }
        }
    }
    const firstLine = text.split('\n')[0]?.trim() || '';
    const orgLine = new RegExp(`^\\*?${escapeRegExp(name)}\\*?$`, 'i');
    const alreadyHasHeader = orgLine.test(firstLine) || firstLine.startsWith(`✨ *${name}*`);
    if (!alreadyHasHeader) {
        text = `*${name}*\n━━━━━━━━━━\n\n${text}`;
    }
    return text.replace(/\n{3,}/g, '\n\n').trim();
}
function wrapBrandedEmail(opts) {
    const primary = opts.branding.primary;
    const accent = opts.branding.accent;
    const rgb = (0, brandingUtils_1.brandingRgb)(primary);
    const org = (0, brandingUtils_1.escapeHtml)(opts.orgName);
    const title = (0, brandingUtils_1.escapeHtml)(opts.title);
    const eyebrow = (0, brandingUtils_1.escapeHtml)(opts.eyebrow || 'Invitation');
    const emoji = opts.headerEmoji || '✨';
    const cta = opts.cta
        ? `<div style="text-align:center;margin:8px 0 8px;">
        <a href="${(0, brandingUtils_1.escapeHtml)(opts.cta.href)}" style="display:inline-block;background-color:${primary};color:#ffffff;padding:16px 32px;font-weight:700;font-size:15px;text-decoration:none;border-radius:14px;box-shadow:0 10px 15px -3px rgba(${rgb},0.32);">
          ${(0, brandingUtils_1.escapeHtml)(opts.cta.label)}
        </a>
      </div>`
        : '';
    const footer = opts.footerNote
        ? `<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px;margin-bottom:0;line-height:1.55;">${opts.footerNote}</p>`
        : '';
    return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f8fafc;padding:40px 15px;margin:0;width:100%;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 25px -3px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg, ${primary} 0%, ${accent} 100%);padding:40px 30px;text-align:center;color:#ffffff;">
          <span style="font-size:28px;display:block;margin-bottom:12px;">${emoji}</span>
          <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.025em;line-height:1.25;">${title}</h1>
          <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.88);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">${eyebrow}</p>
        </div>
        <div style="padding:40px 35px;color:#334155;">
          ${opts.innerHtml}
          ${cta}
          ${footer}
        </div>
        <div style="background-color:#f8fafc;padding:22px 30px;text-align:center;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
            Envoyé par <strong>${org}</strong> via EventMaster.
          </p>
        </div>
      </div>
    </div>
  `;
}
function brandedEventDetailsHtml(branding, rows) {
    const cells = rows
        .filter((row) => row.value.trim())
        .map((row) => `
        <tr>
          <td style="padding:8px 0;font-weight:700;color:#1e293b;width:88px;vertical-align:top;">${(0, brandingUtils_1.escapeHtml)(row.label)}</td>
          <td style="padding:8px 0;color:#475569;vertical-align:top;">${(0, brandingUtils_1.escapeHtml)(row.value)}</td>
        </tr>`)
        .join('');
    return `
    <div style="background-color:#f8fafc;border-radius:18px;padding:22px;margin:0 0 28px;border:1px solid #e2e8f0;">
      <h3 style="margin:0 0 12px;font-size:13px;font-weight:800;color:${branding.primary};text-transform:uppercase;letter-spacing:0.05em;">Détails</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${cells}</table>
    </div>
  `;
}
