/**
 * Logo officiel EventMaster : pétales verts + étoile menthe.
 * Tracé vectoriel unique, réutilisé partout (header, favicon, icônes PWA, images sociales).
 * Coordonnées dans un carré 512×512, sans fond (version détourée).
 */
export const BRAND_LOGO_VIEWBOX = '0 0 512 512';
export const BRAND_LOGO_DARK = '#31714c';
export const BRAND_LOGO_MINT = '#6ee6b6';
/** Fond de l'icône d'application (tuile). */
export const BRAND_LOGO_TILE_BG = '#000000';

export const BRAND_LOGO_PATH_PETALS =
  'M213 378.2C177 375.6 147.9 365.7 118.5 346C101.7 334.7 85.3 317.8 76.2 302.4C57.7 271 54.9 244.6 67.8 223.2C78.3 205.6 95.6 195.7 115.7 195.7C132.3 195.7 143.3 200.8 156.9 214.8C167.6 225.7 173.4 235.1 189.3 266.2C196.9 281.2 206.3 293.7 219 305.8C238.5 324.7 264.1 339.7 296 351.2C303.9 354.1 304.8 354.5 304.8 356.2C304.8 358.7 284.8 367.6 270.2 371.7C261.8 374 254.4 375.5 243.8 376.8C235.7 377.8 218.8 378.6 213 378.2ZM304.7 330.5C292.3 317.5 277 293.2 268.9 273.9C256.8 245.2 251.3 217.1 251.3 185.2C251.3 154.5 256.7 126.3 268.3 97.3C271.8 88.4 279.4 73.4 283.4 67.5C285.1 65 286.5 62.8 286.5 62.6C286.5 61.7 294.6 51.4 301 44.2C321.1 21.5 347.5 4.7 369.2 0.9C377.7 -0.5 391.7 -0.1 399.2 2C422 8.1 440.6 24.7 448.4 46.1C451.5 54.5 452.5 60.3 452.5 69.4C452.5 82.7 449.6 93.4 443 104C441.2 106.9 438.4 111.4 436.8 113.9C434.1 118.5 429.2 124.5 423.3 131C419.3 135.3 399 153.3 387.4 163C354.5 190.2 332.5 226.8 319.7 275.9C317.2 285.3 313.4 306.9 311.8 321C310.7 330.4 309.8 333.2 307.9 333.2C307.5 333.2 306.1 332 304.7 330.5Z';
export const BRAND_LOGO_PATH_STAR =
  'M210.8 511.1C197.8 508.1 185.8 496.6 182.6 483.8C181.4 479.1 181.2 470.5 182.2 465.9C184.6 455.9 192.9 446.2 203.9 440.8C212.1 436.8 218.1 434.9 234.2 431.5C252.1 427.6 259.8 424.7 271.6 417.6C279.9 412.5 284.9 408.7 292.5 401.3C299.5 394.5 306.9 386 313.4 377C315.9 373.8 318.1 371.2 318.5 371.3C320.3 371.9 322.4 385.8 322.4 397.9C322.4 429.9 310 459.2 286.6 482.6C272.8 496.5 258 505.3 241 509.6C232.2 511.9 217.5 512.5 210.8 511.1ZM399 392.4C398.2 391.1 397.5 389.9 397.5 389.8C397.5 388.8 388.3 374 384.8 369.4C377.3 359.3 370.8 354.4 361 351.2C353.3 348.6 345.4 347.9 331 348.3C324 348.4 318.3 348.5 318.3 348.4C318.3 348.2 321 346.8 324.3 345.1C341.5 336.2 354.3 325.3 359 315.6C364.3 304.7 365.6 292.6 364 269.5L363.7 265.1L368.1 273.1C378.5 292.1 387.2 302.2 397.3 307.3C406.5 311.9 410.8 312.6 430.2 312.6L446.8 312.6L441 315.6C423.8 324.5 409.9 336.2 405.5 345.5C401.1 354.7 400.6 357.9 400.6 377.4C400.6 387 400.5 394.8 400.5 394.8C400.5 394.8 399.8 393.8 399 392.4Z';

/**
 * SVG autonome du logo.
 * - `tile: false` → version détourée (fond transparent), pour fonds clairs/sombres.
 * - `tile: true` → tuile d'application (fond noir arrondi, logo centré).
 */
export function buildBrandLogoSvg({ tile = false, radius = 112 }: { tile?: boolean; radius?: number } = {}): string {
  const paths = `<path d="${BRAND_LOGO_PATH_PETALS}" fill="${BRAND_LOGO_DARK}"/><path d="${BRAND_LOGO_PATH_STAR}" fill="${BRAND_LOGO_MINT}"/>`;
  if (!tile) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_LOGO_VIEWBOX}">${paths}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_LOGO_VIEWBOX}"><rect width="512" height="512" rx="${radius}" fill="${BRAND_LOGO_TILE_BG}"/><g transform="translate(76.8 76.8) scale(0.7)">${paths}</g></svg>`;
}
