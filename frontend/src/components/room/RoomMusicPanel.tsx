'use client';

/**
 * Panneau « Musique » de la visite 3D : on choisit d'où joue le son (scène, régie DJ,
 * enceintes posées), une playlist d'artiste ou ses propres fichiers, et les invités
 * dansent sur la piste au rythme du morceau.
 *
 * Droits d'auteur : rien n'est livré avec l'application. Les playlists passent par le
 * lecteur YouTube intégré des chaînes officielles (visible, comme l'exigent les règles
 * de YouTube), avec des liens vers Spotify et Deezer. Les fichiers personnels sont lus
 * dans le navigateur et ne quittent jamais l'appareil.
 *
 * Son spatialisé :
 * - fichiers personnels : Web Audio, un panoramique 3D (HRTF) par haut-parleur, l'auditeur
 *   est la caméra (ou les yeux de l'invité en « Vue invité ») ;
 * - YouTube : le son du lecteur ne peut pas être traité, on règle son volume selon la
 *   distance aux haut-parleurs.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  ExternalLink,
  Info,
  Music,
  Pause,
  Play,
  Speaker,
  StepForward,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
  ChevronUp, YouTubeIcon, SpotifyIcon,
} from '@/components/icons';
import {
  ARTIST_PLAYLISTS,
  DEFAULT_DANCE_BPM,
  MAX_LOCAL_TRACKS,
  MUSIC_SOURCE_MODES,
  isPlayableAudioFile,
  musicGainAt,
  trackTitleFromFileName,
  type ArtistPlaylist,
  type MusicEmitter,
  type MusicSourceMode,
} from '@/lib/roomMusic';
import type { MusicListener } from '@/components/room/RoomMusicScene';

/* ------------------------------------------------------------------ */
/* Lecteur YouTube (API IFrame)                                         */
/* ------------------------------------------------------------------ */

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  setVolume(v: number): void;
  loadPlaylist(opts: { list: string; listType: 'playlist'; index?: number }): void;
  getVideoData?: () => { title?: string; author?: string };
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    const fail = () => {
      ytApiPromise = null;
      reject(new Error('Lecteur YouTube indisponible'));
    };
    script.onerror = fail;
    // Réseau filtré ou bloqueur : on n'attend pas indéfiniment.
    window.setTimeout(() => {
      if (!window.YT?.Player) fail();
    }, 30000);
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

/* ------------------------------------------------------------------ */
/* Tempo                                                                */
/* ------------------------------------------------------------------ */

const TEMPO_CHOICES = [
  { bpm: 96, label: 'Rumba lente' },
  { bpm: 112, label: 'Rumba' },
  { bpm: 126, label: 'Ndombolo' },
  { bpm: 140, label: 'Sebene' },
] as const;

interface LocalTrack {
  id: string;
  title: string;
  url: string;
}

export interface RoomMusicPlayback {
  playing: boolean;
  bpm: number;
}

export interface RoomMusicPanelProps {
  /** Panneau déplié (sinon seul le lecteur réduit reste visible pendant la lecture). */
  open: boolean;
  onClose: () => void;
  /** Haut-parleurs qui jouent, pour le mode choisi (vide = musique d'ambiance). */
  emitters: MusicEmitter[];
  modes: MusicSourceMode[];
  mode: MusicSourceMode;
  onModeChange: (mode: MusicSourceMode) => void;
  /** Où se trouve l'auditeur (la caméra), mis à jour par la 3D. */
  listenerRef: React.RefObject<MusicListener>;
  onPlaybackChange: (state: RoomMusicPlayback) => void;
  /** Ce qui manque pour voir danser (pas de piste, invités non inclus…). */
  danceNote?: string | null;
  className?: string;
}

function emitterSummary(emitters: MusicEmitter[]): string {
  if (emitters.length === 0) return 'Ambiance dans toute la salle (aucune sono posée)';
  const fixtures = new Map<string, MusicEmitter>();
  for (const e of emitters) fixtures.set(e.fixtureId, e);
  const list = [...fixtures.values()];
  const speakers = list.filter((e) => e.kind === 'speaker').length;
  const parts: string[] = [];
  if (list.some((e) => e.kind === 'stage')) parts.push('la scène');
  if (list.some((e) => e.kind === 'dj')) parts.push('la régie DJ');
  if (speakers > 0) parts.push(`${speakers} enceinte${speakers > 1 ? 's' : ''}`);
  return `Le son sort de ${parts.join(', ')}`;
}

export default function RoomMusicPanel({
  open,
  onClose,
  emitters,
  modes,
  mode,
  onModeChange,
  listenerRef,
  onPlaybackChange,
  danceNote,
  className,
}: RoomMusicPanelProps) {
  const [tab, setTab] = useState<'artists' | 'files'>('artists');
  const [artist, setArtist] = useState<ArtistPlaylist | null>(null);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytTitle, setYtTitle] = useState('');
  const [ytError, setYtError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(-1);
  const [filePlaying, setFilePlaying] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [spatial, setSpatial] = useState(true);
  const [bpm, setBpm] = useState(DEFAULT_DANCE_BPM);
  const [collapsed, setCollapsed] = useState(false);

  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const graphRef = useRef<{
    ctx: AudioContext;
    source: MediaElementAudioSourceNode;
    master: GainNode;
    ambient: GainNode;
    spatialBus: GainNode;
    panners: Map<string, PannerNode>;
  } | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const playing = ytPlaying || filePlaying;
  const level = muted ? 0 : volume / 100;

  useEffect(() => {
    onPlaybackChange({ playing, bpm });
  }, [playing, bpm, onPlaybackChange]);

  // Les URL locales sont libérées en quittant la salle.
  useEffect(() => () => {
    for (const t of tracksRef.current) URL.revokeObjectURL(t.url);
    try { ytPlayerRef.current?.destroy(); } catch { /* lecteur déjà détruit */ }
    graphRef.current?.ctx.close().catch(() => undefined);
  }, []);

  /* ---------- YouTube ---------- */

  const pauseFile = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const playArtist = useCallback((p: ArtistPlaylist) => {
    pauseFile();
    setArtist(p);
    setBpm(p.bpm);
    setYtError(null);
    setYtTitle('');
    setCollapsed(false);
    const existing = ytPlayerRef.current;
    if (existing) {
      existing.loadPlaylist({ list: p.youtubePlaylistId, listType: 'playlist', index: 0 });
      return;
    }
    loadYouTubeApi().then((YT) => {
      const host = ytHostRef.current;
      if (!host) return;
      const mount = document.createElement('div');
      host.replaceChildren(mount);
      ytPlayerRef.current = new YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: {
          listType: 'playlist',
          list: p.youtubePlaylistId,
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(Math.round(level * 100));
            e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            setYtPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.PLAYING) {
              const data = e.target.getVideoData?.();
              if (data?.title) setYtTitle(data.title);
            }
          },
          // Clip non intégrable ou retiré : on passe au suivant de la chaîne.
          onError: (e: { target: YTPlayer }) => {
            try { e.target.nextVideo(); } catch { /* fin de liste */ }
          },
        },
      });
    }).catch(() => setYtError('Le lecteur YouTube n’a pas pu se charger (connexion ou bloqueur). Ouvrez la playlist sur YouTube, Spotify ou Deezer.'));
  }, [level, pauseFile]);

  const toggleYt = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p) return;
    if (ytPlaying) p.pauseVideo();
    else {
      pauseFile();
      p.playVideo();
    }
  }, [ytPlaying, pauseFile]);

  /* ---------- Fichiers personnels + Web Audio ---------- */

  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return null;
    if (graphRef.current) return graphRef.current;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(audio);
    const master = ctx.createGain();
    const ambient = ctx.createGain();
    const spatialBus = ctx.createGain();
    master.connect(ctx.destination);
    ambient.connect(master);
    spatialBus.connect(master);
    source.connect(ambient);
    graphRef.current = { ctx, source, master, ambient, spatialBus, panners: new Map() };
    return graphRef.current;
  }, []);

  // Un panoramique 3D par haut-parleur actif (8 au plus, les plus nombreux se recouvrent).
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    const wanted = spatial ? emitters.slice(0, 8) : [];
    const keep = new Set(wanted.map((e) => e.id));
    for (const [id, node] of g.panners) {
      if (!keep.has(id)) {
        try { g.source.disconnect(node); } catch { /* déjà débranché */ }
        node.disconnect();
        g.panners.delete(id);
      }
    }
    for (const e of wanted) {
      let node = g.panners.get(e.id);
      if (!node) {
        node = g.ctx.createPanner();
        node.panningModel = 'HRTF';
        node.distanceModel = 'inverse';
        node.refDistance = 2.5;
        node.rolloffFactor = 0.9;
        node.connect(g.spatialBus);
        g.source.connect(node);
        g.panners.set(e.id, node);
      }
      if (node.positionX) {
        node.positionX.value = e.x;
        node.positionY.value = e.y;
        node.positionZ.value = e.z;
      } else {
        node.setPosition(e.x, e.y, e.z);
      }
    }
    // Sans sono précise (ou son 3D coupé) : tout passe par l'ambiance ; sinon un peu de « salle » en fond.
    g.ambient.gain.value = wanted.length === 0 ? 1 : 0.22;
    // Plusieurs enceintes : on répartit le niveau pour ne pas saturer.
    g.spatialBus.gain.value = 1 / Math.sqrt(Math.max(1, wanted.length));
  }, [emitters, spatial, filePlaying]);

  // Volume général.
  useEffect(() => {
    const g = graphRef.current;
    if (g) g.master.gain.value = level;
  }, [level, filePlaying]);

  // L'auditeur suit la caméra ; le volume YouTube suit la distance aux haut-parleurs.
  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      const l = listenerRef.current;
      if (!l) return;
      const g = graphRef.current;
      if (g && filePlaying) {
        const lis = g.ctx.listener;
        const t = g.ctx.currentTime;
        if (lis.positionX) {
          lis.positionX.setTargetAtTime(l.x, t, 0.05);
          lis.positionY.setTargetAtTime(l.y, t, 0.05);
          lis.positionZ.setTargetAtTime(l.z, t, 0.05);
          lis.forwardX.setTargetAtTime(l.fx, t, 0.05);
          lis.forwardY.setTargetAtTime(l.fy, t, 0.05);
          lis.forwardZ.setTargetAtTime(l.fz, t, 0.05);
          lis.upX.setTargetAtTime(l.ux, t, 0.05);
          lis.upY.setTargetAtTime(l.uy, t, 0.05);
          lis.upZ.setTargetAtTime(l.uz, t, 0.05);
        } else {
          lis.setPosition(l.x, l.y, l.z);
          lis.setOrientation(l.fx, l.fy, l.fz, l.ux, l.uy, l.uz);
        }
      }
      const yt = ytPlayerRef.current;
      if (yt && ytPlaying) {
        // Jamais tout à fait muet : depuis la vue d'ensemble on entend la salle de loin.
        const gain = spatial ? 0.3 + 0.7 * musicGainAt(l, emitters) : 1;
        try { yt.setVolume(Math.round(level * gain * 100)); } catch { /* lecteur pas prêt */ }
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [playing, filePlaying, ytPlaying, emitters, level, spatial, listenerRef]);

  const playTrack = useCallback((index: number) => {
    const audio = audioRef.current;
    const track = tracksRef.current[index];
    if (!audio || !track) return;
    try { ytPlayerRef.current?.pauseVideo(); } catch { /* pas de lecteur */ }
    const g = ensureGraph();
    g?.ctx.resume().catch(() => undefined);
    setTrackIndex(index);
    setCollapsed(false);
    if (audio.src !== track.url) audio.src = track.url;
    audio.play().catch(() => setFileNote('Ce fichier ne peut pas être lu par votre navigateur.'));
  }, [ensureGraph]);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const accepted: LocalTrack[] = [];
    let refused = 0;
    for (const file of Array.from(list)) {
      if (tracksRef.current.length + accepted.length >= MAX_LOCAL_TRACKS) { refused += 1; continue; }
      if (!isPlayableAudioFile(file)) { refused += 1; continue; }
      accepted.push({ id: `${Date.now()}-${accepted.length}-${file.name}`, title: trackTitleFromFileName(file.name), url: URL.createObjectURL(file) });
    }
    setFileNote(refused > 0 ? `${refused} fichier${refused > 1 ? 's' : ''} ignoré${refused > 1 ? 's' : ''} (pas un son, plus de 80 Mo, ou plus de ${MAX_LOCAL_TRACKS} morceaux).` : null);
    if (accepted.length === 0) return;
    const start = tracksRef.current.length;
    const next = [...tracksRef.current, ...accepted];
    tracksRef.current = next;
    setTracks(next);
    if (!filePlaying) playTrack(start);
  }, [filePlaying, playTrack]);

  const removeTrack = useCallback((id: string) => {
    const index = tracksRef.current.findIndex((t) => t.id === id);
    if (index < 0) return;
    const [gone] = tracksRef.current.slice(index, index + 1);
    if (index === trackIndex) {
      audioRef.current?.pause();
      audioRef.current?.removeAttribute('src');
      setTrackIndex(-1);
    } else if (index < trackIndex) {
      setTrackIndex((i) => i - 1);
    }
    URL.revokeObjectURL(gone.url);
    setTracks((list) => list.filter((t) => t.id !== id));
  }, [trackIndex]);

  const toggleFile = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (filePlaying) audio.pause();
    else if (trackIndex >= 0) playTrack(trackIndex);
    else if (tracks.length > 0) playTrack(0);
  }, [filePlaying, trackIndex, tracks.length, playTrack]);

  const nextFile = useCallback(() => {
    if (tracks.length === 0) return;
    playTrack((trackIndex + 1) % tracks.length);
  }, [tracks.length, trackIndex, playTrack]);

  const stopAll = useCallback(() => {
    try { ytPlayerRef.current?.pauseVideo(); } catch { /* pas de lecteur */ }
    audioRef.current?.pause();
  }, []);

  const nowPlaying = filePlaying
    ? tracks[trackIndex]?.title ?? ''
    : ytPlaying
      ? ytTitle || artist?.artist || ''
      : '';
  const summary = useMemo(() => emitterSummary(emitters), [emitters]);
  const showYt = artist !== null && tab === 'artists';
  // Panneau fermé : il reste un lecteur réduit tant que la musique joue (le clip YouTube doit rester visible).
  const compact = !open || collapsed;

  return (
    <div
      className={cn(
        'pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/95 text-foreground shadow-lg dark:bg-surface-elevated/95',
        !open && !playing && 'hidden',
        className,
      )}
      role="region"
      aria-label="Musique dans la salle"
    >
      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setFilePlaying(true)}
        onPause={() => setFilePlaying(false)}
        onEnded={nextFile}
        onError={() => setFileNote('Ce fichier ne peut pas être lu par votre navigateur.')}
      />

      {/* En-tête : morceau en cours et commandes principales. */}
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <span className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          playing ? 'bg-primary-solid text-primary-foreground' : 'bg-surface-muted text-foreground/80',
        )}>
          <Music className={cn('h-4 w-4', playing && 'motion-safe:animate-pulse')} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-4 text-muted">{playing ? 'La piste danse sur' : 'Musique dans la salle'}</p>
          <p className="truncate text-sm font-semibold leading-5" aria-live="polite">
            {nowPlaying || (artist ? artist.artist : 'Choisissez une playlist')}
          </p>
        </div>
        {playing || artist || tracks.length > 0 ? (
          <button
            type="button"
            onClick={filePlaying || (!ytPlaying && tab === 'files') ? toggleFile : toggleYt}
            aria-label={playing ? 'Mettre en pause' : 'Lire'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted hover:bg-border/60"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        ) : null}
        {open ? (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Déplier le panneau' : 'Réduire le panneau'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (!open) stopAll();
            onClose();
          }}
          aria-label={open ? 'Fermer le panneau (la musique continue)' : 'Arrêter la musique'}
          title={open ? 'Fermer le panneau (la musique continue)' : 'Arrêter la musique'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Lecteur YouTube : visible dès qu'une playlist d'artiste est chargée. */}
      <div className={cn('relative w-full bg-black', showYt || (artist && ytPlaying) ? 'block' : 'hidden')} style={{ height: 200 }}>
        <div ref={ytHostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      </div>
      {ytError ? <p className="px-3 pt-2 text-xs text-red-600 dark:text-red-400" role="alert">{ytError}</p> : null}

      {!compact ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Source du son */}
          <div className="border-b border-border/70 px-3 py-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Speaker className="h-3.5 w-3.5" /> D’où joue la musique
            </p>
            <div className="flex flex-wrap gap-1">
              {MUSIC_SOURCE_MODES.filter((m) => modes.includes(m.id)).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mode === m.id}
                  title={m.hint}
                  onClick={() => onModeChange(m.id)}
                  className={cn(
                    'min-h-9 rounded-full px-2.5 text-xs font-semibold transition-colors',
                    mode === m.id ? 'bg-primary-solid text-primary-foreground' : 'bg-surface-muted text-foreground/80 hover:text-foreground',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{summary}{modes.includes('speakers') ? '' : ' · ajoutez des enceintes ou un baffle depuis « Ajouter » de l’éditeur'}</p>
            <label className="mt-1.5 flex min-h-9 items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={spatial} onChange={(e) => setSpatial(e.target.checked)} className="h-4 w-4 accent-current" />
              Son 3D : plus fort près des enceintes, selon votre place
            </label>
          </div>

          {/* Onglets */}
          <div className="flex gap-1 px-3 pt-2.5" role="tablist" aria-label="Choix de la musique">
            {([['artists', 'Playlists d’artistes'], ['files', 'Mes fichiers']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'min-h-9 flex-1 rounded-full px-2.5 text-xs font-semibold transition-colors',
                  tab === id ? 'bg-foreground text-background' : 'bg-surface-muted text-foreground/80 hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'artists' ? (
            <ul className="space-y-1 p-2">
              {ARTIST_PLAYLISTS.map((p) => {
                const active = artist?.id === p.id;
                return (
                  <li key={p.id} className={cn('rounded-xl px-2 py-1.5', active ? 'bg-primary-solid/10 ring-1 ring-primary-solid/40' : 'hover:bg-surface-muted')}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (active ? toggleYt() : playArtist(p))}
                        aria-label={active && ytPlaying ? `Mettre en pause ${p.artist}` : `Écouter ${p.artist}`}
                        className={cn(
                          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          active ? 'bg-primary-solid text-primary-foreground' : 'bg-surface-muted text-foreground',
                        )}
                      >
                        {active && ytPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.artist}</span>
                        <span className="block truncate text-xs text-muted">{p.blurb}</span>
                      </span>
                      {active && ytPlaying ? (
                        <button
                          type="button"
                          onClick={() => ytPlayerRef.current?.nextVideo()}
                          aria-label="Morceau suivant"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/80 hover:bg-surface-muted"
                        >
                          <StepForward className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-11 text-xs">
                      <a href={p.youtubeChannelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:text-foreground hover:underline">
                        <YouTubeIcon className="h-3.5 w-3.5" />
                        YouTube
                      </a>
                      <a href={p.spotifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:text-foreground hover:underline">
                        <SpotifyIcon className="h-3.5 w-3.5" />
                        Spotify
                      </a>
                      <a href={p.deezerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:text-foreground hover:underline">
                        Deezer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                );
              })}
              <li className="flex gap-1.5 px-2 pt-1 text-xs text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Clips des chaînes YouTube officielles des artistes, lus par le lecteur YouTube. Le son reste chez YouTube et les artistes sont rémunérés.</span>
              </li>
            </ul>
          ) : (
            <div className="space-y-2 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-semibold hover:bg-surface-muted"
              >
                <Upload className="h-4 w-4" /> Ajouter mes morceaux (MP3, M4A, WAV…)
              </button>
              {fileNote ? <p className="text-xs text-amber-700 dark:text-amber-300" role="status">{fileNote}</p> : null}
              {tracks.length > 0 ? (
                <ul className="space-y-1">
                  {tracks.map((t, i) => (
                    <li key={t.id} className={cn('flex items-center gap-2 rounded-xl px-1.5 py-1', i === trackIndex ? 'bg-primary-solid/10' : 'hover:bg-surface-muted')}>
                      <button
                        type="button"
                        onClick={() => (i === trackIndex ? toggleFile() : playTrack(i))}
                        aria-label={i === trackIndex && filePlaying ? `Mettre en pause ${t.title}` : `Écouter ${t.title}`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted"
                      >
                        {i === trackIndex && filePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                      <button
                        type="button"
                        onClick={() => removeTrack(t.id)}
                        aria-label={`Retirer ${t.title}`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="flex gap-1.5 text-xs text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Vos fichiers sont lus dans ce navigateur et ne sont envoyés nulle part. Ils disparaissent quand vous quittez la page.</span>
              </p>
            </div>
          )}

          {/* Volume et tempo des danseurs */}
          <div className="space-y-2 border-t border-border/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Remettre le son' : 'Couper le son'}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/80 hover:bg-surface-muted"
              >
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
                aria-label="Volume"
                className="min-w-0 flex-1 accent-current"
              />
              <span className="w-9 text-right text-xs tabular-nums text-muted">{muted ? 0 : volume}</span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted">Rythme des danseurs · {bpm} BPM</p>
              <div className="flex flex-wrap gap-1">
                {TEMPO_CHOICES.map((c) => (
                  <button
                    key={c.bpm}
                    type="button"
                    aria-pressed={Math.abs(bpm - c.bpm) < 6}
                    onClick={() => setBpm(c.bpm)}
                    className={cn(
                      'min-h-9 rounded-full px-2.5 text-xs font-semibold transition-colors',
                      Math.abs(bpm - c.bpm) < 6 ? 'bg-foreground text-background' : 'bg-surface-muted text-foreground/80 hover:text-foreground',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {danceNote ? <p className="text-xs text-amber-700 dark:text-amber-300">{danceNote}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
