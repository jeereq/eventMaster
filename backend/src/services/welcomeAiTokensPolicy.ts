export const WELCOME_TOKEN_VALUE_B2C_FC = 10_000;
export const WELCOME_TOKEN_VALUE_B2B_FC = 20_000;

export type WelcomeAudience = 'B2C' | 'B2B';

const B2C_PLAN_KEYS = new Set(['PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS']);
const B2B_PLAN_KEYS = new Set([
  'STANDARD',
  'PREMIUM_1',
  'PREMIUM_2',
  'ENTERPRISE_1',
  'ENTERPRISE_2',
  'ENTERPRISE_3',
  'VENUE',
  'SERVICE',
  'CATALOG',
]);

export function resolveWelcomeAudience(input: {
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
}): WelcomeAudience {
  const intent = String(input.intent || '').trim().toLowerCase();
  if (intent === 'pro') return 'B2B';
  if (intent === 'personal' || intent === 'seeker') return 'B2C';

  const kind = String(input.accountKind || '').trim().toUpperCase();
  if (kind === 'VENDOR' || kind === 'BOTH') return 'B2B';
  if (kind === 'CLIENT') return 'B2C';

  const planKey = String(input.planKey || '').trim().toUpperCase();
  if (B2C_PLAN_KEYS.has(planKey)) return 'B2C';
  if (B2B_PLAN_KEYS.has(planKey)) return 'B2B';

  return 'B2C';
}

export function welcomeTokenValueFc(audience: WelcomeAudience): number {
  return audience === 'B2B' ? WELCOME_TOKEN_VALUE_B2B_FC : WELCOME_TOKEN_VALUE_B2C_FC;
}
