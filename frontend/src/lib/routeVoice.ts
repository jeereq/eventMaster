const STORAGE_KEY = 'em-route-voice';

function femaleFrenchVoice(voices: SpeechSynthesisVoice[]) {
  const fr = voices.filter((voice) => voice.lang.toLowerCase().startsWith('fr'));
  const female = /female|femme|amélie|amelie|audrey|marie|virginie|céline|celine|julie|florence|aria|denise|hortense|google français|google francais/i;
  const male = /male|homme|thomas|paul|nicolas|daniel|claude|jacques/i;
  return fr.find((voice) => female.test(voice.name) && !male.test(voice.name))
    || fr.find((voice) => /google/i.test(voice.name) && !male.test(voice.name))
    || fr.find((voice) => !male.test(voice.name))
    || fr[0]
    || voices.find((voice) => female.test(voice.name))
    || null;
}

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function isRouteVoiceSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function readRouteVoiceEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeRouteVoiceEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function stopRouteVoice() {
  if (!isRouteVoiceSupported()) return;
  window.speechSynthesis.cancel();
}

export function routeIntroScript(
  title: string,
  durationLabel: string,
  distanceLabel: string,
  steps: string[],
) {
  const first = steps.filter(Boolean).slice(0, 2).join('. ');
  return `Guidage vers ${title}. Environ ${durationLabel}, ${distanceLabel}. ${first}`.replace(/\s+/g, ' ').trim();
}

export async function speakRouteGuide(text: string, enabled = true): Promise<void> {
  if (!enabled || !text.trim() || !isRouteVoiceSupported()) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  let voices = loadVoices();
  if (!voices.length) {
    voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const finish = () => resolve(loadVoices());
      synth.addEventListener('voiceschanged', finish, { once: true });
      window.setTimeout(finish, 350);
    });
  }
  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.lang = 'fr-FR';
  utter.rate = 0.96;
  utter.pitch = 1.08;
  const voice = femaleFrenchVoice(voices);
  if (voice) utter.voice = voice;
  return new Promise((resolve) => {
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    synth.speak(utter);
  });
}
