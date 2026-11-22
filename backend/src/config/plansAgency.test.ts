import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { B2B_PLAN_KEYS, getDefaultPlans, normalizePlanKey, PAID_PLAN_KEYS, PLAN_KEYS } from './plansConfig.ts';
import { DEFAULT_PLAN_SMS_INCLUDED } from './smsCreditsConfig.ts';

describe('forfait Agence', () => {
  const plans = getDefaultPlans();

  it('est déclaré, payant et destiné aux organisations', () => {
    assert.ok(PLAN_KEYS.includes('AGENCY'));
    assert.ok(PAID_PLAN_KEYS.includes('AGENCY'));
    assert.ok(B2B_PLAN_KEYS.includes('AGENCY'));
    assert.equal(normalizePlanKey('AGENCY'), 'AGENCY');
    assert.equal(plans.AGENCY.audience, 'B2B');
    assert.equal(plans.AGENCY.monthlyPriceFc, 220000);
  });

  it('se place entre Premium Plus et Enterprise, sans dépasser Enterprise', () => {
    const { PREMIUM_2: low, AGENCY: mid, ENTERPRISE_1: high } = plans;
    for (const key of ['monthlyPriceFc', 'maxGuests', 'maxEvents', 'maxRooms', 'maxOrgManagers', 'maxTemplates'] as const) {
      assert.ok(low[key] < mid[key], `${key} > Premium Plus`);
      assert.ok(mid[key] < high[key], `${key} < Enterprise`);
    }
    assert.equal(mid.adminReports, true);
    assert.equal(mid.roomEditorLevel, 'advanced');
  });

  it('inclut 300 SMS par mois', () => {
    assert.equal(DEFAULT_PLAN_SMS_INCLUDED.AGENCY, 300);
  });
});
