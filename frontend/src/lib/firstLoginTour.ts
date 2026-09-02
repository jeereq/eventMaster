import type { UserGuideId } from '@/config/userGuides';

const TOUR_KEY_PREFIX = 'em-first-tour:';
const ONBOARDING_KEY_PREFIX = 'em-vendor-onboarding:';
export const GETTING_STARTED_STORAGE_KEY = 'em-getting-started';
export const GETTING_STARTED_CHANGED_EVENT = 'em-getting-started-changed';

export type FirstTourStatus = 'pending' | 'seen' | 'skipped';

function storageKey(userId: string) {
  return `${TOUR_KEY_PREFIX}${userId}`;
}

function onboardingStorageKey(userId: string) {
  return `${ONBOARDING_KEY_PREFIX}${userId}`;
}

export function getVendorOnboardingStatus(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(onboardingStorageKey(userId)) === 'done';
  } catch {
    return true;
  }
}

export function setVendorOnboardingStatus(userId: string, done = true) {
  try {
    if (done) {
      localStorage.setItem(onboardingStorageKey(userId), 'done');
    } else {
      localStorage.removeItem(onboardingStorageKey(userId));
    }
  } catch {
    /* ignore */
  }
}

export function getFirstTourStatus(userId: string | null | undefined): FirstTourStatus | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw === 'pending' || raw === 'seen' || raw === 'skipped') return raw;
    return null;
  } catch {
    return null;
  }
}

export function setFirstTourStatus(userId: string, status: FirstTourStatus) {
  try {
    localStorage.setItem(storageKey(userId), status);
  } catch {
    /* ignore */
  }
}

export function shouldAutoOfferFirstTour(guideId: UserGuideId): boolean {
  return guideId !== 'guest' && guideId !== 'super_admin';
}

/** Ajoute ?tour=1 aux destinations dashboard après vérification OTP. */
export function appendFirstTourQuery(path: string): string {
  if (!path.startsWith('/dashboard')) return path;
  if (/(?:^|[?&])tour=/.test(path)) return path;
  return `${path}${path.includes('?') ? '&' : '?'}tour=1`;
}

export function markGettingStartedGuideDone() {
  try {
    const raw = JSON.parse(localStorage.getItem(GETTING_STARTED_STORAGE_KEY) || '{}') as Record<string, unknown>;
    localStorage.setItem(GETTING_STARTED_STORAGE_KEY, JSON.stringify({ ...raw, guideDone: true }));
    window.dispatchEvent(new Event(GETTING_STARTED_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function getFirstLoginWelcome(input: {
  guideId: UserGuideId;
  firstName?: string | null;
  planName?: string | null;
}): { title: string; body: string; cta: string } {
  const name = input.firstName?.trim().split(/\s+/)[0];
  const hello = name ? `Bienvenue, ${name}` : 'Bienvenue';
  const space = input.planName?.trim();

  switch (input.guideId) {
    case 'client':
      return {
        title: hello,
        body: 'Votre compte client est prêt. En une minute, on vous montre où chercher une salle, composer un pack et suivre un devis.',
        cta: 'Lancer la visite',
      };
    case 'org_protocol':
      return {
        title: hello,
        body: 'Votre accès protocole est prêt. On vous montre le tableau de bord, puis le desk Protocole (scan QR et tâches).',
        cta: 'Lancer la visite',
      };
    case 'org_commercial':
      return {
        title: hello,
        body: 'Votre espace commercial est prêt. On vous montre le parrainage, les organisations suivies et les commissions.',
        cta: 'Lancer la visite',
      };
    case 'commercial_platform':
      return {
        title: hello,
        body: 'Votre espace commercial plateforme est prêt. On parcourt les organisations, les demandes et les commissions.',
        cta: 'Lancer la visite',
      };
    default:
      return {
        title: hello,
        body: space
          ? `Votre espace ${space} est prêt. On vous montre le menu, votre première action, et où relancer cette aide.`
          : 'Votre espace est prêt. On vous montre le menu, votre première action, et où relancer cette aide.',
        cta: 'Lancer la visite',
      };
  }
}
