import { Linking } from 'react-native';
import { env } from '../config/env';

export type LegalPage = 'terms' | 'privacy';

const PATHS: Record<LegalPage, string> = {
  terms: '/terms',
  privacy: '/privacy',
};

export function getLegalUrl(page: LegalPage): string {
  return `${env.webUrl}${PATHS[page]}`;
}

export async function openLegalPage(page: LegalPage): Promise<void> {
  const url = getLegalUrl(page);
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('Impossible d\'ouvrir la page. Vérifiez EXPO_PUBLIC_WEB_URL.');
  }
  await Linking.openURL(url);
}
