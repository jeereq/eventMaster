import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getGuestLegalStatus,
  getUserLegalStatus,
  recordGuestLegalAcceptance,
  recordUserLegalAcceptance,
} from '../services/legalService';

function getRequestMeta(req: Request) {
  return {
    ipAddress:
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null,
    userAgent: (req.headers['user-agent'] as string) || null,
  };
}

export async function getGuestLegalStatusHandler(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const status = await getGuestLegalStatus(guestId);

    if (!status) {
      return res.status(404).json({ error: 'Invité non trouvé.' });
    }

    return res.json({
      ...status,
      requiresAcceptance: !(status.termsAccepted && status.privacyAccepted),
    });
  } catch (error) {
    console.error('Erreur statut légal invité:', error);
    return res.status(500).json({ error: 'Impossible de récupérer le statut légal.' });
  }
}

export async function acceptGuestLegalHandler(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const { acceptTerms, acceptPrivacy } = req.body;

    const status = await recordGuestLegalAcceptance({
      guestId,
      acceptTerms: Boolean(acceptTerms),
      acceptPrivacy: Boolean(acceptPrivacy),
      ...getRequestMeta(req),
    });

    if (!status) {
      return res.status(404).json({ error: 'Invité non trouvé.' });
    }

    return res.json({
      message: 'Acceptation enregistrée avec succès.',
      ...status,
      requiresAcceptance: false,
    });
  } catch (error: any) {
    if (error.message === 'TERMS_AND_PRIVACY_REQUIRED') {
      return res.status(400).json({
        error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.',
      });
    }
    console.error('Erreur acceptation légale invité:', error);
    return res.status(500).json({ error: 'Impossible d\'enregistrer votre acceptation.' });
  }
}

export async function getUserLegalStatusHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const status = await getUserLegalStatus(userId);
    if (!status) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    return res.json(status);
  } catch (error) {
    console.error('Erreur statut légal utilisateur:', error);
    return res.status(500).json({ error: 'Impossible de récupérer le statut légal.' });
  }
}

export async function acceptUserLegalHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const { acceptTerms, acceptPrivacy } = req.body;
    const status = await recordUserLegalAcceptance({
      userId,
      acceptTerms: Boolean(acceptTerms),
      acceptPrivacy: Boolean(acceptPrivacy),
      ...getRequestMeta(req),
    });

    if (!status) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    return res.json({
      message: 'Acceptation enregistrée avec succès.',
      ...status,
    });
  } catch (error: any) {
    if (error.message === 'TERMS_AND_PRIVACY_REQUIRED') {
      return res.status(400).json({
        error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.',
      });
    }
    console.error('Erreur acceptation légale utilisateur:', error);
    return res.status(500).json({ error: 'Impossible d\'enregistrer votre acceptation.' });
  }
}
