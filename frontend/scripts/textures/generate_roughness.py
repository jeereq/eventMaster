#!/usr/bin/env python3
"""Cartes de rugosité des textures maison de public/floors/gen (`x.jpg` → `x-rough.jpg`).

Tirées de ce qui existe déjà, sans relancer les générateurs :
- la carte de normales donne le relief : les creux (joints, rainures, pores) sont plus mats ;
- la couleur donne l’usure : un point plus sombre que son voisinage (saleté des joints)
  est plus mat, un point plus clair (arête polie par le passage) brille davantage.

Tous les filtres sont périodiques : la carte boucle comme la texture.
Chaque carte est normalisée autour de ROUGH_MEAN ; le code (roomWebGLMaterials)
divise la rugosité du matériau par cette moyenne pour garder la brillance d’ensemble.

Usage : python3 scripts/textures/generate_roughness.py  (depuis frontend/)
Dépendances : numpy, pillow.
"""

from __future__ import annotations

import os
import numpy as np
from PIL import Image

GEN = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'floors', 'gen')
SIZE = 512
# Doit rester égal à GENERATED_ROUGHNESS_MEAN dans src/lib/roomWebGLMaterials.ts.
ROUGH_MEAN = 0.8
# Surfaces animées ou sans relief utile : pas de carte.
SKIP = {'water'}


def gaussian_blur(img: np.ndarray, sigma: float) -> np.ndarray:
    """Flou gaussien périodique par FFT."""
    n = img.shape[0]
    f = np.fft.fftfreq(n)
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(img) * g))


def normalized(a: np.ndarray) -> np.ndarray:
    """Centre et réduit (écart à 3 sigmas ≈ ±1)."""
    s = a.std()
    return (a - a.mean()) / (3 * s) if s > 1e-6 else np.zeros_like(a)


def roughness_for(name: str) -> np.ndarray:
    albedo = Image.open(os.path.join(GEN, f'{name}.jpg')).convert('L').resize((SIZE, SIZE), Image.BILINEAR)
    lum = np.asarray(albedo, dtype=np.float64) / 255.0
    nrm = Image.open(os.path.join(GEN, f'{name}-normal.jpg')).convert('RGB').resize((SIZE, SIZE), Image.BILINEAR)
    n = np.asarray(nrm, dtype=np.float64) / 255.0 * 2 - 1
    nx, ny = n[..., 0], n[..., 1]

    # Divergence des normales (Y vers le haut, convention three.js) : > 0 sur une bosse, < 0 dans un creux.
    div = (np.roll(nx, -1, axis=1) - np.roll(nx, 1, axis=1)) * 0.5 - (np.roll(ny, -1, axis=0) - np.roll(ny, 1, axis=0)) * 0.5
    concave = gaussian_blur(np.maximum(0.0, -div), 1.2)
    # Pente : les flancs d’un joint retiennent aussi la poussière.
    slope = gaussian_blur(1 - np.clip(n[..., 2], 0, 1), 1.0)
    # Usure : écart de luminance à la moyenne très locale (détail fin seulement, pas les aplats de couleur).
    wear = lum - gaussian_blur(lum, SIZE / 64)

    r = 0.55 * normalized(concave) + 0.25 * normalized(slope) - 0.35 * normalized(wear)
    r = gaussian_blur(r, 0.6)
    # Étalement par centiles (les joints sont rares : une moyenne seule les écraserait),
    # puis ±0.2 autour de la moyenne : faces plus brillantes, creux mats.
    lo, mid, hi = np.percentile(r, [3, 50, 97])
    t = np.where(r >= mid, (r - mid) / max(1e-6, hi - mid), (r - mid) / max(1e-6, mid - lo))
    r = np.clip(ROUGH_MEAN + 0.2 * np.clip(t, -1, 1), 0.5, 1.0)
    return r + (ROUGH_MEAN - r.mean())


def main() -> None:
    names = sorted(f[:-4] for f in os.listdir(GEN) if f.endswith('.jpg') and not f.endswith(('-normal.jpg', '-rough.jpg')))
    for name in names:
        if name in SKIP or not os.path.exists(os.path.join(GEN, f'{name}-normal.jpg')):
            continue
        r = np.clip(roughness_for(name), 0, 1)
        gray = (r * 255).round().astype(np.uint8)
        Image.fromarray(gray, 'L').save(os.path.join(GEN, f'{name}-rough.jpg'), quality=85, optimize=True)
        print(f'✓ {name}  moyenne {r.mean():.3f}  min {r.min():.2f}  max {r.max():.2f}')


if __name__ == '__main__':
    main()
