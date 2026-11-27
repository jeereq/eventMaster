import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';
import {
  ARTIST_PLAYLISTS,
  activeMusicEmitters,
  availableMusicSourceModes,
  danceRateForBpm,
  isPlayableAudioFile,
  listMusicEmitters,
  musicDanceFill,
  musicGainAt,
  resolveMusicSourceMode,
  trackTitleFromFileName,
} from './roomMusic.ts';
import { buildGuestSimulation } from './roomGuestSimulation.ts';

function blueprint(fixtures: unknown[], furniture: unknown[] = []): RoomLayoutBlueprint {
  return {
    version: 1,
    roomType: 'BANQUET',
    canvas: { widthM: 20, heightM: 16 },
    fixtures,
    furniture,
    metadata: { totalSeats: 0 },
  } as unknown as RoomLayoutBlueprint;
}

const stage = { id: 'st', kind: 'stage', x: 30, y: 0, w: 40, h: 15, heightM: 0.6 };
const dj = { id: 'dj', kind: 'djBooth', x: 40, y: 20, w: 10, h: 6 };
const speakerA = { id: 'spA', kind: 'speaker', x: 10, y: 48, w: 3, h: 4, speakerStyle: 'column' };
const speakerB = { id: 'spB', kind: 'speaker', x: 87, y: 48, w: 3, h: 4, speakerStyle: 'baffle' };
const danceFloor = { id: 'df', kind: 'zone', zoneKind: 'dance', x: 35, y: 40, w: 30, h: 25 };

describe('sources de musique', () => {
  it('place la sono de la scène à ses deux bords, au-dessus du plancher', () => {
    const all = listMusicEmitters(blueprint([stage]));
    assert.equal(all.stage.length, 2);
    const [left, right] = all.stage;
    // Scène de 8 m centrée en x = 0 : enceintes à ±3,6 m.
    assert.ok(Math.abs(left.x + 3.6) < 0.01 && Math.abs(right.x - 3.6) < 0.01);
    assert.ok(left.y > 2 && left.y < 2.5);
  });

  it('une enceinte = un haut-parleur à sa position, à la hauteur de son style', () => {
    const all = listMusicEmitters(blueprint([speakerA, speakerB]));
    assert.equal(all.speaker.length, 2);
    const column = all.speaker.find((e) => e.fixtureId === 'spA')!;
    const baffle = all.speaker.find((e) => e.fixtureId === 'spB')!;
    assert.ok(column.x < -7 && baffle.x > 7);
    assert.ok(column.y > baffle.y);
  });

  it('« Automatique » préfère les enceintes posées, puis la régie, puis la scène', () => {
    assert.equal(resolveMusicSourceMode('auto', listMusicEmitters(blueprint([stage, dj, speakerA]))), 'speakers');
    assert.equal(resolveMusicSourceMode('auto', listMusicEmitters(blueprint([stage, dj]))), 'dj');
    assert.equal(resolveMusicSourceMode('auto', listMusicEmitters(blueprint([stage]))), 'stage');
    assert.equal(resolveMusicSourceMode('auto', listMusicEmitters(blueprint([]))), null);
  });

  it('ne propose que les sources présentes dans la salle', () => {
    assert.deepEqual(availableMusicSourceModes(blueprint([])), ['auto']);
    assert.deepEqual(availableMusicSourceModes(blueprint([stage])), ['auto', 'stage']);
    assert.deepEqual(availableMusicSourceModes(blueprint([stage, speakerA])), ['auto', 'stage', 'speakers', 'all']);
  });

  it('« Toute la sono » joue sur tout, un mode absent ne joue sur rien', () => {
    assert.equal(activeMusicEmitters(blueprint([stage, dj, speakerA]), 'all').length, 5);
    assert.equal(activeMusicEmitters(blueprint([stage]), 'speakers').length, 0);
  });
});

describe('musique sur l’écran', () => {
  const ledWall = { id: 'led', kind: 'screen', screenKind: 'stageLedWall', x: 38, y: 2, w: 24, h: 4, heightM: 2.4 };
  const tv = { id: 'tv', kind: 'screen', screenKind: 'wallTv', x: 90, y: 50, w: 6, h: 2 };
  const laptop = { id: 'lp', kind: 'screen', screenKind: 'laptop', x: 50, y: 50, w: 2, h: 2 };
  const off = { ...tv, id: 'off', screenPowered: false };

  it('un grand écran joue à gauche et à droite de l’image, une télévision au centre', () => {
    const all = listMusicEmitters(blueprint([ledWall, tv]));
    const wall = all.screen.filter((e) => e.fixtureId === 'led');
    const small = all.screen.filter((e) => e.fixtureId === 'tv');
    assert.equal(wall.length, 2);
    assert.ok(wall[0].x < 0 && wall[1].x > 0);
    assert.ok(wall[0].y > 1 && wall[0].y < 2);
    assert.equal(small.length, 1);
    assert.ok(small[0].y > 1.6);
  });

  it('ignore les ordinateurs et les écrans éteints', () => {
    assert.equal(listMusicEmitters(blueprint([laptop, off])).screen.length, 0);
  });

  it('« Automatique » joue sur l’écran plutôt que sur la scène ou la régie', () => {
    assert.equal(resolveMusicSourceMode('auto', listMusicEmitters(blueprint([stage, dj, ledWall]))), 'screen');
    // Des enceintes posées à la main restent prioritaires.
    assert.equal(resolveMusicSourceMode('auto', listMusicEmitters(blueprint([ledWall, speakerA]))), 'speakers');
    assert.deepEqual(availableMusicSourceModes(blueprint([stage, ledWall])), ['auto', 'screen', 'stage', 'all']);
    assert.equal(activeMusicEmitters(blueprint([stage, ledWall]), 'screen').length, 2);
  });
});

describe('volume selon la place', () => {
  const emitters = activeMusicEmitters(blueprint([speakerA]), 'speakers');
  it('plus fort près de l’enceinte, plus faible au loin', () => {
    const near = musicGainAt({ x: -7.5, y: 1.6, z: 0 }, emitters);
    const far = musicGainAt({ x: 9, y: 1.6, z: 7 }, emitters);
    assert.ok(near > 0.95);
    assert.ok(far < 0.25 && far > 0);
  });
  it('sans sono : partout à plein volume', () => {
    assert.equal(musicGainAt({ x: 0, y: 0, z: 0 }, []), 1);
  });
  it('ne dépasse jamais 1 au milieu de plusieurs enceintes', () => {
    const many = activeMusicEmitters(blueprint([stage, dj, speakerA, speakerB]), 'all');
    assert.ok(musicGainAt({ x: 0, y: 1.6, z: -3 }, many) <= 1);
  });
});

describe('playlists et fichiers', () => {
  it('les quatre artistes demandés, chacun avec sa chaîne officielle et des liens', () => {
    assert.deepEqual(ARTIST_PLAYLISTS.map((p) => p.artist), ['Fally Ipupa', 'Ferré Gola', 'Werrason', 'Koffi Olomide']);
    for (const p of ARTIST_PLAYLISTS) {
      // Liste « mises en ligne » = UU + identifiant de chaîne sans le préfixe UC.
      assert.match(p.youtubePlaylistId, /^UU[\w-]{22}$/);
      assert.equal(p.youtubeChannelUrl.endsWith(`UC${p.youtubePlaylistId.slice(2)}`), true);
      assert.match(p.spotifyUrl, /^https:\/\/open\.spotify\.com\/search\//);
      assert.match(p.deezerUrl, /^https:\/\/www\.deezer\.com\/search\//);
    }
  });
  it('accepte les sons, refuse le reste et les fichiers trop lourds', () => {
    assert.equal(isPlayableAudioFile({ name: 'a.mp3', type: 'audio/mpeg', size: 4e6 }), true);
    assert.equal(isPlayableAudioFile({ name: 'rumba.M4A', type: '' }), true);
    assert.equal(isPlayableAudioFile({ name: 'photo.jpg', type: 'image/jpeg' }), false);
    assert.equal(isPlayableAudioFile({ name: 'long.wav', type: 'audio/wav', size: 200 * 1024 * 1024 }), false);
  });
  it('titre propre à partir du nom de fichier', () => {
    assert.equal(trackTitleFromFileName('01_ma_chanson.mp3'), '01 ma chanson');
    assert.equal(trackTitleFromFileName('.mp3'), 'Morceau sans titre');
  });
});

describe('danse', () => {
  it('un rebond par temps : 80 BPM = vitesse de base', () => {
    assert.equal(danceRateForBpm(80), 1);
    assert.equal(danceRateForBpm(120), 1.5);
    assert.equal(danceRateForBpm(400), 180 / 80);
  });
  it('la musique remplit la piste', () => {
    assert.equal(musicDanceFill(0), 0.9);
    assert.equal(musicDanceFill(1), 1);
    const quiet = buildGuestSimulation(blueprint([], [danceFloor]), { fill: 0.25, dancing: true });
    const party = buildGuestSimulation(blueprint([], [danceFloor]), { fill: 0.25, dancing: true, danceFill: musicDanceFill(0.25) });
    assert.ok(party.dancing > quiet.dancing * 3);
  });
  it('sans invités simulés, la musique amène seulement des danseurs', () => {
    const res = buildGuestSimulation(blueprint([], [danceFloor, { id: 't', kind: 'table', shape: 'round', capacity: 10, x: 20, y: 20 }]), { fill: 0, dancing: true, danceFill: 0.9 });
    assert.equal(res.seated, 0);
    assert.ok(res.dancing > 10);
    assert.ok(res.guests.every((g) => g.pose === 'dancing'));
  });
});
