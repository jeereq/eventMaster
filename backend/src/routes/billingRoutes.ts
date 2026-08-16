import { Router } from 'express';
import { getBillingStatus, createCheckoutSession, mockUpgrade, getPlanFeatures, getTenantInvoices } from '../controllers/billingController';
import { getInvoiceDetail, downloadInvoicePdf, sendInvoiceByEmail } from '../controllers/invoiceController';
import { getMyBranding, updateMyBranding } from '../controllers/brandingController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/status', getBillingStatus);
router.get('/invoices', getTenantInvoices);
router.get('/invoices/:id', getInvoiceDetail);
router.get('/invoices/:id/pdf', downloadInvoicePdf);
router.post('/invoices/:id/send', sendInvoiceByEmail);
router.get('/plan-features', getPlanFeatures);
router.get('/branding', getMyBranding);
router.put('/branding', updateMyBranding);
router.post('/checkout', createCheckoutSession);
router.post('/mock-upgrade', mockUpgrade);

export default router;
