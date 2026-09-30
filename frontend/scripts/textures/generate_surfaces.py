#!/usr/bin/env python3
"""Textures réalistes des sols extérieurs, revêtements minéraux et murs (public/floors/gen).

Complète generate_textures.py (mêmes outils : bruit spectral périodique, Voronoï périodique).
Chaque texture boucle sans raccord et est accompagnée d'une carte de normales `-normal.jpg`.

Principes de réalisme appliqués partout :
- plusieurs échelles de variation (tache large, grain moyen, micro-grain) ;
- occlusion ambiante « cuite » dans l'albédo (joints, creux, pied des brins) ;
- couleurs tirées de relevés de matières réelles plutôt que de teintes saturées ;
- relief (carte de hauteur) cohérent avec le dessin, pour que la lumière rasante révèle la matière.

Usage (depuis frontend/) :
  python3 scripts/textures/generate_surfaces.py            # tout
  python3 scripts/textures/generate_surfaces.py grass sand  # seulement les noms contenant ces mots
Dépendances : numpy, pillow, scipy.
"""

from __future__ import annotations

import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.spatial import cKDTree
from scipy.ndimage import gaussian_filter

from generate_textures import (
    SIZE,
    band_noise,
    colorize,
    grain_field,
    herringbone,
    marble,
    rgb,
    save,
    smoothstep,
    spectral_noise,
    warp,
    wood_planks,
)


# ───────────────────────── outils ─────────────────────────

def blur(img: np.ndarray, sigma: float) -> np.ndarray:
    """Flou gaussien périodique (mode wrap) : ne casse pas le raccord."""
    if img.ndim == 3:
        return np.stack([gaussian_filter(img[..., c], sigma, mode='wrap') for c in range(img.shape[2])], axis=-1)
    return gaussian_filter(img, sigma, mode='wrap')


def voronoi(size: int, pts: np.ndarray, jitter=None):
    """Voronoï périodique (tore) : indice de la cellule, distances F1/F2 et vecteur vers le germe."""
    tree = cKDTree(pts % size, boxsize=size)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    if jitter is not None:
        xx = (xx + jitter[0]) % size
        yy = (yy + jitter[1]) % size
    q = np.stack([xx.ravel(), yy.ravel()], axis=1)
    d, i = tree.query(q, k=2)
    idx = i[:, 0].reshape(size, size)
    d1 = d[:, 0].reshape(size, size)
    d2 = d[:, 1].reshape(size, size)
    p = pts[idx] % size
    vx = (xx - p[..., 0] + size / 2) % size - size / 2
    vy = (yy - p[..., 1] + size / 2) % size - size / 2
    return idx, d1, d2, vx, vy


def ao_from_height(h: np.ndarray, radius: float = 6.0, strength: float = 1.6) -> np.ndarray:
    """Occlusion ambiante approchée : les creux plus bas que leur voisinage s'assombrissent."""
    local = blur(h, radius)
    return np.clip(1 - np.maximum(0, local - h) * strength, 0, 1)


def mix(a: np.ndarray, b: np.ndarray, t: np.ndarray) -> np.ndarray:
    if a.ndim == 3 and t.ndim == 2:
        t = t[..., None]
    return a * (1 - t) + b * t


def wrap_positions(x: float, y: float, size: int, margin: float):
    """Copies d'un point près des bords, pour dessiner des traits qui bouclent."""
    xs = [x] + ([x + size] if x < margin else []) + ([x - size] if x > size - margin else [])
    ys = [y] + ([y + size] if y < margin else []) + ([y - size] if y > size - margin else [])
    return [(a, b) for a in xs for b in ys]


# ───────────────────────── gazons & végétal ─────────────────────────

def grass(seed: int, palette: list[str], soil: str, density: int, length=(10, 26), width=(1, 3),
          dry: float = 0.0, stripes: float = 0.0, flowers: int = 0, flower_cols=('#ffffff',), clover: int = 0,
          uniform: float = 0.0):
    """Gazon vu de dessus : milliers de brins dessinés (2× puis réduits = anticrénelage), terre entre les touffes."""
    rng = np.random.default_rng(seed)
    big = SIZE * 2
    base_t = spectral_noise(SIZE, seed + 1, beta=2.8)
    img = Image.new('RGB', (big, big), soil)
    hmap = Image.new('L', (big, big), 0)
    draw = ImageDraw.Draw(img)
    hdraw = ImageDraw.Draw(hmap)
    cols = [rgb(c) for c in palette]
    dry_c = rgb('#b7a46a')
    clump = spectral_noise(SIZE, seed + 2, beta=3.2)
    for k in range(density):
        # Brins regroupés en touffes : échantillonnage préférentiel des zones denses.
        x, y = rng.uniform(0, big, 2)
        cx, cy = int(x / 2) % SIZE, int(y / 2) % SIZE
        if rng.random() > 0.35 + 0.65 * clump[cy, cx] * (1 - uniform) + uniform * 0.65:
            continue
        L = rng.uniform(*length) * 2
        ang = rng.uniform(0, 2 * np.pi) if uniform < 0.5 else rng.normal(np.pi / 2, 0.5)
        dx, dy = np.cos(ang) * L, np.sin(ang) * L
        c = cols[int(rng.integers(0, len(cols)))] * rng.uniform(0.8, 1.15)
        t = base_t[cy, cx]
        c = c * (0.85 + 0.3 * t)
        if dry > 0 and rng.random() < dry * (1 - t) * 1.6:
            c = mix(c, dry_c * rng.uniform(0.85, 1.1), rng.uniform(0.4, 0.9))
        if stripes > 0:
            # Bandes de tonte : deux passages par tuile, brins couchés dans des sens opposés.
            band = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (x / big) * 2))
            c = c * (1 + stripes * (band - 0.5))
        col = tuple(int(v) for v in np.clip(c * 255, 0, 255))
        # Pied du brin plus sombre, pointe plus claire : lecture du volume.
        wpx = int(rng.integers(width[0], width[1] + 1)) * 2
        tip = tuple(int(v) for v in np.clip(c * 1.25 * 255, 0, 255))
        root = tuple(int(v) for v in np.clip(c * 0.55 * 255, 0, 255))
        h = int(90 + 165 * rng.random())
        for (px, py) in wrap_positions(x, y, big, L + 4):
            draw.line([(px, py), (px + dx * 0.4, py + dy * 0.4)], fill=root, width=wpx)
            draw.line([(px + dx * 0.3, py + dy * 0.3), (px + dx, py + dy)], fill=col, width=wpx)
            draw.line([(px + dx * 0.8, py + dy * 0.8), (px + dx, py + dy)], fill=tip, width=max(1, wpx // 2))
            hdraw.line([(px, py), (px + dx, py + dy)], fill=h, width=wpx)
    # Trèfles : petites grappes de trois folioles rondes.
    for _ in range(clover):
        x, y = rng.uniform(0, big, 2)
        r = rng.uniform(5, 8)
        c = tuple(int(v) for v in rgb('#3f7a2e') * rng.uniform(0.85, 1.1) * 255)
        for a in (0, 2.1, 4.2):
            ox, oy = np.cos(a + x) * r, np.sin(a + x) * r
            for (px, py) in wrap_positions(x + ox, y + oy, big, r * 2):
                draw.ellipse([px - r, py - r, px + r, py + r], fill=c)
                hdraw.ellipse([px - r, py - r, px + r, py + r], fill=235)
    # Fleurs (pâquerettes, boutons d'or…) : pétales + cœur, par-dessus l'herbe.
    for _ in range(flowers):
        x, y = rng.uniform(0, big, 2)
        r = rng.uniform(5, 9)
        fc = rgb(flower_cols[int(rng.integers(0, len(flower_cols)))])
        petal = tuple(int(v) for v in np.clip(fc * rng.uniform(0.9, 1.05) * 255, 0, 255))
        for (px, py) in wrap_positions(x, y, big, r * 2.5):
            for a in np.linspace(0, 2 * np.pi, 9)[:-1]:
                ex, ey = px + np.cos(a) * r, py + np.sin(a) * r
                draw.ellipse([ex - r * 0.45, ey - r * 0.45, ex + r * 0.45, ey + r * 0.45], fill=petal)
            draw.ellipse([px - r * 0.45, py - r * 0.45, px + r * 0.45, py + r * 0.45], fill=(232, 178, 32))
            hdraw.ellipse([px - r * 1.3, py - r * 1.3, px + r * 1.3, py + r * 1.3], fill=255)
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    hmap = hmap.resize((SIZE, SIZE), Image.LANCZOS)
    albedo = np.asarray(img, dtype=np.float64) / 255.0
    height = np.asarray(hmap, dtype=np.float64) / 255.0
    height = 0.6 * height + 0.4 * blur(height, 3)
    # Ombre douce entre les touffes + variation large (zones plus ou moins arrosées).
    albedo *= (0.55 + 0.45 * ao_from_height(height, 4, 1.4))[..., None]
    patches = spectral_noise(SIZE, seed + 9, beta=3.4)
    albedo *= (0.86 + 0.24 * patches)[..., None]
    return np.clip(albedo, 0, 1), height


def turf_synthetic(seed: int = 301):
    """Gazon synthétique : brins réguliers en rangées de tuft, deux verts, fibres brillantes."""
    a, h = grass(seed, ['#2f8a3a', '#3b9a44', '#277a33', '#46a64d'], '#1d3d1f', 150000, (8, 14), (1, 2),
                 uniform=0.85)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
    rows = 0.5 + 0.5 * np.cos(2 * np.pi * yy / (SIZE / 64))
    a *= (0.9 + 0.1 * rows)[..., None]
    return a, h


# ───────────────────────── sols meubles ─────────────────────────

def slope_shade(h: np.ndarray, k: float, light=(-0.55, -0.8)) -> np.ndarray:
    """Éclairage rasant cuit (lumière venant du haut-gauche) : révèle le relief même sans carte de normales."""
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    g = dx * light[0] + dy * light[1]
    return 1 + k * g / (3 * g.std() + 1e-9)


def sand(seed: int = 311, base_cols=('#d6c29a', '#e2d1ad', '#cbb58a', '#ecdfc2')):
    """Sable : rides éoliennes (ombrées par la pente), grains minéraux multicolores au pixel, zones plus humides."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
    wx = (spectral_noise(size, seed, beta=3.6) - 0.5)
    wy = (spectral_noise(size, seed + 1, beta=3.6) - 0.5)
    phase = (yy * 9 + xx * 2 + wx * 1.6 + wy * 0.8)
    saw = phase % 1.0
    # Ride asymétrique : montée douce, descente abrupte.
    rip = np.where(saw < 0.75, saw / 0.75, (1 - saw) / 0.25)
    rip = blur(rip, 1.5) * (0.6 + 0.4 * spectral_noise(size, seed + 6, beta=3.0))
    large = spectral_noise(size, seed + 2, beta=3.2)
    height = 0.5 + 0.18 * rip + 0.2 * large
    albedo = colorize(large, [(0, base_cols[2]), (0.45, base_cols[0]), (0.8, base_cols[1]), (1, base_cols[3])])
    # Grains au pixel : quartz clair, feldspath rosé, minéraux sombres, coquillages.
    r = rng.random((size, size))
    grain_col = np.select(
        [(r < 0.05)[..., None], (r < 0.09)[..., None], (r < 0.12)[..., None], (r < 0.14)[..., None]],
        [rgb('#6b5f4d')[None, None, :] * np.ones((size, size, 3)), rgb('#f8f3e6') * np.ones((size, size, 3)),
         rgb('#c99a7a') * np.ones((size, size, 3)), rgb('#3f3a33') * np.ones((size, size, 3))],
        default=albedo,
    )
    albedo = 0.55 * albedo + 0.45 * grain_col
    albedo *= (0.9 + 0.2 * rng.random((size, size)))[..., None]
    albedo = blur(albedo, 0.5)
    albedo *= np.clip(slope_shade(blur(height, 1.0), 0.12), 0.85, 1.12)[..., None]
    wet = smoothstep(0.7, 0.95, spectral_noise(size, seed + 7, beta=3.6))
    albedo *= (1 - 0.07 * wet)[..., None]
    return np.clip(albedo, 0, 1), height


def jittered_grid(n: int, size: int, rng, jitter: float = 0.4) -> np.ndarray:
    """Points répartis « bleu » (grille perturbée) : pas d'amas ni de trous comme avec un tirage uniforme."""
    g = int(round(np.sqrt(n)))
    step = size / g
    yy, xx = np.mgrid[0:g, 0:g].astype(np.float64)
    pts = np.stack([(xx + 0.5) * step, (yy + 0.5) * step], axis=-1).reshape(-1, 2)
    return pts + rng.uniform(-jitter, jitter, pts.shape) * step


def pebble_layer(size: int, n: int, rng, cols: np.ndarray, fill: float, size_var: float, round_: float, flat: float):
    pts = jittered_grid(n, size, rng)
    m = len(pts)
    idx, d1, d2, vx, vy = voronoi(size, pts)
    cell = size / np.sqrt(m)
    ang = rng.uniform(0, np.pi, m)[idx]
    aspect = rng.uniform(0.62, 1.0, m)[idx]
    rad = cell * fill * rng.uniform(1 - size_var, 1 + size_var * 0.35, m)[idx]
    ex = (vx * np.cos(ang) + vy * np.sin(ang)) / rad
    ey = (-vx * np.sin(ang) + vy * np.cos(ang)) / (rad * aspect)
    de = np.sqrt(ex * ex + ey * ey)
    inside = smoothstep(1.02, 0.86, de)
    dome = np.sqrt(np.clip(1 - de ** 2, 0, 1)) * round_ * (1 - flat) + flat * 0.8 * (de < 1)
    col = cols[rng.integers(0, len(cols), m)] * rng.uniform(0.8, 1.15, (m, 1))
    # Normale de calotte en repère image → lambert (lumière haut-gauche).
    nx_ = ex * np.cos(ang) - ey * np.sin(ang)
    ny_ = ex * np.sin(ang) + ey * np.cos(ang)
    lam = np.clip((-0.45 * nx_ - 0.55 * ny_ + 0.7 * dome) / np.sqrt(nx_ ** 2 + ny_ ** 2 + dome ** 2 + 1e-6), 0, 1)
    veined = (rng.random(m) < 0.3)[idx]
    height = inside * (0.35 + 0.65 * dome) * rng.uniform(0.75, 1.0, m)[idx]
    return col[idx], lam, height, inside, de, dome, veined


def pebbles(seed: int, n: int, palette: list[str], matrix: str, round_: float = 1.0, size_var: float = 0.5,
            flat: float = 0.0, dust: float = 0.3, fill: float = 0.5):
    """Gravier / galets : deux couches de cailloux elliptiques bombés (le plus haut l'emporte), matrice sableuse, ombre de contact."""
    size = SIZE
    rng = np.random.default_rng(seed)
    cols = np.array([rgb(c) for c in palette])
    a = pebble_layer(size, n, rng, cols, fill, size_var, round_, flat)
    b = pebble_layer(size, int(n * 1.3), rng, cols, fill * 0.95, size_var, round_, flat)
    top = (b[2] > a[2])
    col, lam, height, inside, de, dome, veined = [np.where(top[..., None] if x.ndim == 3 else top, y, x) for x, y in zip(a, b)]
    speck = spectral_noise(size, seed + 3, beta=1.2)
    grain = rng.random((size, size))
    albedo = col * (0.84 + 0.22 * speck + 0.1 * grain)[..., None]
    veins = np.power(1 - np.abs(np.sin(np.pi * (spectral_noise(size, seed + 4, beta=2.6) * 9))), 30)
    albedo = mix(albedo, np.clip(albedo * 1.4, 0, 1), veins * 0.4 * veined)
    albedo *= (0.55 + 0.6 * lam)[..., None]
    mat = rgb(matrix) * (0.75 + 0.35 * band_noise(size, seed + 5, 150, 500) + 0.1 * grain)[..., None]
    covered = np.maximum(a[3], b[3])
    near = np.minimum(a[4], b[4])
    contact = smoothstep(1.4, 0.95, near) * (1 - covered)
    mat *= (1 - 0.5 * contact)[..., None]
    albedo = mix(mat, albedo, covered)
    height = 0.15 + 0.8 * np.maximum(a[2], b[2])
    if dust > 0:
        albedo = mix(albedo, rgb(matrix) * 1.05, (1 - dome) * covered * dust * 0.5)
    # Ombre douce entre deux cailloux qui se chevauchent.
    albedo *= (0.7 + 0.3 * ao_from_height(height, 3, 1.5))[..., None]
    return np.clip(albedo, 0, 1), height


def dirt(seed: int = 331):
    """Terre battue : sol compacté, fissures fines, petits cailloux et brindilles, flaques sèches plus claires."""
    size = SIZE
    large = spectral_noise(size, seed, beta=3.0)
    mid = spectral_noise(size, seed + 1, beta=2.0)
    albedo = colorize(np.clip(0.55 * large + 0.45 * mid, 0, 1), [(0, '#5a4331'), (0.4, '#735840'), (0.7, '#8c6d4f'), (1, '#a2825f')])
    # Craquelures : bords de cellules Voronoï fins.
    rng = np.random.default_rng(seed + 2)
    idx, d1, d2, _, _ = voronoi(size, rng.uniform(0, size, (70, 2)))
    crack = (1 - smoothstep(0.5, 2.2, d2 - d1)) * smoothstep(0.45, 0.7, spectral_noise(size, seed + 3, beta=2.8))
    stones_a, stones_h = pebbles(seed + 4, 420, ['#8b8378', '#a39a8c', '#6d665c', '#b8ad9c'], '#735840', size_var=0.7, dust=0.6)
    stone_mask = smoothstep(0.55, 0.75, stones_h) * smoothstep(0.55, 0.75, spectral_noise(size, seed + 5, beta=2.2))
    albedo = mix(albedo, stones_a, stone_mask)
    albedo *= (1 - crack * 0.5)[..., None]
    height = 0.5 + 0.15 * large + 0.1 * mid - 0.3 * crack + 0.25 * stone_mask * stones_h
    albedo *= (0.8 + 0.2 * ao_from_height(height, 4, 2.0))[..., None]
    return albedo, height


# ───────────────────────── minéraux coulés ─────────────────────────

def concrete(seed: int, tone=('#8e8d88', '#a3a29c', '#b6b4ad'), polished: bool = False, joints: int = 2):
    """Béton : nuages de laitance, bullage (petits trous), taches d'humidité, joints sciés."""
    size = SIZE
    cloud = spectral_noise(size, seed, beta=3.2)
    mid = spectral_noise(size, seed + 1, beta=2.2)
    fine = band_noise(size, seed + 2, 200, 512)
    t = np.clip(0.5 * cloud + 0.35 * mid + 0.15 * fine, 0, 1)
    albedo = colorize(t, [(0, tone[0]), (0.55, tone[1]), (1, tone[2])])
    # Bullage (pores) : points sombres de différentes tailles.
    pores = smoothstep(0.86, 0.93, band_noise(size, seed + 3, 120, 380))
    micro = smoothstep(0.9, 0.96, band_noise(size, seed + 4, 300, 512))
    albedo *= (1 - 0.45 * pores - 0.25 * micro)[..., None]
    # Taches (huile, eau) très douces.
    stain = smoothstep(0.62, 0.9, spectral_noise(size, seed + 5, beta=3.8))
    albedo *= (1 - 0.12 * stain)[..., None]
    if polished:
        # Béton ciré : granulats affleurants poncés.
        chips, _ = terrazzo(seed + 6, 1600, ['#6b6863', '#b9b4aa', '#58544f', '#8c867c'], ('#000000', '#000000'), (1.5, 4.5))
        agg = (chips.sum(axis=2) > 0.05).astype(float)
        albedo = mix(albedo, chips, agg * 0.3)
    yy, xx = np.mgrid[0:size, 0:size]
    joint = np.zeros((size, size))
    if joints:
        step = size // joints
        joint = (((xx % step) < 3) | ((yy % step) < 3)).astype(float)
        joint = blur(joint, 0.7)
    albedo *= (1 - 0.5 * joint)[..., None]
    height = 0.8 + 0.05 * cloud + 0.03 * fine - 0.4 * pores - 0.15 * micro - 0.5 * joint
    return np.clip(albedo, 0, 1), height


def terrazzo(seed: int, n: int, chip_cols: list[str], base_cols=('#e6e1d8', '#efebe4'), chip_size=(3, 11)):
    """Terrazzo : éclats de marbre anguleux (polygones), liant cimenté fin, poli."""
    size = SIZE
    big = size * 2
    rng = np.random.default_rng(seed)
    img = Image.new('RGB', (big, big), (0, 0, 0))
    mask = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(img)
    dm = ImageDraw.Draw(mask)
    cols = [rgb(c) for c in chip_cols]
    for _ in range(n):
        x, y = rng.uniform(0, big, 2)
        r = rng.uniform(*chip_size) * 2 * (1 if rng.random() > 0.08 else 2.2)
        k = int(rng.integers(4, 8))
        angs = np.sort(rng.uniform(0, 2 * np.pi, k))
        rad = r * rng.uniform(0.55, 1.0, k)
        c = cols[int(rng.integers(0, len(cols)))] * rng.uniform(0.85, 1.12)
        fill = tuple(int(v) for v in np.clip(c * 255, 0, 255))
        for (px, py) in wrap_positions(x, y, big, r * 1.2):
            poly = [(px + np.cos(a) * q, py + np.sin(a) * q) for a, q in zip(angs, rad)]
            d.polygon(poly, fill=fill)
            dm.polygon(poly, fill=255)
    chips = np.asarray(img.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255.0
    m = np.asarray(mask.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255.0
    base = colorize(spectral_noise(size, seed + 1, beta=2.6), [(0, base_cols[0]), (1, base_cols[1])])
    base *= (0.95 + 0.08 * band_noise(size, seed + 2, 200, 512))[..., None]
    albedo = mix(base, chips * (0.92 + 0.14 * spectral_noise(size, seed + 3, beta=1.0))[..., None], m)
    height = 0.88 + 0.02 * m
    return albedo, height


# ───────────────────────── carreaux & pavés ─────────────────────────

def tile_grid(seed: int, nx: int, ny: int, body_fn, grout: str, grout_px: float = 4, bevel: float = 6,
              tone_var: float = 0.06, offset_rows: bool = False):
    """Calepinage régulier : chaque carreau reçoit sa matière décalée, joint creux + chanfrein."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    th, tw = size / ny, size / nx
    row = np.floor(yy / th)
    xs = xx + (np.where(row % 2 == 1, tw / 2, 0) if offset_rows else 0)
    col = np.floor((xs % size) / tw)
    u = (xs % size) % tw
    v = yy % th
    edge = np.minimum.reduce([u, tw - u, v, th - v])
    tid = (row * nx + col).astype(int)
    body = body_fn()
    shifts = rng.integers(0, size, (nx * ny, 2))
    out = np.zeros_like(body)
    tones = rng.uniform(1 - tone_var, 1 + tone_var, nx * ny)
    for t in range(nx * ny):
        m = tid == t
        if not m.any():
            continue
        out[m] = np.roll(np.roll(body, shifts[t, 0], axis=0), shifts[t, 1], axis=1)[m] * tones[t]
    g = 1 - smoothstep(grout_px * 0.5, grout_px, edge)
    chamfer = smoothstep(grout_px, grout_px + bevel, edge)
    gc = rgb(grout) * (0.9 + 0.2 * band_noise(size, seed + 1, 150, 450))[..., None]
    albedo = mix(out, gc, g)
    albedo *= (0.82 + 0.18 * chamfer)[..., None]
    height = 0.55 + 0.4 * chamfer - 0.3 * g
    return albedo, height, tid, edge


def limestone_body(seed: int, cols=('#d8cdb8', '#e4dac6', '#cfc2a9')):
    def f():
        t = np.clip(0.6 * spectral_noise(SIZE, seed, beta=2.6) + 0.4 * band_noise(SIZE, seed + 1, 60, 300), 0, 1)
        a = colorize(t, [(0, cols[2]), (0.5, cols[0]), (1, cols[1])])
        fossils = smoothstep(0.88, 0.95, band_noise(SIZE, seed + 2, 90, 260))
        return a * (1 - 0.12 * fossils)[..., None]
    return f


def tomettes(seed: int = 351):
    """Tomettes hexagonales en terre cuite : tons rouges/orangés irréguliers, bords usés, joint chaux."""
    size = SIZE
    # Réseau hexagonal périodique : 8 colonnes × 8 rangées (rapport compatible avec le carré).
    nx = 8
    r = size / nx / np.sqrt(3)
    pts = []
    rows = int(round(size / (1.5 * r)))
    ry = size / rows
    for j in range(rows):
        for i in range(nx):
            pts.append(((i + (0.5 if j % 2 else 0)) * size / nx, j * ry))
    pts = np.array(pts)
    idx, d1, d2, _, _ = voronoi(size, pts)
    border = d2 - d1
    rng = np.random.default_rng(seed)
    n = len(pts)
    palette = np.array([rgb(c) for c in ('#b5532f', '#a4462a', '#c46a3d', '#9a3f27', '#bb5d34', '#8e3a24', '#c8764a')])
    col = palette[rng.integers(0, len(palette), n)] * rng.uniform(0.88, 1.1, (n, 1))
    albedo = col[idx]
    clay = spectral_noise(size, seed + 1, beta=1.8)
    albedo *= (0.84 + 0.26 * clay)[..., None]
    # Taches de cuisson (plus foncées) et usure au centre (plus claire, patinée).
    burn = smoothstep(0.6, 0.85, spectral_noise(size, seed + 2, beta=2.6))
    albedo = mix(albedo, albedo * 0.7, burn * 0.5)
    wear = smoothstep(0.5, 0.0, d1 / (size / nx * 0.6)) * 0.12
    albedo = albedo * (1 + wear)[..., None]
    grout = 1 - smoothstep(1.5, 4.5, border)
    edge = smoothstep(3, 12, border)
    albedo = mix(albedo, rgb('#cfc4b0') * (0.85 + 0.2 * clay)[..., None], grout)
    albedo *= (0.8 + 0.2 * edge)[..., None]
    height = 0.5 + 0.4 * edge + 0.05 * clay - 0.3 * grout
    return albedo, height


def fan_pavers(seed: int = 361):
    """Pavés en éventail (écailles) : arcs concentriques de petits pavés de granit, joint sable."""
    size = SIZE
    R = size / 4  # 4 éventails par largeur
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    best_r = np.full((size, size), np.inf)
    best_a = np.zeros((size, size))
    best_id = np.zeros((size, size), dtype=np.int64)
    # Écailles : centres sur une grille décalée d'une demi-largeur à chaque rangée ; la plus haute rangée qui couvre gagne.
    rows = int(size / (R * 0.5))
    fan_id = 0
    owner_row = np.full((size, size), -1)
    for j in range(-2, rows + 2):
        cy = j * R * 0.5
        for i in range(-1, 5):
            cx = i * 2 * R + (R if j % 2 else 0)
            dx = (xx - cx + size / 2) % size - size / 2
            dy = (yy - cy + size / 2) % size - size / 2
            rr = np.sqrt(dx * dx + dy * dy)
            inside = rr < R
            take = inside & (j > owner_row)
            owner_row = np.where(take, j, owner_row)
            best_r = np.where(take, rr, best_r)
            best_a = np.where(take, np.arctan2(-dy, dx), best_a)
            best_id = np.where(take, fan_id, best_id)
            fan_id += 1
    ring_w = R / 7
    ring = np.floor(best_r / ring_w)
    rr_in = best_r % ring_w
    circ = np.maximum(1, np.round(np.pi * (ring + 0.5) * ring_w / (ring_w * 1.05)))
    seg = best_a / np.pi * circ
    seg_i = np.floor(seg)
    su = (seg - seg_i) * (np.pi * (ring + 0.5) * ring_w / circ)
    sw = np.pi * (ring + 0.5) * ring_w / circ
    edge = np.minimum.reduce([rr_in, ring_w - rr_in, su, sw - su])
    stone_id = (best_id * 1000 + ring * 50 + seg_i).astype(np.int64)
    rng = np.random.default_rng(seed)
    uniq, inv = np.unique(stone_id, return_inverse=True)
    inv = inv.reshape(size, size)
    palette = np.array([rgb(c) for c in ('#7d7a75', '#8f8b85', '#6a6763', '#9a948c', '#76716a', '#a39d93', '#5f5c58')])
    col = palette[rng.integers(0, len(palette), len(uniq))] * rng.uniform(0.88, 1.1, (len(uniq), 1))
    albedo = col[inv]
    speck = band_noise(size, seed + 1, 200, 512)
    albedo *= (0.8 + 0.35 * speck)[..., None]
    grout = 1 - smoothstep(1.2, 3.8, edge)
    dome = smoothstep(2, 14, edge)
    albedo = mix(albedo, rgb('#b3a58a') * (0.8 + 0.3 * speck)[..., None], grout)
    albedo *= (0.72 + 0.28 * dome)[..., None]
    height = 0.35 + 0.55 * dome - 0.2 * grout
    return albedo, height


def checker_marble(seed: int = 371):
    """Damier marbre noir (Marquina) et blanc (Carrare), joints fins."""
    size = SIZE
    white, vw = soft_marble(seed, [(0, '#e9e7e3'), (0.6, '#f3f1ee'), (1, '#fbfaf8')], '#8a8680', 2, 0.55)
    black, vb = soft_marble(seed + 10, [(0, '#121214'), (0.6, '#1b1b1e'), (1, '#242428')], '#d9d6d0', 3, 0.75, (1.0, -0.7))
    n = 4
    yy, xx = np.mgrid[0:size, 0:size]
    step = size // n
    chk = (((xx // step) + (yy // step)) % 2).astype(float)
    albedo = mix(white, black, chk)
    u = xx % step
    v = yy % step
    edge = np.minimum.reduce([u, step - u, v, step - v]).astype(float)
    g = 1 - smoothstep(0.8, 2.2, edge)
    albedo = mix(albedo, rgb('#8d8a84'), g)
    height = 0.9 - 0.4 * g + 0.3 * (vw * (1 - chk) + vb * chk) - 0.27
    return albedo, height


def brick_floor(seed: int = 381):
    """Pavage de briques en chevrons (brique de terre cuite pleine, joint sable)."""
    size = SIZE
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    w = size / 16
    L = w * 2
    # Chevrons à 45° via rotation des coordonnées : motif en « L » répété (periodique en 8w).
    u = (xx + yy) / np.sqrt(2)
    v = (yy - xx) / np.sqrt(2)
    rng = np.random.default_rng(seed)
    cell = np.floor(u / L)
    uu = u - cell * L
    vv = v + cell * w
    row = np.floor(vv / w)
    ww = vv - row * w
    edge = np.minimum.reduce([uu, L - uu, ww, w - ww])
    bid = (cell * 97 + row * 13).astype(np.int64)
    uniq, inv = np.unique(bid, return_inverse=True)
    inv = inv.reshape(size, size)
    palette = np.array([rgb(c) for c in ('#9c4a31', '#a9573a', '#8a3f2a', '#b5623f', '#7f3a28', '#a14e36')])
    col = palette[rng.integers(0, len(palette), len(uniq))] * rng.uniform(0.85, 1.1, (len(uniq), 1))
    albedo = col[inv] * (0.82 + 0.3 * spectral_noise(size, seed + 1, beta=1.6))[..., None]
    g = 1 - smoothstep(1.5, 4.0, edge)
    albedo = mix(albedo, rgb('#b8ab92') * (0.85 + 0.2 * band_noise(size, seed + 2, 150, 450))[..., None], g)
    bev = smoothstep(3, 10, edge)
    albedo *= (0.82 + 0.18 * bev)[..., None]
    return albedo, 0.5 + 0.4 * bev - 0.3 * g


# ───────────────────────── textiles ─────────────────────────

def carpet(seed: int, cols: list[str], loop: bool = False):
    """Moquette velours : fibres coupées (bruit fin anisotrope), traces de marche/aspirateur, pas de motif répétitif."""
    size = SIZE
    fib = band_noise(size, seed, 220, 512)
    fib2 = band_noise(size, seed + 1, 120, 300, sx=1.0, sy=0.6)
    shade = spectral_noise(size, seed + 2, beta=3.4)
    # Traces de brossage : grandes bandes diagonales douces.
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
    sweep = 0.5 + 0.5 * np.sin(2 * np.pi * (xx * 3 + yy * 1 + (spectral_noise(size, seed + 3, beta=3.6) - 0.5) * 1.2))
    t = np.clip(0.45 * fib + 0.25 * fib2 + 0.3 * shade, 0, 1)
    albedo = colorize(t, [(0, cols[0]), (0.55, cols[1]), (1, cols[2])])
    albedo *= (0.88 + 0.12 * sweep)[..., None]
    # Touffes de velours au pixel : chaque fibre capte la lumière différemment.
    rng = np.random.default_rng(seed + 4)
    tuft = blur(rng.random((size, size)), 0.7)
    tuft = (tuft - tuft.mean()) / (tuft.std() + 1e-9)
    albedo *= np.clip(1 + 0.09 * tuft, 0.7, 1.3)[..., None]
    if loop:
        lp = 0.5 + 0.5 * np.cos(2 * np.pi * xx * 128) * np.cos(2 * np.pi * yy * 128)
        albedo *= (0.9 + 0.1 * lp)[..., None]
    height = 0.6 + 0.2 * fib + 0.1 * fib2 + 0.04 * tuft
    return albedo, height


# ───────────────────────── murs ─────────────────────────

def brick_wall(seed: int, palette: list[str], mortar: str, painted: str | None = None, courses: int = 12, per_row: int = 4,
               mortar_px: float = 9, recess: float = 0.55, wear: float = 0.4):
    """Mur de briques en appareil panneresse : briques bombées, arêtes émoussées, joints creux, efflorescences."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    bh = size / courses
    bw = size / per_row
    row = np.floor(yy / bh)
    xs = (xx + np.where(row % 2 == 1, bw / 2, 0)) % size
    col = np.floor(xs / bw)
    # Bords irréguliers : distorsion douce de la frontière des briques.
    jit_x = (spectral_noise(size, seed + 1, beta=2.4) - 0.5) * 5
    jit_y = (spectral_noise(size, seed + 2, beta=2.4) - 0.5) * 4
    u = (xs % bw) + jit_x
    v = (yy % bh) + jit_y
    edge = np.minimum.reduce([u, bw - u, v, bh - v])
    bid = (row * per_row + col).astype(int)
    n = courses * per_row
    cols = np.array([rgb(c) for c in palette])
    bcol = cols[rng.integers(0, len(cols), n)] * rng.uniform(0.85, 1.12, (n, 1))
    albedo = bcol[bid]
    clay = spectral_noise(size, seed + 3, beta=1.4)
    sand_ = band_noise(size, seed + 4, 200, 512)
    grain = np.random.default_rng(seed + 9).random((size, size))
    albedo *= (0.8 + 0.22 * clay + 0.1 * sand_ + 0.12 * grain)[..., None]
    dark_specks = (grain > 0.985).astype(float)
    albedo *= (1 - 0.35 * dark_specks)[..., None]
    # Brique flammée : une extrémité plus sombre (cuisson).
    flame = (rng.random(n) < 0.35)[bid] * smoothstep(bw * 0.55, bw, np.where(rng.random(n)[bid] < 0.5, u, bw - u))
    albedo *= (1 - 0.18 * flame)[..., None]
    chips = smoothstep(0.82, 0.92, band_noise(size, seed + 5, 90, 260)) * smoothstep(mortar_px * 2.5, mortar_px, edge)
    m = 1 - smoothstep(mortar_px * 0.45, mortar_px * 0.75, edge + chips * 4)
    bevel = smoothstep(mortar_px * 0.6, mortar_px * 1.8, edge)
    mortar_c = rgb(mortar) * (0.82 + 0.3 * band_noise(size, seed + 6, 150, 450))[..., None]
    albedo = mix(albedo, mortar_c, m)
    height = (1 - m) * (0.7 + 0.25 * bevel + 0.05 * clay) + m * (0.7 - recess) + m * 0.05 * sand_
    albedo *= (0.62 + 0.38 * ao_from_height(height, 6, 1.4))[..., None]
    if painted:
        # Peinture sur brique : relief conservé, couleur unifiée, usure laissant voir la brique.
        paint = rgb(painted) * (0.93 + 0.07 * clay)[..., None]
        worn = smoothstep(0.82, 0.95, spectral_noise(size, seed + 7, beta=2.6)) * wear * smoothstep(mortar_px * 3, mortar_px, edge)
        albedo = mix(paint * (0.8 + 0.2 * ao_from_height(height, 6, 1.4))[..., None], albedo, worn)
    else:
        # Efflorescences salines blanchâtres en bas de certaines zones.
        eff = smoothstep(0.8, 0.97, spectral_noise(size, seed + 8, beta=3.2)) * 0.12
        albedo = mix(albedo, rgb('#e8e2d6'), eff)
    return np.clip(albedo, 0, 1), height


def ashlar_wall(seed: int, palette: list[str], joint: str, courses: int = 5, min_w=0.18, max_w=0.42, joint_px: float = 6,
                chisel: float = 1.0):
    """Pierre de taille / moellons en assises réglées : blocs de longueurs variées, faces bouchardées, joints creux."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    heights = rng.uniform(0.7, 1.3, courses)
    heights = heights / heights.sum() * size
    edges_y = np.concatenate([[0], np.cumsum(heights)])
    row = np.clip(np.searchsorted(edges_y, yy, side='right') - 1, 0, courses - 1)
    bid = np.zeros((size, size), dtype=np.int64)
    edge = np.zeros((size, size))
    uu = np.zeros((size, size))
    block = 0
    cols = np.array([rgb(c) for c in palette])
    color_of = []
    for r in range(courses):
        y0, y1 = edges_y[r], edges_y[r + 1]
        widths = []
        rem = size
        while rem > 0:
            w = rng.uniform(min_w, max_w) * size
            if rem - w < min_w * size * 0.6:
                w = rem
            widths.append(w)
            rem -= w
        off = rng.uniform(0, size)
        m = row == r
        x_local = (xx[m] - off) % size
        cum = np.concatenate([[0], np.cumsum(widths)])
        k = np.clip(np.searchsorted(cum, x_local, side='right') - 1, 0, len(widths) - 1)
        u = x_local - cum[k]
        wv = np.array(widths)[k]
        v = yy[m] - y0
        hv = y1 - y0
        edge[m] = np.minimum.reduce([u, wv - u, v, hv - v])
        bid[m] = block + k
        uu[m] = u
        for _ in widths:
            color_of.append(cols[int(rng.integers(0, len(cols)))] * rng.uniform(0.88, 1.1))
        block += len(widths)
    color_of = np.array(color_of)
    jx = (spectral_noise(size, seed + 1, beta=2.2) - 0.5) * 6
    edge = edge + jx
    albedo = color_of[bid]
    tex = spectral_noise(size, seed + 2, beta=1.6)
    pits = band_noise(size, seed + 3, 150, 450)
    albedo *= (0.8 + 0.28 * tex + 0.1 * pits * chisel)[..., None]
    # Lits de sédimentation horizontaux.
    strata = spectral_noise(size, seed + 4, beta=2.8, sx=0.15, sy=1.0)
    albedo *= (0.92 + 0.14 * strata)[..., None]
    j = 1 - smoothstep(joint_px * 0.4, joint_px, edge)
    bev = smoothstep(joint_px, joint_px * 3.5, edge)
    jc = rgb(joint) * (0.85 + 0.25 * pits)[..., None]
    albedo = mix(albedo, jc, j)
    face = 0.08 * tex + 0.06 * pits * chisel
    height = (1 - j) * (0.62 + 0.28 * bev + face) + j * 0.15
    albedo *= (0.6 + 0.4 * ao_from_height(height, 8, 1.3))[..., None]
    return np.clip(albedo, 0, 1), height


def ledgestone(seed: int = 411):
    """Parement ardoise en plaquettes empilées : lames fines de profondeurs différentes, ombres marquées."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    albedo = np.zeros((size, size, 3))
    height = np.zeros((size, size))
    y = 0.0
    palette = np.array([rgb(c) for c in ('#3b3d42', '#4a4c51', '#56534e', '#2f3135', '#5f5b55', '#45474d', '#6b6258')])
    while y < size:
        h = rng.uniform(10, 34)
        if size - y - h < 10:
            h = size - y
        x = rng.uniform(0, size)
        end = x + size
        while x < end - 1:
            w = rng.uniform(70, 260)
            if end - x - w < 50:
                w = end - x
            depth = rng.uniform(0.35, 1.0)
            c = palette[int(rng.integers(0, len(palette)))] * rng.uniform(0.85, 1.15)
            ys = (np.arange(int(y), int(min(size, y + h)))) % size
            xs_ = (np.arange(int(x), int(x + w))) % size
            sub_y, sub_x = np.meshgrid(ys, xs_, indexing='ij')
            lv = (sub_y - y) / max(1, h)
            lu = (np.arange(len(xs_)) / max(1, len(xs_)))[None, :]
            e = np.minimum.reduce(np.broadcast_arrays(lv * h, (1 - lv) * h, lu * w, (1 - lu) * w))
            face = smoothstep(0, 3, e)
            albedo[sub_y, sub_x] = c * (0.55 + 0.45 * face)[..., None]
            height[sub_y, sub_x] = depth * face
            x += w
        y += h
    split = band_noise(size, seed + 1, 40, 200, sx=0.1, sy=1.0)
    albedo *= (0.82 + 0.3 * split)[..., None]
    rust = smoothstep(0.75, 0.95, spectral_noise(size, seed + 2, beta=2.6)) * 0.35
    albedo = mix(albedo, rgb('#8a5a33') * (0.8 + 0.3 * split)[..., None], rust)
    height = height * 0.8 + 0.1 * split
    albedo *= (0.55 + 0.45 * ao_from_height(height, 5, 1.2))[..., None]
    return np.clip(albedo, 0, 1), height


def architectural_concrete(seed: int = 421, boards: int = 0):
    """Béton architectonique : panneaux de coffrage 2 × 1, trous d'entretoises, laitance nuageuse, ou planches (board-formed)."""
    size = SIZE
    a, h = concrete(seed, ('#8c8b86', '#9f9d97', '#b3b0a9'), joints=0)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    if boards:
        ph = size / boards
        row = np.floor(yy / ph)
        rng = np.random.default_rng(seed + 1)
        grain = np.zeros((size, size))
        for r in range(boards):
            g = grain_field(size, seed + 10 + r, 5, 'x')
            m = row == r
            grain[m] = np.roll(g, int(rng.integers(0, size)), axis=1)[m]
        tone = rng.uniform(0.92, 1.08, boards)[row.astype(int)]
        v = yy % ph
        seam = 1 - smoothstep(0.5, 2.5, np.minimum(v, ph - v))
        a = a * (0.86 + 0.2 * grain)[..., None] * tone[..., None]
        a *= (1 - 0.3 * seam)[..., None]
        h = h + 0.12 * grain - 0.4 * seam
    else:
        # Panneaux 2 × 1 et trous de banches (6 par panneau).
        pw, ph = size / 2, size / 2
        u = xx % pw
        v = yy % ph
        seam = 1 - smoothstep(0.5, 2.0, np.minimum.reduce([u, pw - u, v, ph - v]))
        hx = np.stack([(u - pw * f) for f in (0.2, 0.5, 0.8)])
        hy = np.stack([(v - ph * f) for f in (0.25, 0.75)])
        dmin = np.full((size, size), np.inf)
        for dx in hx:
            for dy in hy:
                dmin = np.minimum(dmin, np.sqrt(dx * dx + dy * dy))
        hole = 1 - smoothstep(9, 12, dmin)
        ring = smoothstep(9, 12, dmin) * (1 - smoothstep(12, 22, dmin))
        a *= (1 - 0.25 * seam - 0.55 * hole + 0.05 * ring)[..., None]
        h = h - 0.3 * seam - 0.6 * hole
    return np.clip(a, 0, 1), h


def plaster(seed: int, cols=('#e9e6e0', '#f1eee9', '#f8f6f2'), trowel: float = 0.5, mottle: float = 0.2):
    """Enduit (quasi blanc, teinté par la peinture du mur) : passes de taloche, nuances de séchage."""
    size = SIZE
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    strokes = np.zeros((size, size))
    rng = np.random.default_rng(seed)
    # Passes de taloche : arcs larges superposés, bords légèrement plus marqués.
    for _ in range(26):
        cx, cy = rng.uniform(0, size, 2)
        r = rng.uniform(140, 320)
        ang = rng.uniform(0, np.pi)
        dx = (xx - cx + size / 2) % size - size / 2
        dy = (yy - cy + size / 2) % size - size / 2
        ex = dx * np.cos(ang) + dy * np.sin(ang)
        ey = (-dx * np.sin(ang) + dy * np.cos(ang)) * 2.4
        d = np.sqrt(ex * ex + ey * ey) / r
        strokes += np.exp(-(d ** 2) * 2) * rng.uniform(-1, 1) + np.exp(-((d - 1) ** 2) * 60) * 0.35
    strokes = (strokes - strokes.min()) / max(1e-6, np.ptp(strokes))
    cloud = spectral_noise(size, seed + 1, beta=3.4)
    fine = band_noise(size, seed + 2, 200, 512)
    t = np.clip(0.5 + trowel * (strokes - 0.5) * 0.8 + mottle * (cloud - 0.5) + 0.1 * (fine - 0.5), 0, 1)
    albedo = colorize(t, [(0, cols[0]), (0.5, cols[1]), (1, cols[2])])
    height = 0.7 + 0.15 * strokes * trowel + 0.05 * fine
    return albedo, height


def metro_tile(seed: int = 431):
    """Carreau métro biseauté émaillé blanc : glaçure légèrement ondulée, joint gris clair."""
    size = SIZE
    def body():
        t = spectral_noise(SIZE, seed, beta=2.8)
        return colorize(t, [(0, '#e9ebea'), (1, '#f7f8f6')])
    a, h, _, edge = tile_grid(seed, 4, 8, body, '#b9b8b2', grout_px=5, bevel=14, tone_var=0.025, offset_rows=True)
    ripple = spectral_noise(size, seed + 1, beta=3.6)
    h = h + 0.05 * ripple
    return a, h


def soft_marble(seed: int, base: list[tuple[float, str]], vein: str, freq: float = 2, alpha: float = 0.7, angle=(1.0, 0.55)):
    """Marbre à veines continues : champ de déformation très lisse (pas de mouchetis), veine principale + filets."""
    size = SIZE
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
    w1 = spectral_noise(size, seed, beta=4.4)
    w2 = spectral_noise(size, seed + 1, beta=4.4)
    w3 = spectral_noise(size, seed + 2, beta=3.2)
    phase = angle[0] * xx + angle[1] * yy
    p1 = phase * freq + (w1 - 0.5) * 1.3 + (w3 - 0.5) * 0.15
    main = np.power(1 - np.abs(np.sin(np.pi * p1)), 22)
    halo = np.power(1 - np.abs(np.sin(np.pi * p1)), 5) * 0.22
    p2 = (angle[0] * xx - angle[1] * 1.6 * yy) * (freq + 1) + (w2 - 0.5) * 1.6
    thin = np.power(1 - np.abs(np.sin(np.pi * p2)), 70) * smoothstep(0.35, 0.7, spectral_noise(size, seed + 3, beta=3.0))
    body = colorize(spectral_noise(size, seed + 4, beta=2.8), base)
    v = np.clip(main * 0.85 + halo + thin * 0.6, 0, 1) * alpha
    albedo = mix(body, rgb(vein) * (0.9 + 0.2 * w3)[..., None], v)
    return albedo, 0.9 - 0.05 * v


def water():
    """Clapot : vaguelettes croisées (sert surtout de carte de normales animée) sur un bleu d'eau profonde."""
    size = SIZE
    a = spectral_noise(size, 801, beta=3.4, sx=1.0, sy=1.6)
    b = spectral_noise(size, 802, beta=2.6, sx=1.6, sy=1.0)
    h = 0.6 * a + 0.4 * b
    albedo = colorize(h, [(0, '#1f7fa3'), (0.6, '#2a9cc2'), (1, '#45b6d6')])
    return albedo, h


def foliage():
    """Feuillage dense (haies, couronnes) : petites feuilles ovales superposées, ombre entre les couches."""
    size = SIZE
    big = size * 2
    rng = np.random.default_rng(811)
    img = Image.new('RGB', (big, big), (22, 38, 16))
    hm = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(img)
    dh = ImageDraw.Draw(hm)
    cols = [rgb(c) for c in ('#3f6b2a', '#4c7d31', '#355e24', '#5a8c3a', '#2d5220', '#6b9a44')]
    for layer in range(4):
        shade = 0.55 + 0.15 * layer
        for _ in range(9000):
            x, y = rng.uniform(0, big, 2)
            L = rng.uniform(14, 26)
            W = L * rng.uniform(0.4, 0.6)
            ang = rng.uniform(0, np.pi)
            c = cols[int(rng.integers(0, len(cols)))] * rng.uniform(0.85, 1.15) * shade
            fill = tuple(int(v) for v in np.clip(c * 255, 0, 255))
            ca, sa = np.cos(ang), np.sin(ang)
            for (px, py) in wrap_positions(x, y, big, L + 2):
                pts = [(px + ca * L * np.cos(t) - sa * W * np.sin(t), py + sa * L * np.cos(t) + ca * W * np.sin(t)) for t in np.linspace(0, 2 * np.pi, 10)]
                d.polygon(pts, fill=fill)
                dh.polygon(pts, fill=int(60 + 60 * layer))
                # Nervure centrale plus claire.
                d.line([(px - ca * L * 0.8, py - sa * L * 0.8), (px + ca * L * 0.8, py + sa * L * 0.8)], fill=tuple(min(255, int(v * 1.25)) for v in fill), width=2)
    albedo = np.asarray(img.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255.0
    h = np.asarray(hm.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255.0
    albedo *= (0.6 + 0.4 * ao_from_height(h, 5, 1.6))[..., None]
    return albedo, h


def veined_marble():
    return soft_marble(651, [(0, '#e6e3de'), (0.6, '#efede9'), (1, '#f8f7f4')], '#7b7771')


# ───────────────────────── catalogue ─────────────────────────

LAWN = ['#3d7a2c', '#4a8a33', '#356b27', '#5a9a3c', '#2e5f22', '#6aa446']

# ───────────────────────── toitures, toile, mosaïque ─────────────────────────

def roof_tiles(seed: int = 801, courses: int = 6, per_row: int = 6):
    """Tuiles canal / romanes : rangs bombés qui se recouvrent, ombre portée sous chaque rang, teintes flammées."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    th = size / courses
    tw = size / per_row
    row = np.floor(yy / th)
    xs = (xx + np.where(row % 2 == 1, tw / 2, 0)) % size
    col = np.floor(xs / tw)
    u = (xs % tw) / tw
    v = (yy % th) / th  # 0 = haut du rang (sous le rang supérieur), 1 = nez de la tuile
    tid = (row * per_row + col).astype(int)
    n = courses * per_row
    palette = np.array([rgb(c) for c in ('#b5562f', '#a84b2a', '#c0643a', '#9c4527', '#b85f36', '#8f3f24', '#c8703f')])
    tone = palette[rng.integers(0, len(palette), n)] * rng.uniform(0.86, 1.1, (n, 1))
    albedo = tone[tid]
    barrel = np.sin(np.pi * u) ** 0.7
    # Nez de tuile légèrement arrondi, ombre dans le creux entre deux tuiles.
    height = 0.35 + 0.55 * barrel * (0.85 + 0.15 * v)
    shade = 0.62 + 0.38 * barrel
    # Ombre portée par le rang du dessus.
    cast = smoothstep(0.0, 0.22, v)
    shade *= 0.55 + 0.45 * cast
    grain = spectral_noise(size, seed + 1, beta=1.3)
    lichen = smoothstep(0.78, 0.93, spectral_noise(size, seed + 2, beta=2.8)) * 0.35
    albedo = albedo * (shade * (0.85 + 0.25 * grain))[..., None]
    albedo = mix(albedo, rgb('#6d6a4a'), lichen * (1 - barrel * 0.5))
    edge_dark = 1 - 0.35 * (1 - smoothstep(0.9, 1.0, 1 - v))
    albedo *= edge_dark[..., None]
    return np.clip(albedo, 0, 1), np.clip(height * (0.7 + 0.3 * cast), 0, 1)


def roof_slate(seed: int = 811, courses: int = 10, per_row: int = 5):
    """Ardoises naturelles : pose à pureau décalé, bords légèrement irréguliers, reflets bleutés."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    th = size / courses
    tw = size / per_row
    row = np.floor(yy / th)
    xs = (xx + np.where(row % 2 == 1, tw / 2, 0)) % size
    col = np.floor(xs / tw)
    jit = (spectral_noise(size, seed + 1, beta=2.2) - 0.5) * 6
    u = (xs % tw) + jit
    v = (yy % th) / th
    tid = (row * per_row + col).astype(int)
    n = courses * per_row
    palette = np.array([rgb(c) for c in ('#3b4048', '#454a53', '#343840', '#4d525a', '#3f444e')])
    albedo = palette[rng.integers(0, len(palette), n)][tid] * rng.uniform(0.9, 1.1, (n, 1))[tid]
    gap = 1 - smoothstep(1.5, 3.5, np.minimum(u, tw - u))
    cast = smoothstep(0.0, 0.25, v)
    cleave = band_noise(size, seed + 2, 60, 300)
    albedo *= (0.7 + 0.3 * cast)[..., None] * (0.88 + 0.2 * cleave)[..., None]
    albedo = mix(albedo, rgb('#1d2026'), gap * 0.9)
    height = 0.4 + 0.35 * v + 0.1 * cleave - 0.35 * gap
    return np.clip(albedo, 0, 1), np.clip(height, 0, 1)


def tent_pvc(seed: int = 821):
    """Toile de tente PVC : armature polyester tissée visible en lumière rasante, soudure de lé, légères salissures."""
    size = SIZE
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    weave = 0.5 + 0.25 * np.sin(xx * np.pi / 3) * np.sin(yy * np.pi / 3) + 0.25 * np.sin((xx + yy) * np.pi / 6)
    mottle = spectral_noise(size, seed, beta=2.4)
    seam = np.exp(-((yy - size / 2) ** 2) / (2 * 6.0 ** 2))
    seam_edge = np.exp(-((np.abs(yy - size / 2) - 14) ** 2) / (2 * 1.6 ** 2))
    base = 0.93 + 0.03 * mottle - 0.012 * weave
    dirt = smoothstep(0.75, 0.95, spectral_noise(size, seed + 1, beta=3.0)) * 0.03
    lum = base - dirt - 0.035 * seam_edge + 0.01 * seam
    albedo = np.stack([lum * 0.995, lum * 0.99, lum * 0.975], -1)
    height = 0.5 + 0.04 * weave + 0.25 * seam - 0.15 * seam_edge
    return np.clip(albedo, 0, 1), np.clip(height, 0, 1)


def pool_mosaic(seed: int = 831, n: int = 20):
    """Mosaïque de pâte de verre 2,5 cm : carreaux bleus nuancés, joint clair, léger bombé."""
    size = SIZE
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    t = size / n
    col = np.floor(xx / t)
    row = np.floor(yy / t)
    u = xx % t
    v = yy % t
    edge = np.minimum.reduce([u, t - u, v, t - v])
    tid = (row * n + col).astype(int)
    palette = np.array([rgb(c) for c in ('#5fb8d6', '#4aa7c9', '#76c6de', '#3d93b8', '#8fd3e6', '#52aecf', '#2f86ad')])
    albedo = palette[rng.integers(0, len(palette), n * n)][tid] * rng.uniform(0.92, 1.08, (n * n, 1))[tid]
    g = 1 - smoothstep(1.5, 3.0, edge)
    dome = smoothstep(2.0, t * 0.5, edge)
    albedo *= (0.9 + 0.12 * dome)[..., None]
    albedo = mix(albedo, rgb('#dfe6e8'), g)
    height = 0.45 + 0.4 * dome - 0.3 * g
    return np.clip(albedo, 0, 1), np.clip(height, 0, 1)


JOBS = {
    # Gazons & végétal
    'grass-lawn': lambda: (grass(501, LAWN, '#2a2a16', 170000, dry=0.12), 7),
    'grass-fine': lambda: (grass(511, ['#4f9a38', '#5aa640', '#448a31', '#66b04a', '#3c7d2b'], '#243016', 220000, (7, 15), (1, 2), dry=0.05), 6),
    'grass-striped': lambda: (grass(521, ['#4b9535', '#56a13d', '#428630', '#5fab45'], '#233016', 220000, (7, 15), (1, 2), stripes=0.16), 6),
    'turf-synthetic': lambda: (turf_synthetic(), 5),
    'meadow': lambda: (grass(531, ['#6c8f3a', '#7f9c45', '#5b7d31', '#8ea552', '#4d6e2a', '#a3a55a'], '#3b3520', 110000, (16, 38), (1, 3), dry=0.35, flowers=160, flower_cols=('#f5f1e6', '#f2c230', '#b58fd6', '#e46a6a'), clover=120), 8),
    'lawn-flowers': lambda: (grass(541, LAWN, '#2a2a16', 170000, dry=0.06, flowers=420, flower_cols=('#fbfaf5', '#fbfaf5', '#fbfaf5', '#f7d23e', '#f2a7c2'), clover=260), 7),
    # Sols meubles
    'sand': lambda: (sand(), 6),
    'gravel-light': lambda: (pebbles(551, 2600, ['#d9d2c4', '#c9c0ae', '#e6e0d3', '#b9ae99', '#a79d8a', '#ede8dd'], '#8f8674', size_var=0.45), 7),
    'gravel-dark': lambda: (pebbles(561, 2600, ['#4b4b4e', '#5c5b5c', '#3a3a3d', '#6d6a66', '#2e2e31', '#7a766f'], '#26262a', size_var=0.45), 7),
    'pebbles': lambda: (pebbles(571, 420, ['#c9c1b3', '#a8a092', '#8f887d', '#d9d3c7', '#6f6a62', '#b4a28a'], '#5d574d', round_=1.0, size_var=0.3, dust=0.1, fill=0.44), 9),
    'dirt': lambda: (dirt(), 7),
    'deck-ipe': lambda: (wood_planks('deck-ipe', [(0, '#4a2616'), (0.4, '#6b3a22'), (0.75, '#844b2d'), (1, '#9a5d3b')], 581, plank_w=146, lengths=(1024, 768, 512), rings=18, tone_var=0.16, gap_dark=0.85), 9),
    # Minéraux
    'concrete': lambda: (concrete(591), 5),
    'epoxy-grey': lambda: (concrete(595, ('#bcc3cc', '#c9cfd6', '#d6dbe1'), joints=0), 1.2),
    'herringbone-honey': lambda: (herringbone('herringbone-honey', ['#c8955a', '#b9864c', '#d3a26a', '#ad7a42', '#c08d52'], 181), 6),
    'concrete-polished': lambda: (concrete(601, ('#7f7c76', '#95928b', '#a9a59d'), polished=True, joints=1), 2.5),
    'terrazzo-classic': lambda: (terrazzo(611, 2600, ['#9a9690', '#c9c3b8', '#5d5a55', '#d8d2c6', '#b7a58c', '#7d7a74']), 2),
    'terrazzo-venetian': lambda: (terrazzo(621, 1100, ['#b3746a', '#e2ddd3', '#6e6a63', '#c9a77d', '#8e3d33', '#f0ece4', '#355e58'], ('#e2dcd0', '#ece7de'), (6, 18)), 2),
    'stone-tile': lambda: (tile_grid(631, 4, 4, limestone_body(632, ('#d6d0c4', '#e2ddd2', '#cbc3b4')), '#a59d8e', 3, 5)[:2], 5),
    'limestone-slabs': lambda: (tile_grid(641, 2, 4, limestone_body(642), '#9d927d', 4, 7, offset_rows=True)[:2], 5),
    'tomettes': lambda: (tomettes(), 6),
    'pavers-fan': lambda: (fan_pavers(), 7),
    'marble-veined': lambda: (veined_marble(), 2),
    'marble-checker': lambda: (checker_marble(), 3),
    'brick-pavers': lambda: (brick_floor(), 6),
    # Textiles
    'carpet-navy': lambda: (carpet(661, ['#171a33', '#232749', '#303660']), 2.5),
    'carpet-red': lambda: (carpet(671, ['#4d0a12', '#6e1019', '#8c1a22']), 2.5),
    # Eau & végétation (aménagements extérieurs)
    'water': lambda: (water(), 4),
    'foliage': lambda: (foliage(), 6),
    # Murs
    'wall-brick': lambda: (brick_wall(701, ['#9a4a33', '#a6553b', '#8b402d', '#b0603f', '#7c3829', '#a14c34', '#93503d'], '#b7ab98'), 8),
    'wall-brick-painted': lambda: (brick_wall(711, ['#9a4a33', '#a6553b', '#8b402d'], '#d8d4cc', painted='#f1efea', wear=0.25), 7),
    'wall-stone': lambda: (ashlar_wall(721, ['#b3a58c', '#c7bda9', '#9c8f78', '#d2c7b2', '#a3927a', '#8f8472'], '#857c6b', joint_px=6, chisel=1.8), 9),
    'wall-slate': lambda: (ledgestone(), 9),
    'wall-concrete': lambda: (architectural_concrete(), 5),
    'wall-board-concrete': lambda: (architectural_concrete(731, boards=8), 6),
    'wall-plaster': lambda: (plaster(741), 2.5),
    'wall-limewash': lambda: (plaster(751, ('#e2ddd4', '#efebe4', '#faf8f3'), trowel=0.9, mottle=0.55), 2),
    'wall-metro': lambda: (metro_tile(), 5),
    # Toitures, toiles de tente, bassins
    'roof-tiles': lambda: (roof_tiles(), 8),
    'roof-slate': lambda: (roof_slate(), 6),
    'tent-pvc': lambda: (tent_pvc(), 2),
    'pool-mosaic': lambda: (pool_mosaic(), 3),
}


def main(filters: list[str]):
    for name, job in JOBS.items():
        if filters and not any(f in name for f in filters):
            continue
        (albedo, height), strength = job()
        save(name, albedo, height, strength)


if __name__ == '__main__':
    main(sys.argv[1:])
