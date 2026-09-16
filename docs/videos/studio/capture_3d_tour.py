#!/usr/bin/env python3
"""Filme une visite 3D réelle (orbit) pour les films EventMaster."""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render import CHROME, DEBUG_PORT, ChromeCdp, attach, capture_frame, WORK

DEST = Path(__file__).resolve().parent / "captures"
LIVE = "https://eventmaster.neevo.app/plans-3d"
FRAMES = 12


def start_chrome_webgl(width: int, height: int):
    import shutil
    import subprocess
    import urllib.request

    profile = WORK / "chrome-tour"
    if profile.exists():
        shutil.rmtree(profile)
    profile.mkdir(parents=True)
    proc = subprocess.Popen(
        [
            str(CHROME),
            "--headless=new",
            "--hide-scrollbars",
            "--no-first-run",
            "--disable-extensions",
            "--use-angle=metal",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
            f"--window-size={width},{height}",
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={profile}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json/version", timeout=0.4)
            return proc
        except Exception:
            time.sleep(0.15)
    proc.kill()
    raise RuntimeError("Chrome n'a pas ouvert le port CDP")


def hide_chrome(client) -> None:
    client.evaluate(
        """
        document.querySelectorAll(
          'header, nav, footer, .em-site-bottom-bar, [class*=cookie], [role="toolbar"], [aria-label="Affichage du plan"], [aria-label="Mode d’affichage du plan"]'
        ).forEach((n) => { n.style.visibility = 'hidden'; });
        document.querySelectorAll('p, span, button, div').forEach((n) => {
          const t = (n.textContent || '').trim();
          if (t.length < 48 && /Showcase|Vitrine 3D|Glissez|Faire le tour|Réduire|Plein écran|Banquet/.test(t)) {
            n.style.visibility = 'hidden';
          }
        });
        """
    )


def open_3d(client) -> None:
    client.call("Page.navigate", url=LIVE)
    for _ in range(60):
        state = client.evaluate("document.readyState")
        if state.get("result", {}).get("value") == "complete":
            break
        time.sleep(0.12)
    time.sleep(2.2)
    client.evaluate(
        """
        const btn = [...document.querySelectorAll('button')].find((n) => /Vue 3D/.test(n.textContent || ''));
        if (btn) btn.click();
        """
    )
    time.sleep(2.4)
    client.evaluate(
        """
        const full = [...document.querySelectorAll('button')].find((n) => /Plein écran/.test(n.textContent || ''));
        if (full) full.click();
        """
    )
    time.sleep(1.2)
    client.evaluate(
        """
        const roof = [...document.querySelectorAll('button')].find((n) => /Sans toit/.test(n.textContent || ''));
        if (roof) roof.click();
        """
    )
    time.sleep(2.8)


def canvas_box(client) -> dict:
    box = client.evaluate(
        """
        (() => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return null;
          const r = canvas.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        })()
        """
    )
    value = box.get("result", {}).get("value")
    if not value:
        raise RuntimeError("canvas 3D introuvable")
    return value


def drag(client, start: tuple[float, float], end: tuple[float, float], steps: int = 8) -> None:
    sx, sy = start
    ex, ey = end
    client.call(
        "Input.dispatchMouseEvent",
        type="mousePressed",
        x=sx,
        y=sy,
        button="left",
        clickCount=1,
    )
    for i in range(1, steps + 1):
        t = i / steps
        client.call(
            "Input.dispatchMouseEvent",
            type="mouseMoved",
            x=sx + (ex - sx) * t,
            y=sy + (ey - sy) * t,
            button="left",
            buttons=1,
        )
        time.sleep(0.04)
    client.call(
        "Input.dispatchMouseEvent",
        type="mouseReleased",
        x=ex,
        y=ey,
        button="left",
        clickCount=1,
    )


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    chrome = start_chrome_webgl(1920, 1080)
    try:
        client = attach()
        open_3d(client)
        hide_chrome(client)
        for _ in range(20):
            probe = DEST / "_probe.png"
            capture_frame(client, probe)
            if probe.stat().st_size > 80000:
                probe.unlink(missing_ok=True)
                break
            time.sleep(0.45)
        time.sleep(0.3)
        info = client.evaluate(
            """
            ({
              url: location.href,
              buttons: [...document.querySelectorAll('button')].map((n) => (n.textContent || '').trim()).filter(Boolean).slice(0, 20),
              canvases: document.querySelectorAll('canvas').length,
            })
            """
        )
        print("page", info.get("result", {}).get("value"), flush=True)
        box = canvas_box(client)
        cx = box["x"] + box["w"] * 0.55
        cy = box["y"] + box["h"] * 0.42
        # Passe de la vue zénithale à une visite à hauteur d’œil.
        drag(client, (cx, cy), (cx, cy + 280), steps=14)
        time.sleep(0.5)
        drag(client, (cx, cy + 40), (cx, cy + 180), steps=10)
        time.sleep(0.6)
        for index in range(FRAMES):
            dest = DEST / f"tour3d-{index:02d}.png"
            hide_chrome(client)
            capture_frame(client, dest)
            print("frame", dest.name, dest.stat().st_size, flush=True)
            drag(client, (cx, cy), (cx - 160, cy + 18), steps=10)
            time.sleep(0.28)
        client.close()
    finally:
        chrome.terminate()
        chrome.wait(timeout=8)


if __name__ == "__main__":
    main()
