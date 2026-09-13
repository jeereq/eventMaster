import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canSellOnMarketplace,
  getWorkspaceModules,
} from './planAccess.ts';

describe('canSellOnMarketplace', () => {
  it('autorise un ORGANIZER B2B payant', () => {
    assert.equal(
      canSellOnMarketplace({
        accountKind: 'ORGANIZER',
        planFeatures: { audience: 'B2B' } as never,
        planQuota: { limits: { maxServices: 9999 } } as never,
        planId: 'STANDARD',
      }),
      true,
    );
  });

  it('refuse un Particulier (B2C)', () => {
    assert.equal(
      canSellOnMarketplace({
        accountKind: 'ORGANIZER',
        planFeatures: { audience: 'B2C' } as never,
        planQuota: { limits: { maxServices: 0 } } as never,
        planId: 'PERSONAL_100',
      }),
      false,
    );
  });

  it('autorise l’essai FREE via maxServices', () => {
    assert.equal(
      canSellOnMarketplace({
        accountKind: 'ORGANIZER',
        planFeatures: { audience: 'B2B' } as never,
        planQuota: { limits: { maxServices: 1 } } as never,
        planId: 'FREE',
      }),
      true,
    );
  });
});

describe('getWorkspaceModules B2B', () => {
  const access = {
    canManageRooms: true,
    canManageTeam: true,
    isProtocolOnly: false,
    canProtocolAllEvents: true,
    level: 'owner',
  } as never;

  it('montre événements et Mes offres pour Business', () => {
    const workspace = getWorkspaceModules({
      accountKind: 'ORGANIZER',
      access,
      planQuota: {
        limits: { maxEvents: 8, maxRooms: 3, maxTemplates: 5, maxServices: 9999 },
      } as never,
      planFeatures: { audience: 'B2B', protocolQr: true } as never,
    });
    assert.equal(workspace.showEvents, true);
    assert.equal(workspace.showMarketplace, true);
    assert.equal(workspace.showRooms, true);
    assert.equal(workspace.showProtocol, true);
  });

  it('cache Mes offres pour un Particulier sans prestations', () => {
    const workspace = getWorkspaceModules({
      accountKind: 'ORGANIZER',
      access,
      planQuota: {
        limits: { maxEvents: 3, maxRooms: 2, maxTemplates: 9999, maxServices: 0 },
      } as never,
      planFeatures: { audience: 'B2C', protocolQr: true } as never,
    });
    assert.equal(workspace.showEvents, true);
    assert.equal(workspace.showMarketplace, false);
  });
});
