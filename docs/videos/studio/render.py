#!/usr/bin/env python3
"""Rend les films EventMaster : scènes interactives + voix + ffmpeg."""

from __future__ import annotations

import base64
import json
import shutil
import subprocess
import time
import urllib.request
import wave
from pathlib import Path

import imageio_ffmpeg
import websocket

ROOT = Path(__file__).resolve().parents[1]
STUDIO = Path(__file__).resolve().parent
BOARD = STUDIO / "board.html"
WORK = STUDIO / "_work"
OUT = ROOT
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "Thomas"
FPS = 25
CAPTURE_FPS = 12
MIN_SCENE_SECONDS = 3.4
DEBUG_PORT = 9333

VIDEOS = [
    {
        "id": "ensemble",
        "filename": "EventMaster-Ensemble-Presentation-16x9.mp4",
        "ratio": "16x9",
        "size": (1920, 1080),
        "scenes": [
            {"voice": "EventMaster. Votre événement, de A à Z. Parfaitement orchestré."},
            {"voice": "Invitations WhatsApp, plans deux D trois D, et Mobile Money. En RDC. Cent pour cent web, sans appli."},
            {"voice": "Voici le vrai plan. Table d'honneur, cent quarante places. Chacun sait où il s'assoit."},
            {"voice": "La même salle, en trois D, dans le navigateur. Lustres, scène, tables."},
            {"voice": "La billetterie s'ouvre sur le marketplace. On paie en francs congolais."},
            {"voice": "Le jour J, on scanne le pass. La table est déjà sur l'invitation."},
            {"voice": "Mariage, gala, salle ou métier. Un seul site."},
            {"voice": "Compte gratuit. Une minute. Sans carte bancaire. WhatsApp, plus deux quatre trois, huit un sept, un deux cinq, cinq sept sept."},
        ],
    },
    {
        "id": "reel",
        "filename": "EventMaster-Ensemble-Reel-9x16.mp4",
        "ratio": "9x16",
        "size": (1080, 1920),
        "scenes": [
            {"voice": "Tu prépares une fête à Kinshasa ?"},
            {"voice": "Le plan de table est déjà là."},
            {"voice": "Et en trois D. Sans plugin."},
            {"voice": "Tes invités trouvent leur table."},
            {"voice": "EventMaster. Cent pour cent web, sans appli."},
        ],
    },
    {
        "id": "familles",
        "filename": "EventMaster-Role-Familles-9x16.mp4",
        "ratio": "9x16",
        "size": (1080, 1920),
        "scenes": [
            {"voice": "Faire-part WhatsApp, plan de table, et accueil au téléphone."},
            {"voice": "Tu vois qui vient. Et qui s'assoit où."},
            {"voice": "La salle de mariage, déjà dressée, en trois D."},
            {"voice": "Essai gratuit. Sans carte bancaire. Ou Particulier cinquante, soixante mille francs le trimestre."},
        ],
    },
    {
        "id": "pro",
        "filename": "EventMaster-Role-Professionnels-16x9.mp4",
        "ratio": "16x9",
        "size": (1920, 1080),
        "scenes": [
            {"voice": "Concerts, conférences, galas. La billetterie reste dans le navigateur."},
            {"voice": "Événement public, tarifs en francs congolais, pass QR."},
            {"voice": "Business dès trente mille francs par mois. Le catalogue salle et prestations est inclus."},
        ],
    },
    {
        "id": "salles",
        "filename": "EventMaster-Role-Salles-Prestataires-9x16.mp4",
        "ratio": "9x16",
        "size": (1080, 1920),
        "scenes": [
            {"voice": "Montrez votre salle en trois D. Avant le devis."},
            {"voice": "Le client visite. Vous discutez ensuite."},
            {"voice": "Publiez votre fiche. Salle, quatorze mille neuf cents francs par mois."},
        ],
    },
    {
        "id": "invites",
        "filename": "EventMaster-Role-Invites-9x16.mp4",
        "ratio": "9x16",
        "size": (1080, 1920),
        "scenes": [
            {"voice": "Un lien. WhatsApp, SMS, ou e-mail."},
            {"voice": "Un oui. La table s'affiche quand on t'a placé."},
            {"voice": "Un QR. Pas d'appli à télécharger."},
            {"voice": "Tes invités restent dans le navigateur. EventMaster."},
        ],
    },
]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as handle:
        return handle.getnframes() / float(handle.getframerate())


def speak(text: str, dest: Path) -> float:
    aiff = dest.with_suffix(".aiff")
    raw = dest.with_name(dest.stem + "-raw.wav")
    run(["say", "-v", VOICE, "-r", "168", "-o", str(aiff), text])
    run(["afconvert", "-f", "WAVE", "-d", "LEI16", str(aiff), str(raw)])
    spoken = wav_duration(raw)
    target = max(spoken + 0.55, MIN_SCENE_SECONDS)
    run(
        [
            FFMPEG,
            "-y",
            "-i",
            str(raw),
            "-af",
            f"apad=pad_dur={target - spoken:.3f}",
            "-t",
            f"{target:.3f}",
            str(dest),
        ]
    )
    aiff.unlink(missing_ok=True)
    raw.unlink(missing_ok=True)
    return wav_duration(dest)


def concat_audio(wavs: list[Path], dest: Path) -> None:
    listing = dest.with_suffix(".txt")
    listing.write_text("".join(f"file '{path}'\n" for path in wavs), encoding="utf-8")
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(dest)])


class ChromeCdp:
    def __init__(self, ws_url: str) -> None:
        self.ws = websocket.create_connection(ws_url, suppress_origin=True)
        self.seq = 0

    def call(self, method: str, **params):
        self.seq += 1
        message_id = self.seq
        self.ws.send(json.dumps({"id": message_id, "method": method, "params": params}))
        while True:
            payload = json.loads(self.ws.recv())
            if payload.get("id") == message_id:
                if "error" in payload:
                    raise RuntimeError(f"{method}: {payload['error']}")
                return payload.get("result", {})

    def evaluate(self, expression: str, await_promise: bool = False):
        return self.call(
            "Runtime.evaluate",
            expression=expression,
            awaitPromise=await_promise,
            returnByValue=True,
        )

    def close(self) -> None:
        self.ws.close()


def start_chrome(width: int, height: int) -> subprocess.Popen:
    profile = WORK / "chrome-profile"
    if profile.exists():
        shutil.rmtree(profile)
    profile.mkdir(parents=True)
    proc = subprocess.Popen(
        [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--disable-extensions",
            f"--window-size={width},{height}",
            f"--remote-debugging-port={DEBUG_PORT}",
            f"--user-data-dir={profile}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(40):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json/version", timeout=0.4)
            return proc
        except Exception:
            time.sleep(0.15)
    proc.kill()
    raise RuntimeError("Chrome n'a pas ouvert le port CDP")


def attach() -> ChromeCdp:
    request = urllib.request.Request(
        f"http://127.0.0.1:{DEBUG_PORT}/json/new?about:blank",
        method="PUT",
    )
    try:
        urllib.request.urlopen(request, timeout=2)
    except Exception:
        pass
    tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json"))
    page = next((tab for tab in tabs if tab.get("type") == "page"), tabs[0])
    client = ChromeCdp(page["webSocketDebuggerUrl"])
    client.call("Page.enable")
    client.call("Runtime.enable")
    return client


def open_board(client: ChromeCdp, spec: dict) -> None:
    url = f"file://{BOARD}?v={spec['id']}&s=0&r={spec['ratio']}&t=0"
    client.call("Page.navigate", url=url)
    for _ in range(50):
        state = client.evaluate("document.readyState")
        if state.get("result", {}).get("value") == "complete":
            break
        time.sleep(0.08)
    client.evaluate("document.fonts.ready", await_promise=True)
    client.evaluate(
        "Promise.all([...document.images].map((img) => img.complete ? 1 : new Promise((done) => { img.onload = img.onerror = done; })))",
        await_promise=True,
    )
    time.sleep(0.25)


def capture_frame(client: ChromeCdp, dest: Path) -> None:
    result = client.call("Page.captureScreenshot", format="png", fromSurface=True)
    dest.write_bytes(base64.b64decode(result["data"]))


def render_video(client: ChromeCdp, spec: dict) -> Path:
    video_id = spec["id"]
    work = WORK / video_id
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    frames_dir = work / "frames"
    frames_dir.mkdir()

    wavs: list[Path] = []
    durations: list[float] = []
    for index, scene in enumerate(spec["scenes"]):
        wav = work / f"vo-{index:02d}.wav"
        durations.append(speak(scene["voice"], wav))
        wavs.append(wav)

    voice = work / "voice.wav"
    concat_audio(wavs, voice)
    open_board(client, spec)

    frame_index = 0
    for scene_index, duration in enumerate(durations):
        steps = max(int(round(duration * CAPTURE_FPS)), 10)
        for step in range(steps):
            progress = step / (steps - 1)
            client.evaluate(f'window.go("{video_id}", {scene_index}, {progress:.4f})')
            dest = frames_dir / f"frame-{frame_index:04d}.png"
            capture_frame(client, dest)
            frame_index += 1

    dest = OUT / spec["filename"]
    width, height = spec["size"]
    run(
        [
            FFMPEG,
            "-y",
            "-framerate",
            str(CAPTURE_FPS),
            "-i",
            str(frames_dir / "frame-%04d.png"),
            "-i",
            str(voice),
            "-vf",
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x171614,format=yuv420p",
            "-c:v",
            "libx264",
            "-r",
            str(FPS),
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(dest),
        ]
    )
    return dest


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    rendered = []
    chrome = None
    client = None
    current_size = None
    try:
        for spec in VIDEOS:
            if current_size != spec["size"]:
                if client:
                    client.close()
                if chrome:
                    chrome.terminate()
                    chrome.wait(timeout=8)
                width, height = spec["size"]
                chrome = start_chrome(width, height)
                client = attach()
                current_size = spec["size"]
            print("render", spec["id"], flush=True)
            rendered.append(render_video(client, spec))
        for path in rendered:
            print(path, path.stat().st_size)
    finally:
        if client:
            client.close()
        if chrome:
            chrome.terminate()
            chrome.wait(timeout=8)


if __name__ == "__main__":
    main()
