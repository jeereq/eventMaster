export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrivingStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface DrivingRoute {
  coords: LatLng[];
  distance: number;
  duration: number;
  steps: DrivingStep[];
}

export function formatRouteDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number) {
  const min = Math.round(seconds / 60);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function translateManeuver(step: {
  maneuver?: { type?: string; modifier?: string };
  name?: string;
}): string {
  const type = step?.maneuver?.type;
  const modifier = step?.maneuver?.modifier;
  const name = step?.name || '';
  const road = name && name !== '-' ? ` sur ${name}` : '';
  const turn: Record<string, string> = {
    right: 'à droite',
    left: 'à gauche',
    'slight right': 'légèrement à droite',
    'slight left': 'légèrement à gauche',
    'sharp right': 'fortement à droite',
    'sharp left': 'fortement à gauche',
    straight: 'tout droit',
    uturn: 'demi-tour',
  };

  switch (type) {
    case 'depart':
      return 'Départ — suivez le parcours';
    case 'arrive':
      return 'Vous êtes arrivé';
    case 'turn':
      return `Tournez ${turn[modifier || ''] || modifier || ''}${road}`.trim();
    case 'new name':
    case 'continue':
      return `Continuez${road}`;
    case 'merge':
      return `Fusionnez${road}`;
    case 'on ramp':
      return `Prenez la bretelle${road}`;
    case 'off ramp':
      return `Prenez la sortie${road}`;
    case 'fork':
      return `Au croisement, prenez ${turn[modifier || ''] || 'la voie indiquée'}${road}`;
    case 'roundabout':
    case 'rotary':
      return `Au rond-point, prenez la sortie${road}`;
    case 'end of road':
      return `En bout de route, ${turn[modifier || ''] || 'continuez'}${road}`;
    default:
      return name ? `Continuez sur ${name}` : 'Continuez tout droit';
  }
}

export async function fetchDrivingRoute(origin: LatLng, dest: LatLng): Promise<DrivingRoute> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('route-http');
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates) throw new Error('no-route');
  const coords: LatLng[] = route.geometry.coordinates.map((c: [number, number]) => ({
    lat: c[1],
    lng: c[0],
  }));
  const steps: DrivingStep[] = (route.legs?.[0]?.steps || []).map((step: { maneuver?: { type?: string; modifier?: string }; name?: string; distance?: number; duration?: number }) => ({
    instruction: translateManeuver(step),
    distance: step.distance || 0,
    duration: step.duration || 0,
  }));
  return {
    coords,
    distance: route.distance || 0,
    duration: route.duration || 0,
    steps: steps.filter((s) => s.instruction),
  };
}

export function readDocumentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
