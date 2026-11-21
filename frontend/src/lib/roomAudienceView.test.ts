import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyRoomTemplate, type RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import { audienceFocus, audienceViewPose, isTieredRoom } from './roomAudienceView.ts';

describe('découverte des salles en gradins', () => {
  it('reconnaît un cinéma et un amphithéâtre, pas un banquet', () => {
    assert.equal(isTieredRoom(applyRoomTemplate('cinema-hall') as RoomLayoutBlueprint), true);
    assert.equal(isTieredRoom(applyRoomTemplate('amphitheater-slope') as RoomLayoutBlueprint), true);
    assert.equal(isTieredRoom(applyRoomTemplate('banquet-honor') as RoomLayoutBlueprint), false);
  });

  it('vise le centre du grand écran du cinéma', () => {
    const bp = applyRoomTemplate('cinema-hall') as RoomLayoutBlueprint;
    const focus = audienceFocus(bp)!;
    assert.ok(focus.z < -6, 'l’écran est au fond, côté nord');
    assert.ok(focus.y > 2, 'au milieu de la toile, pas au sol');
  });

  it('place la caméra en haut des gradins, plus loin et plus haut qu’au milieu des rangs', () => {
    const bp = applyRoomTemplate('cinema-hall') as RoomLayoutBlueprint;
    const top = audienceViewPose(bp, 'top')!;
    const mid = audienceViewPose(bp, 'middle')!;
    const focus = audienceFocus(bp)!;
    const dist = (p: [number, number, number]) => Math.hypot(p[0] - focus.x, p[2] - focus.z);
    assert.ok(dist(top.pos) > dist(mid.pos));
    assert.ok(top.pos[1] > mid.pos[1]);
    // La caméra reste dans la salle.
    assert.ok(Math.abs(top.pos[0]) <= 17 / 2 && Math.abs(top.pos[2]) <= 21 / 2);
  });

  it('reste sous le plafond d’un auditorium couvert', () => {
    const bp = applyRoomTemplate('modern-auditorium') as RoomLayoutBlueprint;
    const free = audienceViewPose(bp, 'top')!;
    const covered = audienceViewPose(bp, 'top', { ceilingM: 3.8 })!;
    assert.ok(free.pos[1] > 3.8 - 0.35);
    assert.ok(covered.pos[1] <= 3.45 + 1e-9);
  });

  it('descend d’un rang quand le dernier touche presque le plafond', () => {
    const bp = applyRoomTemplate('modern-auditorium') as RoomLayoutBlueprint;
    const pose = audienceViewPose(bp, 'top', { ceilingM: 3 })!;
    assert.ok(pose.pos[1] <= 3 - 0.35 + 1e-9);
  });

  it('baisse le regard depuis le haut des gradins pour voir les rangs', () => {
    const bp = applyRoomTemplate('cinema-hall') as RoomLayoutBlueprint;
    const top = audienceViewPose(bp, 'top')!;
    assert.ok(top.target[1] < top.pos[1]);
  });

  it('ne propose rien pour une salle sans gradins', () => {
    assert.equal(audienceViewPose(applyRoomTemplate('banquet-honor') as RoomLayoutBlueprint), null);
  });
});
