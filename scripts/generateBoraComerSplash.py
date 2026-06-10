#!/usr/bin/env python3
"""Gera splash + ícone Android a partir de dist/BoraComerlogo.png (fonte única)."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "dist" / "BoraComerlogo.png"
RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"
RESOURCES_DIR = ROOT / "resources"
SPLASH_BG = (255, 248, 242)
SPLASH_BG_HEX = "#FFF8F2"

SPLASH_SIZES: dict[str, tuple[int, int]] = {
    "drawable-port-ldpi/splash.png": (240, 320),
    "drawable-port-mdpi/splash.png": (320, 480),
    "drawable-port-hdpi/splash.png": (480, 800),
    "drawable-port-xhdpi/splash.png": (720, 1280),
    "drawable-port-xxhdpi/splash.png": (960, 1600),
    "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    "drawable-land-ldpi/splash.png": (320, 240),
    "drawable-land-mdpi/splash.png": (480, 320),
    "drawable-land-hdpi/splash.png": (800, 480),
    "drawable-land-xhdpi/splash.png": (1280, 720),
    "drawable-land-xxhdpi/splash.png": (1600, 960),
    "drawable-land-xxxhdpi/splash.png": (1920, 1280),
    "drawable/splash.png": (320, 480),
}


def to_night_path(rel_path: str) -> str | None:
    folder, _ = rel_path.split("/", 1)
    if folder.startswith("drawable-port-"):
        density = folder[len("drawable-port-") :]
        return f"drawable-port-night-{density}/splash.png"
    if folder.startswith("drawable-land-"):
        density = folder[len("drawable-land-") :]
        return f"drawable-land-night-{density}/splash.png"
    return None


def compose_splash(logo: Image.Image, width: int, height: int) -> Image.Image:
    canvas = Image.new("RGB", (width, height), SPLASH_BG)
    logo_rgba = logo.convert("RGBA")
    is_portrait = height >= width

    if is_portrait:
        max_w = int(width * 0.88)
        max_h = int(height * 0.38)
        y_ratio = 0.10
    else:
        max_w = int(width * 0.55)
        max_h = int(height * 0.72)
        y_ratio = 0.12

    fitted = logo_rgba.copy()
    fitted.thumbnail((max_w, max_h), Image.LANCZOS)
    x = (width - fitted.width) // 2
    y = int(height * y_ratio)
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def sync_resource_files() -> None:
    if not LOGO_PATH.exists():
        raise SystemExit(f"Logo não encontrada: {LOGO_PATH}")

    RESOURCES_DIR.mkdir(parents=True, exist_ok=True)
    for name in ("icon.png", "splash.png", "icon-source.png"):
        shutil.copy2(LOGO_PATH, RESOURCES_DIR / name)

    old_logo = RESOURCES_DIR / "logo.jpeg"
    if old_logo.exists():
        old_logo.unlink()


def generate_launcher_icons() -> None:
    subprocess.run(
        [
            "npx",
            "@capacitor/assets",
            "generate",
            "--assetPath",
            "resources",
            "--iconBackgroundColor",
            SPLASH_BG_HEX,
            "--iconBackgroundColorDark",
            SPLASH_BG_HEX,
            "--splashBackgroundColor",
            SPLASH_BG_HEX,
            "--splashBackgroundColorDark",
            SPLASH_BG_HEX,
            "--android",
        ],
        cwd=ROOT,
        check=True,
    )


def generate_splash_images(logo: Image.Image) -> None:
    for rel_path, size in SPLASH_SIZES.items():
        out = RES_DIR / rel_path
        out.parent.mkdir(parents=True, exist_ok=True)
        compose_splash(logo, *size).save(out, format="PNG", optimize=True)

        night_rel = to_night_path(rel_path)
        if night_rel:
            night_out = RES_DIR / night_rel
            night_out.parent.mkdir(parents=True, exist_ok=True)
            compose_splash(logo, *size).save(night_out, format="PNG", optimize=True)

    compose_splash(logo, 320, 480).save(
        RES_DIR / "drawable-night" / "splash.png", format="PNG", optimize=True
    )


def cleanup_stale_assets() -> None:
    stale = RES_DIR / "drawable-nodpi" / "splash_icon.png"
    if stale.exists():
        stale.unlink()

    launcher_bg = ROOT / "android/app/src/main/res/values/ic_launcher_background.xml"
    launcher_bg.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        f'    <color name="ic_launcher_background">{SPLASH_BG_HEX}</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )


def main() -> None:
    sync_resource_files()
    generate_launcher_icons()
    logo = Image.open(LOGO_PATH)
    generate_splash_images(logo)
    cleanup_stale_assets()
    print("Branding Android atualizado: BoraComerlogo (splash + ícone launcher)")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode) from exc
