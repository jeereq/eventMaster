export const TERMS_VERSION = '1.0';
export const PRIVACY_VERSION = '1.0';

export const LEGAL_DOCUMENTS = {
  TERMS: { type: 'TERMS', version: TERMS_VERSION },
  PRIVACY: { type: 'PRIVACY', version: PRIVACY_VERSION },
} as const;
