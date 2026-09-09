"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WELCOME_GRANT_RULES = exports.WELCOME_GRANT_KEYS = exports.WELCOME_TOKENS_PROTOCOL = exports.WELCOME_TOKENS_CATALOG_FAMILY = exports.WELCOME_TOKEN_VALUE_ENTERPRISE_FC = exports.WELCOME_TOKEN_VALUE_B2B_FC = exports.WELCOME_TOKEN_VALUE_B2C_FC = void 0;
exports.sanitizeWelcomeGrantRules = sanitizeWelcomeGrantRules;
exports.classifyWelcomeOfferKey = classifyWelcomeOfferKey;
exports.resolveWelcomeOffer = resolveWelcomeOffer;
exports.resolveWelcomeAudience = resolveWelcomeAudience;
exports.isEnterprisePlanKey = isEnterprisePlanKey;
exports.welcomeTokenValueFc = welcomeTokenValueFc;
exports.WELCOME_TOKEN_VALUE_B2C_FC = 10_000;
exports.WELCOME_TOKEN_VALUE_B2B_FC = 20_000;
exports.WELCOME_TOKEN_VALUE_ENTERPRISE_FC = 50_000;
exports.WELCOME_TOKENS_CATALOG_FAMILY = 10;
exports.WELCOME_TOKENS_PROTOCOL = 4;
exports.WELCOME_GRANT_KEYS = [
    'b2c',
    'b2b',
    'enterprise',
    'catalog',
    'protocol',
    'manager',
];
const PERSONAL_PLAN_KEYS = new Set(['PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS']);
const ENTERPRISE_PLAN_KEYS = new Set(['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3']);
const CATALOG_PLAN_KEYS = new Set(['VENUE', 'SERVICE', 'CATALOG']);
const B2B_ORG_PLAN_KEYS = new Set(['STANDARD', 'PREMIUM_1', 'PREMIUM_2']);
const MOMENTS_BY_KEY = {
    b2c: ['signup', 'plan_activation', 'never'],
    b2b: ['signup', 'plan_activation', 'never'],
    enterprise: ['signup', 'plan_activation', 'never'],
    catalog: ['signup', 'plan_activation', 'never'],
    protocol: ['team_create', 'never'],
    manager: ['never', 'team_create'],
};
exports.DEFAULT_WELCOME_GRANT_RULES = {
    b2c: { enabled: true, amount: exports.WELCOME_TOKEN_VALUE_B2C_FC, unit: 'fc', moment: 'signup' },
    b2b: { enabled: true, amount: exports.WELCOME_TOKEN_VALUE_B2B_FC, unit: 'fc', moment: 'signup' },
    enterprise: {
        enabled: true,
        amount: exports.WELCOME_TOKEN_VALUE_ENTERPRISE_FC,
        unit: 'fc',
        moment: 'plan_activation',
    },
    catalog: { enabled: true, amount: exports.WELCOME_TOKENS_CATALOG_FAMILY, unit: 'tokens', moment: 'signup' },
    protocol: { enabled: true, amount: exports.WELCOME_TOKENS_PROTOCOL, unit: 'tokens', moment: 'team_create' },
    manager: { enabled: false, amount: 0, unit: 'tokens', moment: 'never' },
};
function normalize(value) {
    return String(value || '').trim().toUpperCase();
}
function clampAmount(value) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed) || parsed < 0)
        return 0;
    return Math.min(100_000_000, parsed);
}
function sanitizeRule(key, raw) {
    const fallback = exports.DEFAULT_WELCOME_GRANT_RULES[key];
    const row = raw && typeof raw === 'object' ? raw : {};
    const unit = row.unit === 'fc' ? 'fc' : row.unit === 'tokens' ? 'tokens' : fallback.unit;
    const allowed = MOMENTS_BY_KEY[key];
    const moment = allowed.includes(row.moment)
        ? row.moment
        : fallback.moment;
    return {
        enabled: row.enabled !== false && moment !== 'never',
        amount: clampAmount(row.amount ?? fallback.amount),
        unit,
        moment,
    };
}
function sanitizeWelcomeGrantRules(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
        b2c: sanitizeRule('b2c', source.b2c),
        b2b: sanitizeRule('b2b', source.b2b),
        enterprise: sanitizeRule('enterprise', source.enterprise),
        catalog: sanitizeRule('catalog', source.catalog),
        protocol: sanitizeRule('protocol', source.protocol),
        manager: sanitizeRule('manager', source.manager),
    };
}
function noneOffer() {
    return {
        key: 'none',
        tokens: 0,
        valueFc: 0,
        shareWithOrg: false,
        fixedTokens: true,
        moment: 'never',
        enabled: false,
    };
}
function offerFromRule(key, rule) {
    if (!rule.enabled || rule.moment === 'never' || rule.amount <= 0)
        return noneOffer();
    const shareWithOrg = key !== 'protocol' && key !== 'manager';
    const fixedTokens = rule.unit === 'tokens';
    return {
        key,
        tokens: fixedTokens ? rule.amount : 0,
        valueFc: fixedTokens ? 0 : rule.amount,
        shareWithOrg,
        fixedTokens,
        moment: rule.moment,
        enabled: true,
    };
}
function classifyWelcomeOfferKey(input) {
    const orgRole = normalize(input.orgRole);
    if (orgRole === 'MANAGER')
        return 'manager';
    if (orgRole === 'PROTOCOL')
        return 'protocol';
    const kind = normalize(input.accountKind);
    const planKey = normalize(input.planKey);
    const intent = String(input.intent || '').trim().toLowerCase();
    if (kind === 'CLIENT' || kind === 'VENDOR' || kind === 'BOTH' || CATALOG_PLAN_KEYS.has(planKey)) {
        return 'catalog';
    }
    if (ENTERPRISE_PLAN_KEYS.has(planKey))
        return 'enterprise';
    if (PERSONAL_PLAN_KEYS.has(planKey) || intent === 'personal' || intent === 'seeker')
        return 'b2c';
    if (intent === 'pro' || B2B_ORG_PLAN_KEYS.has(planKey))
        return 'b2b';
    return 'b2c';
}
function resolveOfferForMoment(key, rules, moment) {
    if (key === 'none')
        return noneOffer();
    if (key === 'enterprise' && moment === 'signup' && rules.enterprise.moment !== 'signup') {
        if (rules.b2b.enabled && rules.b2b.moment === 'signup') {
            return offerFromRule('b2b', rules.b2b);
        }
        return noneOffer();
    }
    const rule = rules[key];
    if (!rule || rule.moment !== moment)
        return noneOffer();
    return offerFromRule(key, rule);
}
function resolveWelcomeOffer(input, options) {
    const rules = sanitizeWelcomeGrantRules(options?.rules);
    const key = classifyWelcomeOfferKey(input);
    if (options?.moment)
        return resolveOfferForMoment(key, rules, options.moment);
    if (key === 'none')
        return noneOffer();
    return offerFromRule(key, rules[key]);
}
function resolveWelcomeAudience(input) {
    const key = classifyWelcomeOfferKey(input);
    if (key === 'enterprise')
        return 'ENTERPRISE';
    if (key === 'b2b')
        return 'B2B';
    return 'B2C';
}
function isEnterprisePlanKey(planKey) {
    return ENTERPRISE_PLAN_KEYS.has(normalize(planKey));
}
function welcomeTokenValueFc(audience, rules) {
    const sanitized = sanitizeWelcomeGrantRules(rules);
    if (audience === 'ENTERPRISE') {
        return sanitized.enterprise.unit === 'fc' ? sanitized.enterprise.amount : exports.WELCOME_TOKEN_VALUE_ENTERPRISE_FC;
    }
    if (audience === 'B2B') {
        return sanitized.b2b.unit === 'fc' ? sanitized.b2b.amount : exports.WELCOME_TOKEN_VALUE_B2B_FC;
    }
    return sanitized.b2c.unit === 'fc' ? sanitized.b2c.amount : exports.WELCOME_TOKEN_VALUE_B2C_FC;
}
