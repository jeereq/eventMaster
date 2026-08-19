import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { isPlatformStaff } from '../middleware/platformAccess';
import { assertCommercialOwnsInvoice } from '../services/platformCommercialScope';
import { assertCanViewInvoices } from '../services/permissionsService';
import {
  buildInvoicePdf,
  findInvoiceById,
  formatInvoiceDetailForApi,
  markInvoicePaid,
  resendInvoiceByEmail,
} from '../services/invoiceService';
import { auditReq } from '../services/adminAuditService';

async function assertInvoiceAccess(req: AuthenticatedRequest, invoiceId: string) {
  const invoice = await findInvoiceById(invoiceId);
  if (!invoice) {
    return { invoice: null, error: 'Facture introuvable.' as const, status: 404 as const };
  }

  if (isPlatformStaff(req.user?.role)) {
    if (req.user?.role === 'COMMERCIAL' && req.user.id) {
      const owns = await assertCommercialOwnsInvoice(req.user.id, invoiceId);
      if (!owns) {
        return { invoice: null, error: 'Accès réservé aux factures de vos organisations parrainées.' as const, status: 403 as const };
      }
    }
    return { invoice, error: null, status: null };
  }

  const userId = req.user?.id;
  const tenantId = req.user?.tenantId;

  if (!userId || !tenantId || invoice.tenantId !== tenantId) {
    return { invoice: null, error: 'Accès refusé.' as const, status: 403 as const };
  }

  if (!(await assertCanViewInvoices(userId, tenantId))) {
    return { invoice: null, error: 'Accès réservé au propriétaire et aux managers.' as const, status: 403 as const };
  }

  return { invoice, error: null, status: null };
}

export async function getInvoiceDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { invoice, error, status } = await assertInvoiceAccess(req, id);

    if (!invoice) {
      return res.status(status || 404).json({ error });
    }

    return res.json({ invoice: formatInvoiceDetailForApi(invoice) });
  } catch (err: any) {
    console.error('Erreur getInvoiceDetail:', err);
    return res.status(500).json({ error: 'Impossible de charger la facture.' });
  }
}

export async function downloadInvoicePdf(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { invoice, error, status } = await assertInvoiceAccess(req, id);

    if (!invoice) {
      return res.status(status || 404).json({ error });
    }

    const pdf = await buildInvoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );
    return res.send(pdf);
  } catch (err: any) {
    console.error('Erreur downloadInvoicePdf:', err);
    return res.status(500).json({ error: 'Impossible de générer le PDF.' });
  }
}

export async function sendInvoiceByEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { email } = req.body as { email?: string };

    const { invoice, error, status } = await assertInvoiceAccess(req, id);
    if (!invoice) {
      return res.status(status || 404).json({ error });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Adresse e-mail invalide.' });
    }

    const result = await resendInvoiceByEmail(id, email?.trim());

    return res.json({
      message: email
        ? `Facture envoyée à ${result.sentTo.join(', ')}.`
        : `Facture renvoyée à ${result.sentTo.join(', ')}.`,
      sentTo: result.sentTo,
    });
  } catch (err: any) {
    console.error('Erreur sendInvoiceByEmail:', err);
    return res.status(500).json({ error: err.message || 'Impossible d\'envoyer la facture.' });
  }
}

export async function markAdminInvoicePaid(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
      return res.status(403).json({ error: 'Seul le Super Admin peut déclarer une facture payée.' });
    }

    const id = req.params.id as string;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 8) {
      return res.status(400).json({ error: 'Motif obligatoire (8 caractères min.). Paiement hors plateforme.' });
    }

    const { invoice, error, status } = await assertInvoiceAccess(req, id);
    if (!invoice) {
      return res.status(status || 404).json({ error });
    }

    const result = await markInvoicePaid({
      invoiceId: id,
      paidByUserId: req.user.id,
      reason,
    });
    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Facture introuvable.' });
    }
    if (result.error === 'ALREADY_PAID') {
      return res.status(400).json({ error: 'Cette facture est déjà marquée payée.' });
    }

    await auditReq(req, {
      action: 'INVOICE_MARK_PAID',
      targetType: 'platform_invoice',
      targetId: result.invoice.id,
      tenantId: result.invoice.tenantId,
      summary: `Facture ${result.invoice.invoiceNumber} déclarée payée (hors plateforme)`,
      metadata: { reason, invoiceNumber: result.invoice.invoiceNumber },
    });

    return res.json({
      message: 'Facture marquée payée. Le paiement reste hors plateforme.',
      invoice: formatInvoiceDetailForApi(result.invoice),
    });
  } catch (err: unknown) {
    console.error('Erreur markAdminInvoicePaid:', err);
    return res.status(500).json({ error: 'Impossible de marquer la facture payée.' });
  }
}
