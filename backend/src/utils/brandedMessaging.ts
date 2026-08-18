import { prisma } from '../db';
import {
  brandingRgb,
  escapeHtml,
  resolveBranding,
  type ResolvedBranding,
} from './brandingUtils';

export type OrgBrandContext = {
  orgName: string;
  branding: ResolvedBranding;
};

export async function loadOrgBrand(tenantId: string | null | undefined): Promise<OrgBrandContext> {
  if (!tenantId) {
    return { orgName: 'EventMaster', branding: resolveBranding(null) };
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, branding: true },
  });
  return {
    orgName: tenant?.name?.trim() || 'Organisation',
    branding: resolveBranding(tenant?.branding),
  };
}

export function orgBrandFromTenant(tenant?: { name?: string | null; branding?: unknown } | null): OrgBrandContext {
  return {
    orgName: tenant?.name?.trim() || 'Organisation',
    branding: resolveBranding(tenant?.branding),
  };
}

/** Remplace le signoff EventMaster par le nom de l’organisation. */
export function withOrgSignoff(body: string, orgName: string): string {
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

export function wrapBrandedEmail(opts: {
  branding: ResolvedBranding;
  orgName: string;
  title: string;
  eyebrow?: string;
  headerEmoji?: string;
  innerHtml: string;
  cta?: { href: string; label: string };
  footerNote?: string;
}): string {
  const primary = opts.branding.primary;
  const accent = opts.branding.accent;
  const rgb = brandingRgb(primary);
  const org = escapeHtml(opts.orgName);
  const title = escapeHtml(opts.title);
  const eyebrow = escapeHtml(opts.eyebrow || 'Invitation');
  const emoji = opts.headerEmoji || '✨';
  const cta = opts.cta
    ? `<div style="text-align:center;margin:8px 0 8px;">
        <a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background-color:${primary};color:#ffffff;padding:16px 32px;font-weight:700;font-size:15px;text-decoration:none;border-radius:14px;box-shadow:0 10px 15px -3px rgba(${rgb},0.32);">
          ${escapeHtml(opts.cta.label)}
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

export function brandedEventDetailsHtml(
  branding: ResolvedBranding,
  rows: Array<{ label: string; value: string }>,
): string {
  const cells = rows
    .filter((row) => row.value.trim())
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 0;font-weight:700;color:#1e293b;width:88px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;color:#475569;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join('');
  return `
    <div style="background-color:#f8fafc;border-radius:18px;padding:22px;margin:0 0 28px;border:1px solid #e2e8f0;">
      <h3 style="margin:0 0 12px;font-size:13px;font-weight:800;color:${branding.primary};text-transform:uppercase;letter-spacing:0.05em;">Détails</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${cells}</table>
    </div>
  `;
}
