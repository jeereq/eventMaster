#!/usr/bin/env python3
"""Capture les écrans publics EventMaster pour les films."""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render import attach, capture_frame, start_chrome

SHOTS = Path(__file__).resolve().parent / "shots"
PAGES = [
    ("landing", "http://localhost:3000/", 3.5),
    ("plans", "http://localhost:3000/plans-3d", 6.5),
    ("modeles", "http://localhost:3000/modeles", 4.0),
    ("marketplace", "http://localhost:3000/marketplace", 4.0),
    ("tarifs", "http://localhost:3000/tarifs", 3.5),
    ("simulateur", "http://localhost:3000/simulateur", 3.5),
]


def grab(client, spec: tuple[str, str, float], dest: Path) -> None:
    name, url, wait = spec
    client.call("Page.navigate", url=url)
    for _ in range(40):
        state = client.evaluate("document.readyState")
        if state.get("result", {}).get("value") == "complete":
            break
        time.sleep(0.1)
    time.sleep(wait)
    client.evaluate(
        """
        document.querySelectorAll('[data-plan-fullscreen-close], .em-site-bottom-bar, #cookie, [class*=cookie]')
          .forEach((n) => { if (n && n.style) n.style.visibility = 'hidden'; });
        """
    )
    capture_frame(client, dest)
    print("shot", dest.name, dest.stat().st_size)


def main() -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    chrome = start_chrome(1920, 1080)
    try:
        client = attach()
        client.call("Page.enable")
        for spec in PAGES:
            grab(client, spec, SHOTS / f"{spec[0]}-16x9.png")
        client.close()
    finally:
        chrome.terminate()
        chrome.wait(timeout=8)

    chrome = start_chrome(1080, 1920)
    try:
        client = attach()
        client.call("Page.enable")
        for spec in PAGES:
            grab(client, spec, SHOTS / f"{spec[0]}-9x16.png")
        client.close()
    finally:
        chrome.terminate()
        chrome.wait(timeout=8)


if __name__ == "__main__":
    main()
