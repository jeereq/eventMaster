#!/usr/bin/env python3
"""Génère les textures de sol / plateau procédurales (sans raccord) de public/floors/gen.

Toutes les images sont calculées ici (bruit spectral périodique, Voronoï périodique,
calepinages exacts) : aucune photo tierce, donc aucune question de licence.
Chaque texture boucle parfaitement (bords gauche/droite et haut/bas identiques).

Usage : python3 scripts/textures/generate_textures.py  (depuis frontend/)
Dépendances : numpy, pillow.
"""

from __future__ import annotations

import os
import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'floors', 'gen')
SIZE = 1024
NORMAL_SIZE = 512


# ───────────────────────── bruit périodique ─────────────────────────

def spectral_noise(size: int, seed: int, beta: float = 2.0, sx: float = 1.0, sy: float = 1.0, low_cut: float = 1.0) -> np.ndarray:
    """Bruit fractal par filtrage fréquentiel : périodique par construction. Retour dans [0, 1]."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((size, size))
    fy = np.fft.fftfreq(size)[:, None] * size
    fx = np.fft.fftfreq(size)[None, :] * size
    f = np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2)
    f[0, 0] = 1.0
    amp = 1.0 / np.power(np.maximum(f, low_cut), beta / 2.0)
    amp[0, 0] = 0.0
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * amp))
    out -= out.min()
    out /= max(1e-9, out.max())
    return out


def band_noise(size: int, seed: int, fmin: float, fmax: float, sx: float = 1.0, sy: float = 1.0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((size, size))
    fy = np.fft.fftfreq(size)[:, None] * size
    fx = np.fft.fftfreq(size)[None, :] * size
    f = np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2)
    mask = ((f >= fmin) & (f <= fmax)).astype(float)
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * mask))
    out -= out.min()
    out /= max(1e-9, out.max())
    return out


def warp(img: np.ndarray, dx: np.ndarray, dy: np.ndarray) -> np.ndarray:
    """Échantillonnage périodique (bilinéaire) de img décalé par (dx, dy) pixels."""
    size_y, size_x = img.shape[:2]
    yy, xx = np.mgrid[0:size_y, 0:size_x].astype(np.float64)
    x = (xx + dx) % size_x
    y = (yy + dy) % size_y
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    x1 = (x0 + 1) % size_x
    y1 = (y0 + 1) % size_y
    if img.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    a = img[y0, x0] * (1 - fx) + img[y0, x1] * fx
    b = img[y1, x0] * (1 - fx) + img[y1, x1] * fx
    return a * (1 - fy) + b * fy


def lerp(a, b, t):
    return a + (b - a) * t


def rgb(hex_color: str) -> np.ndarray:
    h = hex_color.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def colorize(t: np.ndarray, stops: list[tuple[float, str]]) -> np.ndarray:
    out = np.zeros(t.shape + (3,))
    pos = np.array([s[0] for s in stops])
    cols = np.array([rgb(s[1]) for s in stops])
    for c in range(3):
        out[..., c] = np.interp(t, pos, cols[:, c])
    return out


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def normal_from_height(h: np.ndarray, strength: float) -> np.ndarray:
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    nx = -dx * strength
    ny = dy * strength  # convention OpenGL (Y+ vers le haut) utilisée par three.js
    nz = np.ones_like(h)
    n = np.stack([nx, ny, nz], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def save(name: str, albedo: np.ndarray, height: np.ndarray | None = None, strength: float = 6.0, quality: int = 86):
    os.makedirs(OUT, exist_ok=True)
    img = Image.fromarray((np.clip(albedo, 0, 1) * 255).astype(np.uint8), 'RGB')
    img.save(os.path.join(OUT, f'{name}.jpg'), quality=quality, optimize=True, progressive=True)
    if height is not None:
        h = np.asarray(Image.fromarray((np.clip(height, 0, 1) * 65535).astype(np.uint16)).resize((NORMAL_SIZE, NORMAL_SIZE), Image.BILINEAR), dtype=np.float64) / 65535.0
        n = normal_from_height(h, strength * NORMAL_SIZE / 512)
        Image.fromarray((n * 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{name}-normal.jpg'), quality=90, optimize=True)
    print('✓', name)


# ───────────────────────── bois ─────────────────────────

def grain_field(size: int, seed: int, rings: float, along: str = 'x') -> np.ndarray:
    """Veinage de bois périodique (fibres longues + cernes légèrement ondulés). Retour [0, 1]."""
    # sx > 1 pénalise les fréquences en x : motifs allongés le long de x.
    long_ax, cross_ax = (12.0, 1.0) if along == 'x' else (1.0, 12.0)
    fibers = spectral_noise(size, seed, beta=1.6, sx=long_ax, sy=cross_ax)
    warp_n = spectral_noise(size, seed + 1, beta=4.0, sx=long_ax * 0.5, sy=cross_ax * 0.5)
    coord = np.mgrid[0:size, 0:size][0 if along == 'x' else 1].astype(np.float64) / size
    ring = 0.5 + 0.5 * np.sin(2 * np.pi * (coord * rings + (warp_n - 0.5) * 1.4))
    ring = np.power(ring, 2.2)
    pores = band_noise(size, seed + 2, 90, 260, sx=long_ax * 0.25, sy=cross_ax * 0.25)
    return np.clip(0.5 * ring + 0.38 * fibers + 0.12 * pores, 0, 1)


def plank_layout(size: int, plank_w: int, lengths_px: list[int], seed: int):
    """Lames à joints décalés ; chaque rangée boucle exactement sur `size`."""
    rng = np.random.default_rng(seed)
    ids = np.zeros((size, size), dtype=np.int32)
    local_u = np.zeros((size, size))
    gap = np.zeros((size, size))
    rows = size // plank_w
    pid = 0
    for r in range(rows):
        # Longueurs de la rangée qui somment exactement à size.
        segs: list[int] = []
        remaining = size
        while remaining > 0:
            L = int(rng.choice(lengths_px))
            if remaining - L < min(lengths_px) // 2:
                L = remaining
            segs.append(L)
            remaining -= L
        offset = int(rng.integers(0, size))
        x = offset
        for L in segs:
            xs = (np.arange(x, x + L)) % size
            y0, y1 = r * plank_w, (r + 1) * plank_w
            ids[y0:y1, xs] = pid
            local_u[y0:y1, xs] = np.arange(L)[None, :] / L
            # Joints de bout.
            gap[y0:y1, xs[:2]] = 1
            pid += 1
            x += L
        gap[r * plank_w:r * plank_w + 2, :] = 1
    return ids, local_u, gap, pid


def wood_planks(name: str, palette: list[tuple[float, str]], seed: int, plank_w: int = 128, lengths=(512, 768, 1024, 384), rings: float = 9.0, tone_var: float = 0.18, knots: int = 0, gap_dark: float = 0.45, saw_marks: bool = False):
    size = SIZE
    ids, local_u, gap, count = plank_layout(size, plank_w, list(lengths), seed)
    rng = np.random.default_rng(seed + 7)
    grains = [grain_field(size, seed + 11 * k, rings) for k in range(3)]
    t = np.zeros((size, size))
    tone = np.zeros((size, size))
    for p in range(count):
        m = ids == p
        g = grains[p % 3]
        dy = int(rng.integers(0, size))
        dx = int(rng.integers(0, size))
        t[m] = np.roll(np.roll(g, dy, axis=0), dx, axis=1)[m]
        tone[m] = rng.uniform(-tone_var, tone_var)
    if knots:
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
        for _ in range(knots):
            cx, cy = rng.uniform(0, size, 2)
            r = rng.uniform(10, 22)
            ddx = (xx - cx + size / 2) % size - size / 2
            ddy = (yy - cy + size / 2) % size - size / 2
            d = np.sqrt((ddx / 2.2) ** 2 + ddy ** 2)
            k = np.exp(-(d / r) ** 2)
            ringk = 0.5 + 0.5 * np.sin(d * 0.9)
            t = t * (1 - k) + (0.1 + 0.25 * ringk) * k
    base = colorize(np.clip(t, 0, 1), palette)
    base *= (1 + tone)[..., None]
    fine = spectral_noise(size, seed + 99, beta=1.0)
    base *= (0.94 + 0.12 * fine)[..., None]
    if saw_marks:
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
        marks = 0.5 + 0.5 * np.sin(2 * np.pi * xx / size * 48 + spectral_noise(size, seed + 5, beta=3) * 6)
        base *= (0.93 + 0.07 * marks)[..., None]
    base *= (1 - gap * gap_dark)[..., None]
    height = 0.75 + 0.2 * t - gap * 0.7
    return base, height


# ───────────────────────── herringbone ─────────────────────────

def herringbone(name: str, colors: list[str], seed: int, w: int = 64, ratio: int = 4, grain_strength: float = 0.2):
    size = SIZE
    L = w * ratio
    # Réseau : H_k en (k*w, k*w), V_k en (L + k*w, w - L + k*w) ; translation t2 trouvée par recherche.
    def cover(t2):
        cnt = np.zeros((size, size), dtype=np.int16)
        idm = -np.ones((size, size), dtype=np.int32)
        orient = np.zeros((size, size), dtype=np.int8)
        pid = 0
        rng_i = range(-size // w - 4, size // w + 4)
        for a in rng_i:
            for b in range(-8, 9):
                ox = a * w + b * t2[0]
                oy = a * w + b * t2[1]
                for kind, (px, py, pw, ph) in ((0, (ox, oy, L, w)), (1, (ox + L, oy + w - L, w, L))):
                    xs = np.arange(px, px + pw) % size
                    ys = np.arange(py, py + ph) % size
                    if px + pw < -size or px > 2 * size or py + ph < -size or py > 2 * size:
                        continue
                    cnt[np.ix_(ys, xs)] += 1
                    idm[np.ix_(ys, xs)] = pid
                    orient[np.ix_(ys, xs)] = kind
                    pid += 1
        return cnt, idm, orient, pid

    t2 = (L + w, w - L)
    cnt, idm, orient, count = cover(t2)
    # Les motifs se recouvrent via le modulo : on garde la dernière pose (partition exacte vérifiée ci-dessous).
    rng = np.random.default_rng(seed)
    gh = grain_field(size, seed + 3, 7, 'x')
    gv = grain_field(size, seed + 4, 7, 'y')
    t = np.zeros((size, size))
    col = np.zeros((size, size, 3))
    palette = [rgb(c) for c in colors]
    uniq = np.unique(idm)
    for p in uniq:
        m = idm == p
        g = gh if orient[m][0] == 0 else gv
        dy, dx = rng.integers(0, size, 2)
        t[m] = np.roll(np.roll(g, dy, axis=0), dx, axis=1)[m]
        c = palette[int(rng.integers(0, len(palette)))] * rng.uniform(0.92, 1.06)
        col[m] = c
    # Joints : frontière entre identifiants différents.
    edge = np.zeros((size, size))
    for ax in (0, 1):
        edge = np.maximum(edge, (idm != np.roll(idm, 1, axis=ax)).astype(float))
    edge = np.maximum(edge, np.roll(edge, 1, axis=0) * 0.6)
    edge = np.maximum(edge, np.roll(edge, 1, axis=1) * 0.6)
    albedo = col * (1 - grain_strength + grain_strength * 2 * t)[..., None]
    albedo *= (0.95 + 0.1 * spectral_noise(size, seed + 8, beta=1.2))[..., None]
    albedo *= (1 - 0.45 * edge)[..., None]
    height = 0.8 + 0.12 * t - 0.6 * edge
    return albedo, height


# ───────────────────────── marbres & résines ─────────────────────────

def marble(size: int, seed: int, base: list[tuple[float, str]], vein_color: str, vein_freq: float, vein_sharp: float, warp_amt: float, vein_alpha: float, angle_mix=(1.0, 0.6)):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
    turb = spectral_noise(size, seed, beta=2.6)
    turb2 = spectral_noise(size, seed + 1, beta=3.0)
    phase = angle_mix[0] * xx + angle_mix[1] * yy
    v = np.abs(np.sin(np.pi * (phase * vein_freq + (turb - 0.5) * warp_amt + (turb2 - 0.5) * warp_amt * 0.5)))
    vein = np.power(1 - v, vein_sharp)
    body = colorize(spectral_noise(size, seed + 2, beta=2.4), base)
    vc = rgb(vein_color)
    return body * (1 - vein * vein_alpha)[..., None] + vc * (vein * vein_alpha)[..., None], vein


def marble_calacatta():
    size = SIZE
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
    w1 = spectral_noise(size, 22, beta=4.6)
    w2 = spectral_noise(size, 23, beta=4.6)
    fine = (spectral_noise(size, 27, beta=2.2) - 0.5) * 0.14
    body = colorize(spectral_noise(size, 24, beta=2.8), [(0, '#ebe7e0'), (0.5, '#f5f2ed'), (1, '#fcfbf8')])
    # Veines principales grises, larges et fondues.
    p1 = xx * 2 + yy * 1 + (w1 - 0.5) * 1.1 + fine
    main = np.power(1 - np.abs(np.sin(np.pi * p1)), 14)
    halo = np.power(1 - np.abs(np.sin(np.pi * p1)), 4) * 0.25
    # Veines secondaires fines.
    p2 = xx * 3 - yy * 2 + (w2 - 0.5) * 1.4 + fine * 1.5
    thin = np.power(1 - np.abs(np.sin(np.pi * p2)), 60) * smoothstep(0.3, 0.7, spectral_noise(size, 25, beta=3.0))
    grey = rgb('#7e7a74')
    albedo = body * (1 - (main * 0.75 + halo))[..., None] + grey * (main * 0.75 + halo)[..., None]
    albedo = albedo * (1 - thin * 0.6)[..., None] + grey * (thin * 0.6)[..., None]
    # Filets d'or discontinus.
    p3 = xx * 1 - yy * 2 + (w2 - 0.5) * 1.2 + fine + 0.37
    gold = np.power(1 - np.abs(np.sin(np.pi * p3)), 90) * smoothstep(0.45, 0.65, spectral_noise(size, 26, beta=3.2))
    albedo = albedo * (1 - gold * 0.9)[..., None] + rgb('#b88d3b') * (gold * 0.9)[..., None]
    height = 0.9 - 0.04 * main - 0.03 * gold
    return albedo, height


def marble_burgundy_generated():
    size = SIZE
    body, v = marble(size, 41, [(0, '#4a0b10'), (0.5, '#6e1219'), (1, '#8a1d22')], '#f1e6dc', 3, 26, 3.0, 0.85, (1.0, -0.8))
    return body, 0.9 - 0.05 * v


def marble_gold_shard():
    """Marbre blanc en éclats triangulaires, joints laiton."""
    size = SIZE
    body, v = marble(size, 51, [(0, '#e6e2dc'), (0.6, '#f2efea'), (1, '#faf8f4')], '#9a9794', 3, 12, 2.2, 0.45)
    cells = 4
    step = size / cells
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    u = (xx % step) / step
    w = (yy % step) / step
    cid = (np.floor(xx / step) + np.floor(yy / step)) % 2
    diag = np.where(cid == 0, np.abs(u - w), np.abs(u + w - 1)) / np.sqrt(2)
    edge = np.minimum.reduce([u, 1 - u, w, 1 - w])
    line = np.minimum(edge * step, diag * step)
    inlay = 1 - smoothstep(1.2, 3.2, line)
    tri = np.where(cid == 0, (u > w).astype(float), (u + w > 1).astype(float))
    tone = (0.97 + 0.05 * tri)
    albedo = body * tone[..., None]
    brass = rgb('#c19a4b') * (0.85 + 0.3 * spectral_noise(size, 52, beta=1.0))[..., None]
    albedo = albedo * (1 - inlay)[..., None] + brass * inlay[..., None]
    height = 0.9 - 0.06 * v + 0.05 * inlay
    return albedo, height


def epoxy_mint_gold():
    size = SIZE
    n1 = spectral_noise(size, 61, beta=3.2)
    n2 = spectral_noise(size, 62, beta=3.2)
    field = spectral_noise(size, 63, beta=2.6)
    swirl = warp(field, (n1 - 0.5) * 220, (n2 - 0.5) * 220)
    base = colorize(swirl, [(0, '#8fc4ae'), (0.35, '#b6dccb'), (0.6, '#d9eee4'), (1, '#f4faf6')])
    bands = np.abs(np.sin(np.pi * (swirl * 7)))
    gold = np.power(1 - bands, 9) * smoothstep(0.35, 0.55, spectral_noise(size, 64, beta=3.0))
    white = np.power(1 - np.abs(np.sin(np.pi * (swirl * 4 + 0.3))), 18) * 0.6
    albedo = base * (1 - white)[..., None] + white[..., None]
    albedo = albedo * (1 - gold)[..., None] + rgb('#c2922f') * gold[..., None]
    height = 0.9 + 0.02 * swirl
    return albedo, height


# ───────────────────────── pierres ─────────────────────────

def periodic_voronoi(size: int, n: int, seed: int, jitter=None):
    rng = np.random.default_rng(seed)
    pts = rng.uniform(0, size, (n, 2))
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    if jitter is not None:
        xx = xx + jitter[0]
        yy = yy + jitter[1]
    d1 = np.full((size, size), np.inf)
    d2 = np.full((size, size), np.inf)
    idx = np.zeros((size, size), dtype=np.int32)
    for i, (px, py) in enumerate(pts):
        dx = (xx - px + size / 2) % size - size / 2
        dy = (yy - py + size / 2) % size - size / 2
        d = np.sqrt(dx * dx + dy * dy)
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        idx = np.where(closer, i, idx)
        d1 = np.where(closer, d, d1)
    return idx, d1, d2


def flagstone():
    size = SIZE
    jx = (spectral_noise(size, 71, beta=3.0) - 0.5) * 60
    jy = (spectral_noise(size, 72, beta=3.0) - 0.5) * 60
    idx, d1, d2 = periodic_voronoi(size, 26, 73, (jx, jy))
    border = d2 - d1
    grout = 1 - smoothstep(3, 9, border)
    rng = np.random.default_rng(74)
    palette = [rgb(c) for c in ('#6f6555', '#80755f', '#5b5347', '#8a7d69', '#6a5f52', '#756b5a', '#4f4a42')]
    stone_col = np.array([palette[int(rng.integers(0, len(palette)))] * rng.uniform(0.94, 1.06) for _ in range(26)])
    col = stone_col[idx]
    tex = spectral_noise(size, 75, beta=1.6)
    strata = spectral_noise(size, 76, beta=2.8, sx=0.3, sy=1.0)
    col *= (0.86 + 0.22 * tex)[..., None] * (0.94 + 0.12 * strata)[..., None]
    grout_c = rgb('#3a3631') * (0.9 + 0.2 * tex)[..., None]
    albedo = col * (1 - grout)[..., None] + grout_c * grout[..., None]
    edge_shade = smoothstep(0, 26, border)
    albedo *= (0.86 + 0.14 * edge_shade)[..., None]
    height = 0.55 + 0.35 * edge_shade + 0.08 * tex - 0.4 * grout
    return albedo, height


def travertine():
    size = SIZE
    base = colorize(spectral_noise(size, 81, beta=2.4, sx=0.25, sy=1.0), [(0, '#cdbfa6'), (0.5, '#ddd2bd'), (1, '#e9e0cf')])
    pits_n = band_noise(size, 82, 60, 200, sx=0.35, sy=1.0)
    pits = smoothstep(0.78, 0.9, pits_n)
    bands = spectral_noise(size, 83, beta=3.0, sx=0.08, sy=1.0)
    albedo = base * (0.94 + 0.1 * bands)[..., None]
    albedo = albedo * (1 - pits * 0.35)[..., None]
    # Joints de dalles 2 × 2
    yy, xx = np.mgrid[0:size, 0:size]
    joint = ((xx % (size // 2)) < 3) | ((yy % (size // 2)) < 3)
    albedo[joint] *= 0.72
    height = 0.85 - 0.3 * pits - joint * 0.5
    return albedo, height


# ───────────────────────── plateaux de table ─────────────────────────

TABLE_WOOD_PALETTES = {
    'table-wood': [(0, '#8d5a2b'), (0.45, '#b07a44'), (0.8, '#c99559'), (1, '#d8a96c')],
    'table-walnut': [(0, '#3b2416'), (0.45, '#5a3a24'), (0.8, '#734c30'), (1, '#86603f')],
    'table-darkwood': [(0, '#221812'), (0.45, '#33241a'), (0.8, '#463324'), (1, '#58412f')],
}


def table_wood(name: str = 'table-wood', seed: int = 91):
    size = 512
    g = grain_field(size, seed, 6)
    albedo = colorize(g, TABLE_WOOD_PALETTES[name])
    albedo *= (0.95 + 0.1 * spectral_noise(size, seed + 1, beta=1.0))[..., None]
    return albedo, 0.8 + 0.2 * g


def table_linen():
    size = 512
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    period = 4
    warp_t = 0.5 + 0.5 * np.sin(2 * np.pi * xx / period)
    weft_t = 0.5 + 0.5 * np.sin(2 * np.pi * yy / period)
    over = ((np.floor(xx / period) + np.floor(yy / period)) % 2)
    weave = np.where(over == 0, warp_t, weft_t)
    slub_x = spectral_noise(size, 101, beta=2.0, sx=1.0, sy=0.02)
    slub_y = spectral_noise(size, 102, beta=2.0, sx=0.02, sy=1.0)
    tone = 0.9 + 0.06 * weave + 0.05 * (slub_x + slub_y - 1)
    albedo = rgb('#f5efe3')[None, None, :] * tone[..., None]
    return albedo, 0.6 + 0.3 * weave


# ───────────────────────── photos existantes ─────────────────────────

SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'floors')


def square_photo(src_name: str, dst_name: str, blend: float = 0.0, size: int = 1024):
    """Recadre une photo de matière au carré (plus d'étirement) ; `blend` fond les bords pour un raccord invisible."""
    im = Image.open(os.path.join(SRC, src_name)).convert('RGB')
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side)).resize((size, size), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float64) / 255.0
    if blend > 0:
        # Fondu croisé avec la version décalée d'une demi-tuile : les bords deviennent continus.
        shifted = np.roll(np.roll(a, size // 2, axis=0), size // 2, axis=1)
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
        b = blend
        wx = smoothstep(0, b, xx) * smoothstep(0, b, 1 - xx)
        wy = smoothstep(0, b, yy) * smoothstep(0, b, 1 - yy)
        m = (wx * wy)[..., None]
        a = a * m + shifted * (1 - m)
    lum = a.mean(axis=2)
    save(dst_name, a, lum, 3)


def main():
    square_photo('marble-burgundy.png', 'marble-burgundy', blend=0.18)
    square_photo('wood-amber.png', 'wood-amber', blend=0.12)
    square_photo('stone-modular-brown.png', 'stone-modular-brown')
    square_photo('cobble-granite.png', 'cobble-granite')
    square_photo('paver-pinwheel.png', 'paver-pinwheel')
    square_photo('wood-hex.png', 'wood-hex')
    square_photo('wood-marquetry.png', 'wood-marquetry')
    square_photo('wood-panel.png', 'wood-panel')
    square_photo('wood-petal.png', 'wood-petal')
    a, h = marble_calacatta(); save('marble-calacatta', a, h, 3)
    a, h = marble_gold_shard(); save('marble-gold-shard', a, h, 4)
    a, h = epoxy_mint_gold(); save('epoxy-mint-gold', a, h, 1.5)
    a, h = flagstone(); save('flagstone', a, h, 8)
    a, h = travertine(); save('travertine', a, h, 5)
    a, h = herringbone('herringbone-grey', ['#8b8d8f', '#6e7073', '#a6a7a6', '#5c5e61', '#c1c0bc'], 111); save('herringbone-grey', a, h, 6)
    a, h = herringbone('parquet-oak-herringbone', ['#b98a55', '#a87a47', '#c49762', '#9c6f3f', '#b3854f'], 161); save('parquet-oak-herringbone', a, h, 6)
    a, h = wood_planks('oak-planks', [(0, '#9b6d3e'), (0.4, '#b58450'), (0.75, '#c89a64'), (1, '#d6ad78')], 171, plank_w=128, rings=9, tone_var=0.1)
    save('oak-planks', a, h, 6)
    a, h = herringbone('herringbone-greige', ['#c3b8a6', '#b3a794', '#cfc5b4', '#a99d8a'], 121); save('herringbone-greige', a, h, 6)
    a, h = wood_planks('wood-blonde', [(0, '#b89a72'), (0.4, '#cdb38e'), (0.75, '#dcc6a4'), (1, '#e8d8bb')], 131, plank_w=128, rings=8, tone_var=0.08)
    save('wood-blonde', a, h, 6)
    a, h = wood_planks('wood-charcoal', [(0, '#2e2c2a'), (0.45, '#434039'), (0.8, '#58544c'), (1, '#6a655b')], 141, plank_w=102, rings=10, tone_var=0.14)
    save('wood-charcoal', a, h, 6)
    a, h = wood_planks('wood-rustic', [(0, '#3d2412'), (0.35, '#5a3719'), (0.7, '#744a24'), (1, '#8d5e33')], 151, plank_w=170, lengths=(1024, 512, 768), rings=6, tone_var=0.2, knots=10, gap_dark=0.6, saw_marks=True)
    save('wood-rustic', a, h, 8)
    for i, name in enumerate(TABLE_WOOD_PALETTES):
        a, h = table_wood(name, 91 + i * 10); save(name, a, h, 3)
    a, h = table_linen(); save('table-linen', a, h, 5)


if __name__ == '__main__':
    main()
