export function formatEventPlace(parts: {
  location?: string | null;
  neighborhood?: string | null;
  commune?: string | null;
  city?: string | null;
}): string {
  const venue = String(parts.location || '').trim();
  const geo = [parts.neighborhood, parts.commune, parts.city]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .filter((part, index, list) => part.toLowerCase() !== list[index - 1]?.toLowerCase());
  const geoLine = geo.join(', ');
  if (venue && geoLine) return `${venue} — ${geoLine}`;
  return venue || geoLine;
}
