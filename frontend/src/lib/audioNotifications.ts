export const AUDIO_NOTIFICATION_PRESETS = ['off', 'chime', 'bell', 'soft', 'urgent'] as const;

export type AudioNotificationPreset = (typeof AUDIO_NOTIFICATION_PRESETS)[number];

export const AUDIO_PRESET_LABELS: Record<AudioNotificationPreset, string> = {
  off: 'Aucun',
  chime: 'Carillon',
  bell: 'Cloche',
  soft: 'Discret',
  urgent: 'Urgent',
};

export const AUDIO_NOTIFICATION_FAMILIES = ['events', 'billing', 'commissions', 'catalog', 'tasks'] as const;
export type AudioNotificationFamily = (typeof AUDIO_NOTIFICATION_FAMILIES)[number];

export interface AudioNotificationsSettings {
  enabled: boolean;
  volume: number;
  events: AudioNotificationPreset;
  billing: AudioNotificationPreset;
  commissions: AudioNotificationPreset;
  catalog: AudioNotificationPreset;
  tasks: AudioNotificationPreset;
  default: AudioNotificationPreset;
}

export const DEFAULT_AUDIO_NOTIFICATIONS: AudioNotificationsSettings = {
  enabled: true,
  volume: 70,
  events: 'bell',
  billing: 'urgent',
  commissions: 'chime',
  catalog: 'bell',
  tasks: 'soft',
  default: 'chime',
};

const MUTE_STORAGE_KEY = 'em-audio-notifications-muted';

export function isAudioNotificationPreset(value: unknown): value is AudioNotificationPreset {
  return typeof value === 'string' && (AUDIO_NOTIFICATION_PRESETS as readonly string[]).includes(value);
}

export function sanitizeAudioNotifications(raw: unknown): AudioNotificationsSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const volume = Number(src.volume);
  return {
    enabled: src.enabled !== false,
    volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, Math.round(volume))) : DEFAULT_AUDIO_NOTIFICATIONS.volume,
    events: isAudioNotificationPreset(src.events) ? src.events : DEFAULT_AUDIO_NOTIFICATIONS.events,
    billing: isAudioNotificationPreset(src.billing) ? src.billing : DEFAULT_AUDIO_NOTIFICATIONS.billing,
    commissions: isAudioNotificationPreset(src.commissions) ? src.commissions : DEFAULT_AUDIO_NOTIFICATIONS.commissions,
    catalog: isAudioNotificationPreset(src.catalog) ? src.catalog : DEFAULT_AUDIO_NOTIFICATIONS.catalog,
    tasks: isAudioNotificationPreset(src.tasks) ? src.tasks : DEFAULT_AUDIO_NOTIFICATIONS.tasks,
    default: isAudioNotificationPreset(src.default) ? src.default : DEFAULT_AUDIO_NOTIFICATIONS.default,
  };
}

export function isLocalAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
}

export function setLocalAudioMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Tone = { freq: number; start: number; duration: number; type: OscillatorType; gain: number };

function tonesForPreset(preset: AudioNotificationPreset): Tone[] {
  if (preset === 'chime') {
    return [
      { freq: 784, start: 0, duration: 0.18, type: 'sine', gain: 0.22 },
      { freq: 1046, start: 0.12, duration: 0.28, type: 'sine', gain: 0.18 },
    ];
  }
  if (preset === 'bell') {
    return [
      { freq: 880, start: 0, duration: 0.42, type: 'triangle', gain: 0.2 },
      { freq: 1320, start: 0.02, duration: 0.28, type: 'sine', gain: 0.08 },
    ];
  }
  if (preset === 'soft') {
    return [{ freq: 620, start: 0, duration: 0.16, type: 'sine', gain: 0.1 }];
  }
  if (preset === 'urgent') {
    return [
      { freq: 880, start: 0, duration: 0.1, type: 'square', gain: 0.09 },
      { freq: 1174, start: 0.14, duration: 0.14, type: 'square', gain: 0.1 },
    ];
  }
  return [];
}

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

export function unlockAudioNotifications() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

export function playAudioNotificationPreset(preset: AudioNotificationPreset, volumePercent = 70) {
  if (preset === 'off' || volumePercent <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playAudioNotificationPreset(preset, volumePercent));
    return;
  }

  const master = Math.max(0, Math.min(1, volumePercent / 100));
  const now = ctx.currentTime;
  for (const tone of tonesForPreset(preset)) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);
    gain.gain.setValueAtTime(0.0001, now + tone.start);
    gain.gain.exponentialRampToValueAtTime(tone.gain * master, now + tone.start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.duration + 0.03);
  }
}

export function playFamilyNotificationSound(
  settings: AudioNotificationsSettings,
  family: AudioNotificationFamily | 'account',
) {
  if (!settings.enabled || isLocalAudioMuted() || prefersReducedMotion()) return;
  const preset = family === 'account' ? settings.default : settings[family];
  playAudioNotificationPreset(preset, settings.volume);
}

let liveAudioSettings: AudioNotificationsSettings = DEFAULT_AUDIO_NOTIFICATIONS;

export function syncAudioNotificationSettings(settings: AudioNotificationsSettings) {
  liveAudioSettings = sanitizeAudioNotifications(settings);
}

function completeTones(): Tone[] {
  return [
    { freq: 523, start: 0, duration: 0.12, type: 'sine', gain: 0.16 },
    { freq: 659, start: 0.1, duration: 0.14, type: 'sine', gain: 0.18 },
    { freq: 784, start: 0.22, duration: 0.2, type: 'sine', gain: 0.2 },
    { freq: 1046, start: 0.34, duration: 0.32, type: 'triangle', gain: 0.12 },
  ];
}

/** Carillon de fin de génération IA (invitation, plan de salle, simulation budget). */
export function playAiGenerationCompleteSound() {
  if (!liveAudioSettings.enabled || isLocalAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playAiGenerationCompleteSound());
    return;
  }

  const master = Math.max(0, Math.min(1, liveAudioSettings.volume / 100));
  const now = ctx.currentTime;
  for (const tone of completeTones()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);
    gain.gain.setValueAtTime(0.0001, now + tone.start);
    gain.gain.exponentialRampToValueAtTime(tone.gain * master, now + tone.start + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.duration + 0.03);
  }
}
