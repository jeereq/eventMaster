/**
 * Musique dans la salle 3D : d'où vient le son (scène, régie DJ, enceintes posées
 * sur le plan), à quel volume on l'entend selon sa place, et à quel rythme les
 * invités dansent sur la piste.
 *
 * Droits d'auteur : aucun fichier audio n'est livré avec l'application. Les playlists
 * d'artistes passent par leurs chaînes YouTube officielles (lecteur intégré, la
 * diffusion reste chez YouTube et les ayants droit sont rémunérés), avec des liens
 * vers Spotify et Deezer. L'utilisateur peut aussi écouter ses propres fichiers :
 * ils restent dans son navigateur et ne sont jamais envoyés au serveur.
 *
 * Module pur (sans Three.js ni React) : positions en mètres dans le repère monde de
 * la 3D (x ∈ [-w/2, w/2], z ∈ [-d/2, d/2]), même convention que la simulation d'invités.
 */
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';

/* ------------------------------------------------------------------ */
/* Enceintes                                                            */
/* ------------------------------------------------------------------ */

/** Enceinte posée sur le plan : sur trépied, gros baffle au sol, ou colonne fine. */
export type SpeakerStyle = 'column' | 'baffle' | 'tower';

export const SPEAKER_STYLES: ReadonlyArray<{ id: SpeakerStyle; label: string; hint: string }> = [
  { id: 'column', label: 'Enceinte sur pied', hint: 'Enceinte de sono sur trépied, tête à 1,8 m' },
  { id: 'baffle', label: 'Baffle au sol', hint: 'Gros baffle de fête avec deux haut-parleurs et caisson de basses' },
  { id: 'tower', label: 'Colonne', hint: 'Colonne fine et discrète, pour un salon ou une cérémonie' },
];

export const speakerStyleLabels: Record<SpeakerStyle, string> = {
  column: 'Enceinte sur pied',
  baffle: 'Baffle au sol',
  tower: 'Colonne',
};

/** Empreinte réelle au sol (m) et hauteur du haut-parleur principal (m). */
export const SPEAKER_STYLE_SPECS: Record<SpeakerStyle, { w: number; d: number; heightM: number; emitterY: number }> = {
  column: { w: 0.7, d: 0.7, heightM: 2.05, emitterY: 1.75 },
  baffle: { w: 0.75, d: 0.6, heightM: 1.25, emitterY: 0.8 },
  tower: { w: 0.4, d: 0.4, heightM: 1.95, emitterY: 1.4 },
};

export function resolveSpeakerStyle(style: unknown): SpeakerStyle {
  return style === 'baffle' || style === 'tower' ? style : 'column';
}

/* ------------------------------------------------------------------ */
/* Sources de son                                                       */
/* ------------------------------------------------------------------ */

/** D'où joue la musique : la sono de la scène, la régie DJ, les enceintes posées, ou tout à la fois. */
export type MusicSourceMode = 'auto' | 'stage' | 'dj' | 'speakers' | 'all';

export const MUSIC_SOURCE_MODES: ReadonlyArray<{ id: MusicSourceMode; label: string; hint: string }> = [
  { id: 'auto', label: 'Automatique', hint: 'Les enceintes posées, sinon la régie DJ, sinon la scène' },
  { id: 'stage', label: 'Sur la scène', hint: 'Sono de façade aux deux bords de la scène' },
  { id: 'dj', label: 'Régie DJ', hint: 'Les deux enceintes de la cabine DJ' },
  { id: 'speakers', label: 'Enceintes et baffles', hint: 'Les enceintes que vous avez posées dans la salle' },
  { id: 'all', label: 'Toute la sono', hint: 'Scène, régie DJ et enceintes ensemble' },
];

export type MusicEmitterKind = 'stage' | 'dj' | 'speaker';

/** Point d'où sort le son (un haut-parleur), en mètres dans le repère de la 3D. */
export interface MusicEmitter {
  id: string;
  kind: MusicEmitterKind;
  /** Élément du plan qui porte ce haut-parleur. */
  fixtureId: string;
  label: string;
  x: number;
  y: number;
  z: number;
}

export interface MusicSourceOptions {
  /** Hauteur de l'étage d'un élément (bâtiments à plusieurs niveaux). */
  storyElevation?: (storyId: string | undefined) => number;
}

type Fixture = RoomLayoutBlueprint['fixtures'][number];

function canvasOf(blueprint: RoomLayoutBlueprint) {
  const widthM = blueprint.canvas?.widthM > 0 ? blueprint.canvas.widthM : 20;
  const depthM = blueprint.canvas?.heightM > 0 ? blueprint.canvas.heightM : 16;
  return { widthM, depthM };
}

/** Rotation autour de Y, même convention que Three.js (groupe tourné de `rot`). */
function rotateY(x: number, z: number, rot: number): [number, number] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [x * c + z * s, -x * s + z * c];
}

/** Points d'émission d'un élément : centre pour une enceinte, deux côtés pour une scène ou une régie. */
function emittersOf(f: Fixture, kind: MusicEmitterKind, widthM: number, depthM: number, floorY: number): MusicEmitter[] {
  const cx = ((f.x + f.w / 2) / 100 - 0.5) * widthM;
  const cz = ((f.y + f.h / 2) / 100 - 0.5) * depthM;
  if (kind === 'speaker') {
    const spec = SPEAKER_STYLE_SPECS[resolveSpeakerStyle(f.speakerStyle)];
    return [{ id: `${f.id}:0`, kind, fixtureId: f.id, label: f.label || speakerStyleLabels[resolveSpeakerStyle(f.speakerStyle)], x: cx, y: floorY + spec.emitterY, z: cz }];
  }
  const rot = ((f.rotation ?? 0) * Math.PI) / 180;
  const halfW = (f.w / 100) * widthM / 2;
  // Scène : sono de façade aux deux bords ; régie : ses enceintes sur pied, de part et d'autre du meuble.
  const top = kind === 'stage' ? (f.heightM ?? 0.45) + 1.6 : 1.65;
  const offset = kind === 'stage' ? Math.max(0, halfW - 0.4) : Math.min(halfW * 2, 2.4) / 2 + 0.45;
  return [-1, 1].map((side, i) => {
    const [dx, dz] = rotateY(side * offset, 0, rot);
    return {
      id: `${f.id}:${i}`,
      kind,
      fixtureId: f.id,
      label: f.label || (kind === 'stage' ? 'Scène' : 'Régie DJ'),
      x: cx + dx,
      y: floorY + top,
      z: cz + dz,
    };
  });
}

/** Tous les haut-parleurs de la salle, rangés par type d'élément. */
export function listMusicEmitters(blueprint: RoomLayoutBlueprint, options: MusicSourceOptions = {}): Record<MusicEmitterKind, MusicEmitter[]> {
  const { widthM, depthM } = canvasOf(blueprint);
  const storyY = options.storyElevation ?? (() => 0);
  const out: Record<MusicEmitterKind, MusicEmitter[]> = { stage: [], dj: [], speaker: [] };
  for (const f of blueprint.fixtures ?? []) {
    const kind: MusicEmitterKind | null = f.kind === 'speaker' ? 'speaker' : f.kind === 'djBooth' ? 'dj' : f.kind === 'stage' ? 'stage' : null;
    if (!kind) continue;
    out[kind].push(...emittersOf(f, kind, widthM, depthM, storyY(f.storyId)));
  }
  return out;
}

/** Choix « Automatique » : les enceintes posées d'abord, puis la régie, puis la scène. */
export function resolveMusicSourceMode(mode: MusicSourceMode, all: Record<MusicEmitterKind, MusicEmitter[]>): Exclude<MusicSourceMode, 'auto'> | null {
  if (mode === 'stage') return all.stage.length > 0 ? 'stage' : null;
  if (mode === 'dj') return all.dj.length > 0 ? 'dj' : null;
  if (mode === 'speakers') return all.speaker.length > 0 ? 'speakers' : null;
  if (mode === 'all') return all.stage.length + all.dj.length + all.speaker.length > 0 ? 'all' : null;
  if (all.speaker.length > 0) return 'speakers';
  if (all.dj.length > 0) return 'dj';
  if (all.stage.length > 0) return 'stage';
  return null;
}

/** Haut-parleurs actifs pour le mode choisi ; vide = musique d'ambiance sans source précise. */
export function activeMusicEmitters(blueprint: RoomLayoutBlueprint, mode: MusicSourceMode, options: MusicSourceOptions = {}): MusicEmitter[] {
  const all = listMusicEmitters(blueprint, options);
  const resolved = resolveMusicSourceMode(mode, all);
  if (resolved === 'stage') return all.stage;
  if (resolved === 'dj') return all.dj;
  if (resolved === 'speakers') return all.speaker;
  if (resolved === 'all') return [...all.stage, ...all.dj, ...all.speaker];
  return [];
}

/** Modes proposés dans le panneau : seulement ceux qui ont une source dans la salle. */
export function availableMusicSourceModes(blueprint: RoomLayoutBlueprint): MusicSourceMode[] {
  const all = listMusicEmitters(blueprint);
  const modes: MusicSourceMode[] = ['auto'];
  if (all.stage.length > 0) modes.push('stage');
  if (all.dj.length > 0) modes.push('dj');
  if (all.speaker.length > 0) modes.push('speakers');
  if (modes.length > 2) modes.push('all');
  return modes;
}

/**
 * Volume perçu (0 – 1) à la position de l'auditeur : modèle « inverse distance »
 * des navigateurs (distance de référence 2,5 m), sources sommées en énergie.
 * Sans source, la musique est diffusée partout à plein volume.
 */
export function musicGainAt(listener: { x: number; y: number; z: number }, emitters: ReadonlyArray<MusicEmitter>, refDistance = 2.5, rolloff = 1): number {
  if (emitters.length === 0) return 1;
  let energy = 0;
  for (const e of emitters) {
    const d = Math.hypot(listener.x - e.x, listener.y - e.y, listener.z - e.z);
    const g = refDistance / (refDistance + rolloff * Math.max(0, d - refDistance));
    energy += g * g;
  }
  // Deux enceintes côte à côte ne doivent pas doubler le volume : on plafonne à 1.
  return Math.max(0, Math.min(1, Math.sqrt(energy)));
}

/* ------------------------------------------------------------------ */
/* Playlists                                                            */
/* ------------------------------------------------------------------ */

export interface ArtistPlaylist {
  id: string;
  artist: string;
  /** Une ligne pour situer l'artiste. */
  blurb: string;
  /** Liste « mises en ligne » de la chaîne YouTube officielle de l'artiste (UU + identifiant de chaîne). */
  youtubePlaylistId: string;
  youtubeChannelUrl: string;
  spotifyUrl: string;
  deezerUrl: string;
  /** Tempo moyen approximatif de ses morceaux de danse, pour le rythme des danseurs. */
  bpm: number;
}

const searchUrl = (base: string, q: string) => `${base}${encodeURIComponent(q)}`;

/**
 * Chaînes YouTube officielles (badge « artiste » de YouTube), vérifiées en novembre 2026.
 * Le lecteur intégré lit les clips mis en ligne par l'artiste lui-même.
 */
export const ARTIST_PLAYLISTS: ReadonlyArray<ArtistPlaylist> = [
  {
    id: 'fally-ipupa',
    artist: 'Fally Ipupa',
    blurb: 'Rumba et ndombolo, de « Eloko Oyo » à « Formule 7 »',
    youtubePlaylistId: 'UUBFYkrVI8OfHm9PzbAGFqlA',
    youtubeChannelUrl: 'https://www.youtube.com/channel/UCBFYkrVI8OfHm9PzbAGFqlA',
    spotifyUrl: searchUrl('https://open.spotify.com/search/', 'Fally Ipupa'),
    deezerUrl: searchUrl('https://www.deezer.com/search/', 'Fally Ipupa'),
    bpm: 116,
  },
  {
    id: 'ferre-gola',
    artist: 'Ferré Gola',
    blurb: 'La voix de la rumba congolaise, « Dynastie »',
    youtubePlaylistId: 'UU50C2EVYREngY7d_ujAFp5w',
    youtubeChannelUrl: 'https://www.youtube.com/channel/UC50C2EVYREngY7d_ujAFp5w',
    spotifyUrl: searchUrl('https://open.spotify.com/search/', 'Ferré Gola'),
    deezerUrl: searchUrl('https://www.deezer.com/search/', 'Ferré Gola'),
    bpm: 108,
  },
  {
    id: 'werrason',
    artist: 'Werrason',
    blurb: 'Le roi de la forêt et Wenge Musica Maison Mère',
    youtubePlaylistId: 'UUVu1wOIMsar1sbWLW5y_vSw',
    youtubeChannelUrl: 'https://www.youtube.com/channel/UCVu1wOIMsar1sbWLW5y_vSw',
    spotifyUrl: searchUrl('https://open.spotify.com/search/', 'Werrason'),
    deezerUrl: searchUrl('https://www.deezer.com/search/', 'Werrason'),
    bpm: 124,
  },
  {
    id: 'koffi-olomide',
    artist: 'Koffi Olomide',
    blurb: 'Le Grand Mopao, tcha tcho et Quartier Latin',
    youtubePlaylistId: 'UUZrtjyeundHobunr-h8Wlbg',
    youtubeChannelUrl: 'https://www.youtube.com/channel/UCZrtjyeundHobunr-h8Wlbg',
    spotifyUrl: searchUrl('https://open.spotify.com/search/', 'Koffi Olomide'),
    deezerUrl: searchUrl('https://www.deezer.com/search/', 'Koffi Olomide'),
    bpm: 112,
  },
];

export function findArtistPlaylist(id: string | null | undefined): ArtistPlaylist | null {
  return ARTIST_PLAYLISTS.find((p) => p.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Fichiers de l'utilisateur                                            */
/* ------------------------------------------------------------------ */

/** Taille maximale d'un fichier audio importé (lu en local, jamais envoyé). */
export const MAX_LOCAL_AUDIO_BYTES = 80 * 1024 * 1024;
export const MAX_LOCAL_TRACKS = 50;

/** Fichier audio lisible par le navigateur ? (type MIME ou extension connue) */
export function isPlayableAudioFile(file: { name: string; type?: string; size?: number }): boolean {
  if ((file.size ?? 0) > MAX_LOCAL_AUDIO_BYTES) return false;
  if (file.type && file.type.startsWith('audio/')) return true;
  return /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(file.name);
}

/** Titre affiché d'un fichier : sans extension, tirets bas remplacés par des espaces. */
export function trackTitleFromFileName(name: string): string {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.slice(0, 120) || 'Morceau sans titre';
}

/* ------------------------------------------------------------------ */
/* Danse                                                                */
/* ------------------------------------------------------------------ */

/** Tempo par défaut quand on ne connaît pas le morceau (fichier personnel). */
export const DEFAULT_DANCE_BPM = 114;

/**
 * Facteur de vitesse de l'animation des danseurs : leur pas de base (sans musique)
 * rebondit environ 80 fois par minute ; on cale un rebond sur chaque temps.
 */
export function danceRateForBpm(bpm: number): number {
  const b = Number.isFinite(bpm) ? Math.max(60, Math.min(180, bpm)) : DEFAULT_DANCE_BPM;
  return b / 80;
}

/** Part de la piste remplie quand la musique joue : elle attire du monde. */
export function musicDanceFill(baseFill: number | undefined): number {
  return Math.max(0.9, Math.min(1, baseFill ?? 0));
}
