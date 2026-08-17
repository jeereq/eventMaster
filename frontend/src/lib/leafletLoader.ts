const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletPromise: Promise<any> | null = null;

export function leafletBasemap(theme: 'light' | 'dark') {
  return {
    url:
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  };
}

export function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet is browser-only'));
  }
  const existing = (window as any).L;
  if (existing) return Promise.resolve(existing);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      const L = (window as any).L;
      if (!L) {
        leafletPromise = null;
        reject(new Error('Leaflet introuvable'));
        return;
      }
      try {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      } catch {
        /* ignore */
      }
      resolve(L);
    };
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error('Impossible de charger la carte'));
    };
    document.body.appendChild(script);
  });

  return leafletPromise;
}

export interface GeoPlace {
  lat: number;
  lng: number;
  label: string;
}

function readPlace(item: { lat?: string; lon?: string; display_name?: string }): GeoPlace | null {
  const lat = parseFloat(String(item.lat || ''));
  const lng = parseFloat(String(item.lon || ''));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: item.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
}

export async function searchPlaces(query: string, limit = 5): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const places: GeoPlace[] = [];
  for (const item of data) {
    const place = readPlace(item);
    if (place) places.push(place);
  }
  return places;
}

export async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  const [place] = await searchPlaces(query, 1);
  return place ? { lat: place.lat, lng: place.lng } : null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.display_name === 'string' ? data.display_name : null;
}
