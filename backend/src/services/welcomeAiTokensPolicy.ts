export const WELCOME_TOKEN_VALUE_B2C_FC = 10_000;
export const WELCOME_TOKEN_VALUE_B2B_FC = 20_000;
export const WELCOME_TOKEN_VALUE_ENTERPRISE_FC = 50_000;
export const WELCOME_TOKENS_CATALOG_FAMILY = 10;
export const WELCOME_TOKENS_PROTOCOL = 4;

export type WelcomeAudience = 'B2C' | 'B2B' | 'ENTERPRISE';
export type WelcomeOfferKey = 'none' | 'protocol' | 'catalog' | 'b2c' | 'b2b' | 'enterprise';

export type WelcomeOffer =
  | { key: 'none'; tokens: 0; valueFc: 0; shareWithOrg: false; fixedTokens: true }
  | { key: 'protocol'; tokens: number; valueFc: 0; shareWithOrg: false; fixedTokens: true }
  | { key: 'catalog'; tokens: number; valueFc: 0; shareWithOrg: true; fixedTokens: true }
  | { key: 'b2c'; tokens: 0; valueFc: number; shareWithOrg: true; fixedTokens: false }
  | { key: 'b2b'; tokens: 0; valueFc: number; shareWithOrg: true; fixedTokens: false }
  | { key: 'enterprise'; tokens: 0; valueFc: number; shareWithOrg: true; fixedTokens: false };

const PERSONAL_PLAN_KEYS = new Set(['PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS']);
const ENTERPRISE_PLAN_KEYS = new Set(['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3']);
const CATALOG_PLAN_KEYS = new Set(['VENUE', 'SERVICE', 'CATALOG']);
const B2B_ORG_PLAN_KEYS = new Set(['STANDARD', 'PREMIUM_1', 'PREMIUM_2']);

function normalize(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

function noneOffer(): WelcomeOffer {
  return { key: 'none', tokens: 0, valueFc: 0, shareWithOrg: false, fixedTokens: true };
}

function protocolOffer(): WelcomeOffer {
  return {
    key: 'protocol',
    tokens: WELCOME_TOKENS_PROTOCOL,
    valueFc: 0,
    shareWithOrg: false,
    fixedTokens: true,
  };
}

function catalogOffer(): WelcomeOffer {
  return {
    key: 'catalog',
    tokens: WELCOME_TOKENS_CATALOG_FAMILY,
    valueFc: 0,
    shareWithOrg: true,
    fixedTokens: true,
  };
}

function b2cOffer(): WelcomeOffer {
  return {
    key: 'b2c',
    tokens: 0,
    valueFc: WELCOME_TOKEN_VALUE_B2C_FC,
    shareWithOrg: true,
    fixedTokens: false,
  };
}

function b2bOffer(): WelcomeOffer {
  return {
    key: 'b2b',
    tokens: 0,
    valueFc: WELCOME_TOKEN_VALUE_B2B_FC,
    shareWithOrg: true,
    fixedTokens: false,
  };
}

function enterpriseOffer(): WelcomeOffer {
  return {
    key: 'enterprise',
    tokens: 0,
    valueFc: WELCOME_TOKEN_VALUE_ENTERPRISE_FC,
    shareWithOrg: true,
    fixedTokens: false,
  };
}

export function resolveWelcomeOffer(input: {
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
  orgRole?: string | null;
}): WelcomeOffer {
  const orgRole = normalize(input.orgRole);
  if (orgRole === 'MANAGER') return noneOffer();
  if (orgRole === 'PROTOCOL') return protocolOffer();

  const kind = normalize(input.accountKind);
  const planKey = normalize(input.planKey);
  const intent = String(input.intent || '').trim().toLowerCase();

  if (
    kind === 'CLIENT' ||
    kind === 'VENDOR' ||
    kind === 'BOTH' ||
    CATALOG_PLAN_KEYS.has(planKey)
  ) {
    return catalogOffer();
  }

  if (ENTERPRISE_PLAN_KEYS.has(planKey)) return enterpriseOffer();
  if (PERSONAL_PLAN_KEYS.has(planKey) || intent === 'personal' || intent === 'seeker') {
    return b2cOffer();
  }
  if (intent === 'pro' || kind === 'BOTH' || B2B_ORG_PLAN_KEYS.has(planKey)) {
    return b2bOffer();
  }

  return b2cOffer();
}

export function resolveWelcomeAudience(input: {
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
  orgRole?: string | null;
}): WelcomeAudience {
  const offer = resolveWelcomeOffer(input);
  if (offer.key === 'enterprise') return 'ENTERPRISE';
  if (offer.key === 'b2b') return 'B2B';
  return 'B2C';
}

export function isEnterprisePlanKey(planKey?: string | null): boolean {
  return ENTERPRISE_PLAN_KEYS.has(normalize(planKey));
}

export function welcomeTokenValueFc(audience: WelcomeAudience): number {
  if (audience === 'ENTERPRISE') return WELCOME_TOKEN_VALUE_ENTERPRISE_FC;
  if (audience === 'B2B') return WELCOME_TOKEN_VALUE_B2B_FC;
  return WELCOME_TOKEN_VALUE_B2C_FC;
}
