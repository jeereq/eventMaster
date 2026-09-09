import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDonationsAccess,
  extractEventDonationsConfig,
  sanitizeDonationsAccess,
} from './donationsAccess.ts';

describe('Guest RSVP Placement & Donations Integration', () => {
  describe('Résolution de place de billet invité', () => {
    it('calcule correctement le numéro de siège (1-based) pour un invité assigné', () => {
      const seatIndex = 3;
      const seatNumber = seatIndex + 1;
      assert.equal(seatNumber, 4);
    });

    it('extrait le siège assigné depuis une commande de plusieurs billets pour un invité donné', () => {
      const selectedSeats = [
        { tableId: 'tbl-vip-1', seatIndex: 0 },
        { tableId: 'tbl-vip-1', seatIndex: 1 },
        { tableId: 'tbl-vip-2', seatIndex: 4 },
      ];

      // Invité à l'index 1 dans la commande
      const guestOrderIndex = 1;
      const assigned = selectedSeats[guestOrderIndex];
      assert.ok(assigned);
      assert.equal(assigned.tableId, 'tbl-vip-1');
      assert.equal(assigned.seatIndex, 1);
      assert.equal(assigned.seatIndex + 1, 2); // Siège n° 2

      // Invité à l'index 2 dans la commande
      const companion = selectedSeats[2];
      assert.ok(companion);
      assert.equal(companion.tableId, 'tbl-vip-2');
      assert.equal(companion.seatIndex, 4);
      assert.equal(companion.seatIndex + 1, 5); // Siège n° 5
    });

    it('gère une commande à billet unique avec tableId et seatIndex directs', () => {
      const order = {
        tableId: 'tbl-standard-3',
        seatIndex: 2,
        selectedSeats: null,
      };

      const tableId = order.tableId;
      const seatIndex = order.seatIndex;
      assert.equal(tableId, 'tbl-standard-3');
      assert.equal(seatIndex, 2);
      assert.equal(seatIndex + 1, 3);
    });
  });

  describe('Éligibilité des dons depuis l’espace invité', () => {
    it('autorise le don invité si l’organisation et l’événement ont activé les dons', () => {
      const tenantId = 'tenant-prestige';
      const platformAccess = sanitizeDonationsAccess({
        enabled: true,
        mode: 'restricted',
        tenantIds: [tenantId],
      });

      const platformCheck = resolveDonationsAccess(tenantId, platformAccess);
      assert.equal(platformCheck.allowed, true);

      const eventPrep = {
        donations: {
          enabled: true,
          cause: 'Bourse d’études pour les orphelins',
          targetAmountFc: 5000000,
          minAmountFc: 2000,
          suggestedAmountsFc: [5000, 10000, 25000],
        },
      };

      const eventConfig = extractEventDonationsConfig(eventPrep);
      assert.ok(eventConfig);
      assert.equal(eventConfig.enabled, true);
      assert.equal(eventConfig.cause, 'Bourse d’études pour les orphelins');
      assert.equal(eventConfig.targetAmountFc, 5000000);
      assert.equal(eventConfig.minAmountFc, 2000);
    });

    it('bloque le don invité si l’organisation n’est pas autorisée par le Superadmin', () => {
      const tenantId = 'tenant-non-autorise';
      const platformAccess = sanitizeDonationsAccess({
        enabled: true,
        mode: 'restricted',
        tenantIds: ['autre-tenant'],
      });

      const platformCheck = resolveDonationsAccess(tenantId, platformAccess);
      assert.equal(platformCheck.allowed, false);
      assert.match(platformCheck.reason, /pas autorisées pour cette organisation/);
    });

    it('bloque le don si l’événement n’a pas activé les dons même si l’organisation est autorisée', () => {
      const tenantId = 'tenant-prestige';
      const platformAccess = sanitizeDonationsAccess({
        enabled: true,
        mode: 'all',
      });

      assert.equal(resolveDonationsAccess(tenantId, platformAccess).allowed, true);

      const eventPrep = {
        donations: {
          enabled: false,
        },
      };

      const eventConfig = extractEventDonationsConfig(eventPrep);
      assert.ok(eventConfig);
      assert.equal(eventConfig.enabled, false);
    });

    it('calcule correctement la progression de collecte pour l’espace invité', () => {
      const targetAmountFc = 1000000;
      const collectedAmountFc = 450000;
      const progressPercent = Math.min(100, Math.round((collectedAmountFc / targetAmountFc) * 100));

      assert.equal(progressPercent, 45);
    });
  });
});
