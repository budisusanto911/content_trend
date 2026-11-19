#!/usr/bin/env python3
"""
DzikirQu-Style Doodle Motion Video Engine
Generates clean, minimalist 9:16 Islamic/editorial motion graphic reels:
- Warm paper texture canvas + top/bottom Islamic geometric star borders
- Static editorial header (Series badge, Serif title, Speaker/Source credit)
- Multi-scene hand-drawn thick-stroke doodle illustrations with:
  * Progressive stroke-by-stroke draw-on animation
  * Organic pastel watercolor splash behind each doodle
  * Animated sparkle/motion accents (✦, ///, +)
  * Subtle hand-drawn wiggle/boil effect
- Bold condensed centered subtitles with *highlighted keywords* (accent color + pastel highlighter bar)
- Customizable footer branding
- Per-scene Edge-TTS narration + ambient BGM ducking
"""

import os
import sys
import math
import json
import random
import asyncio
import argparse
import subprocess
from pathlib import Path
from typing import List, Tuple, Dict, Any
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

try:
    import edge_tts
except ImportError:
    edge_tts = None

# =============================================================================
# 1. THEMES & FONTS
# =============================================================================

THEMES = {
    "navy_blue": {
        "name": "DzikirQu Navy Blue",
        "paper_bg": (242, 237, 224),
        "primary": (24, 43, 68),       # Deep navy ink
        "accent": (74, 119, 181),      # Medium royal blue
        "blob": (155, 192, 232),       # Soft pastel blue splash
        "highlight_bg": (213, 224, 236),
        "muted": (108, 112, 118),
    },
    "emerald_sage": {
        "name": "Emerald Sage",
        "paper_bg": (242, 239, 230),
        "primary": (28, 52, 43),
        "accent": (62, 124, 100),
        "blob": (165, 209, 190),
        "highlight_bg": (215, 232, 223),
        "muted": (105, 115, 110),
    },
    "terracotta_warm": {
        "name": "Warm Terracotta",
        "paper_bg": (245, 239, 230),
        "primary": (58, 34, 26),
        "accent": (178, 84, 56),
        "blob": (228, 168, 147),
        "highlight_bg": (240, 220, 212),
        "muted": (122, 106, 98),
    },
    "charcoal_gold": {
        "name": "Charcoal & Gold",
        "paper_bg": (244, 239, 226),
        "primary": (34, 34, 34),
        "accent": (166, 124, 55),
        "blob": (227, 206, 155),
        "highlight_bg": (239, 229, 206),
        "muted": (112, 108, 100),
    },
}

FONT_PATHS = {
    "serif_bold": [
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ],
    "condensed_bold": [
        "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
    ],
    "sans_regular": [
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    "sans_bold": [
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
}

def load_font(role: str, size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_PATHS.get(role, []):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# =============================================================================
# 2. HAND-DRAWN DOODLE VECTOR LIBRARY (Normalized 0..1 coordinates)
# =============================================================================

def _circle_pts(cx, cy, rx, ry=None, n=28, start_deg=0, end_deg=360):
    if ry is None:
        ry = rx
    pts = []
    for i in range(n + 1):
        ang = math.radians(start_deg + (end_deg - start_deg) * (i / n))
        pts.append((cx + rx * math.cos(ang), cy + ry * math.sin(ang)))
    return pts

def _arc_pts(cx, cy, rx, ry, start_deg, end_deg, n=20):
    return _circle_pts(cx, cy, rx, ry, n=n, start_deg=start_deg, end_deg=end_deg)

def get_doodle_definition(icon_name: str) -> Dict[str, Any]:
    """
    Returns:
      - strokes: list of polylines (each polyline is list of (x, y) in 0..1 space)
      - blob_centers: list of (cx, cy, r) for organic pastel watercolor splash
      - accents: list of ('star'|'lines'|'plus'|'swirl', x, y, scale)
    """
    doodles = {
        "mimbar": {
            "blob_centers": [(0.62, 0.62, 0.22), (0.72, 0.72, 0.16), (0.48, 0.74, 0.14)],
            "strokes": [
                # Base line
                [(0.12, 0.80), (0.86, 0.79)],
                # Outer left stairs & wall
                [(0.18, 0.80), (0.18, 0.56), (0.42, 0.36), (0.42, 0.33), (0.82, 0.33), (0.82, 0.79)],
                # Top ledge bar
                [(0.40, 0.33), (0.84, 0.32), (0.84, 0.37), (0.40, 0.38), (0.40, 0.33)],
                # Steps
                [(0.22, 0.79), (0.22, 0.70), (0.42, 0.70), (0.42, 0.79)],
                [(0.32, 0.70), (0.32, 0.61), (0.52, 0.61), (0.52, 0.79)],
                [(0.42, 0.61), (0.42, 0.53), (0.60, 0.53), (0.60, 0.79)],
                # Arch panel on right side of mimbar
                [(0.66, 0.79), (0.66, 0.48), (0.72, 0.41), (0.78, 0.48), (0.78, 0.79)],
                # Small arch behind steps
                [(0.48, 0.53), (0.48, 0.45), (0.54, 0.40), (0.60, 0.45), (0.60, 0.53)],
                # Dome behind mimbar
                [(0.34, 0.42), (0.34, 0.26), (0.38, 0.18), (0.48, 0.11), (0.58, 0.18), (0.62, 0.26), (0.62, 0.33)],
                [(0.40, 0.36), (0.40, 0.27), (0.43, 0.22), (0.48, 0.18), (0.53, 0.22), (0.56, 0.27), (0.56, 0.33)],
                # Microphone
                [(0.74, 0.32), (0.74, 0.23), (0.69, 0.20)],
                _circle_pts(0.67, 0.20, 0.035, 0.035, 14),
            ],
            "accents": [("lines", 0.20, 0.20, 1.0), ("star", 0.82, 0.14, 1.0)],
        },
        "scrolls": {
            "blob_centers": [(0.34, 0.65, 0.18), (0.78, 0.60, 0.20), (0.65, 0.70, 0.15)],
            "strokes": [
                # Left scroll
                [(0.10, 0.32), (0.10, 0.70)],
                [(0.16, 0.32), (0.16, 0.70)],
                _circle_pts(0.13, 0.30, 0.045, 0.025, 12),
                _circle_pts(0.13, 0.71, 0.045, 0.025, 12),
                [(0.13, 0.24), (0.13, 0.28)],
                [(0.13, 0.73), (0.13, 0.78)],
                [(0.16, 0.34), (0.28, 0.31), (0.38, 0.35)],
                [(0.16, 0.67), (0.28, 0.64), (0.38, 0.68)],
                [(0.38, 0.32), (0.38, 0.70)],
                [(0.44, 0.32), (0.44, 0.70)],
                _circle_pts(0.41, 0.30, 0.045, 0.025, 12),
                _circle_pts(0.41, 0.71, 0.045, 0.025, 12),
                [(0.41, 0.24), (0.41, 0.28)],
                [(0.41, 0.73), (0.41, 0.78)],
                # Right scroll
                [(0.56, 0.32), (0.56, 0.70)],
                [(0.62, 0.32), (0.62, 0.70)],
                _circle_pts(0.59, 0.30, 0.045, 0.025, 12),
                _circle_pts(0.59, 0.71, 0.045, 0.025, 12),
                [(0.59, 0.24), (0.59, 0.28)],
                [(0.59, 0.73), (0.59, 0.78)],
                [(0.62, 0.34), (0.74, 0.31), (0.84, 0.35)],
                [(0.62, 0.67), (0.74, 0.64), (0.84, 0.68)],
                [(0.84, 0.32), (0.84, 0.70)],
                [(0.90, 0.32), (0.90, 0.70)],
                _circle_pts(0.87, 0.30, 0.045, 0.025, 12),
                _circle_pts(0.87, 0.71, 0.045, 0.025, 12),
                [(0.87, 0.24), (0.87, 0.28)],
                [(0.87, 0.73), (0.87, 0.78)],
            ],
            "accents": [("lines", 0.44, 0.14, 1.0), ("plus", 0.22, 0.84, 1.0), ("star", 0.76, 0.84, 1.1)],
        },
        "speech": {
            "blob_centers": [(0.68, 0.62, 0.22), (0.54, 0.72, 0.16), (0.76, 0.48, 0.14)],
            "strokes": [
                # Speech bubble main oval with tail
                _arc_pts(0.50, 0.46, 0.32, 0.25, -200, 125, 36) + [(0.24, 0.76), (0.28, 0.62)],
            ],
            "accents": [("star", 0.18, 0.24, 1.1), ("lines", 0.80, 0.18, 1.1), ("plus", 0.80, 0.76, 1.0)],
        },
        "stairs": {
            "blob_centers": [(0.55, 0.68, 0.22), (0.74, 0.74, 0.17), (0.44, 0.56, 0.15)],
            "strokes": [
                # 3D stepped staircase
                [(0.20, 0.76), (0.20, 0.34), (0.38, 0.34), (0.38, 0.50), (0.58, 0.50), (0.58, 0.64), (0.78, 0.64), (0.78, 0.76), (0.20, 0.76)],
                # 3D top surfaces
                [(0.20, 0.34), (0.34, 0.29), (0.50, 0.29), (0.38, 0.34)],
                [(0.50, 0.29), (0.50, 0.45), (0.38, 0.50)],
                [(0.50, 0.45), (0.68, 0.45), (0.58, 0.50)],
                [(0.68, 0.45), (0.68, 0.59), (0.58, 0.64)],
                [(0.68, 0.59), (0.84, 0.59), (0.78, 0.64)],
                [(0.84, 0.59), (0.84, 0.71), (0.78, 0.76)],
                # Curved downward arrow
                _arc_pts(0.46, 0.44, 0.28, 0.24, -85, -10, 18),
                [(0.67, 0.36), (0.74, 0.41), (0.77, 0.32)],
            ],
            "accents": [("lines", 0.22, 0.18, 1.0), ("plus", 0.14, 0.76, 1.0)],
        },
        "tasbih": {
            "blob_centers": [(0.58, 0.58, 0.24), (0.45, 0.66, 0.17), (0.68, 0.70, 0.16)],
            "strokes": [
                # Loop of 16 beads arranged in an organic tilted oval
                *[
                    _circle_pts(
                        0.46 + 0.25 * math.cos(math.radians(a)) * math.cos(0.35) - 0.19 * math.sin(math.radians(a)) * math.sin(0.35),
                        0.44 + 0.25 * math.cos(math.radians(a)) * math.sin(0.35) + 0.19 * math.sin(math.radians(a)) * math.cos(0.35),
                        0.044, 0.044, 12
                    )
                    for a in range(0, 360, 24)
                ],
                # Imam bead (connector)
                _circle_pts(0.64, 0.62, 0.046, 0.046, 12),
                # Tassel strands
                [(0.65, 0.67), (0.62, 0.85)],
                [(0.66, 0.67), (0.68, 0.87)],
                [(0.67, 0.67), (0.74, 0.84)],
                [(0.68, 0.66), (0.79, 0.80)],
            ],
            "accents": [("star", 0.22, 0.20, 1.1), ("lines", 0.78, 0.18, 1.0), ("swirl", 0.22, 0.76, 1.0)],
        },
        "mosque": {
            "blob_centers": [(0.58, 0.60, 0.24), (0.42, 0.66, 0.16)],
            "strokes": [
                [(0.12, 0.80), (0.88, 0.80)],
                # Main dome
                [(0.28, 0.52), (0.28, 0.42), (0.36, 0.28), (0.50, 0.18), (0.64, 0.28), (0.72, 0.42), (0.72, 0.52)],
                [(0.50, 0.18), (0.50, 0.11)],
                _arc_pts(0.50, 0.09, 0.03, 0.03, 40, 310, 10),
                # Base building
                [(0.24, 0.52), (0.76, 0.52), (0.76, 0.80)],
                [(0.24, 0.52), (0.24, 0.80)],
                # Door arch
                [(0.42, 0.80), (0.42, 0.64), (0.50, 0.57), (0.58, 0.64), (0.58, 0.80)],
                # Left & right minarets
                [(0.15, 0.80), (0.15, 0.36), (0.19, 0.28), (0.23, 0.36), (0.23, 0.80)],
                [(0.77, 0.80), (0.77, 0.36), (0.81, 0.28), (0.85, 0.36), (0.85, 0.80)],
            ],
            "accents": [("star", 0.24, 0.16, 1.0), ("lines", 0.78, 0.16, 1.0)],
        },
        "heart": {
            "blob_centers": [(0.58, 0.58, 0.23), (0.44, 0.64, 0.17)],
            "strokes": [
                # Classic hand-drawn heart
                [(0.50, 0.34), (0.42, 0.24), (0.28, 0.24), (0.20, 0.36), (0.22, 0.52), (0.36, 0.68), (0.50, 0.80),
                 (0.64, 0.68), (0.78, 0.52), (0.80, 0.36), (0.72, 0.24), (0.58, 0.24), (0.50, 0.34)],
                # Inner shine arc
                [(0.30, 0.36), (0.28, 0.44), (0.31, 0.51)],
            ],
            "accents": [("star", 0.20, 0.20, 1.0), ("lines", 0.82, 0.20, 1.0), ("plus", 0.78, 0.74, 1.0)],
        },
        "crescent": {
            "blob_centers": [(0.54, 0.56, 0.24), (0.66, 0.66, 0.16)],
            "strokes": [
                _arc_pts(0.48, 0.50, 0.30, 0.30, 35, 315, 30)
                + list(reversed(_arc_pts(0.58, 0.46, 0.24, 0.24, 55, 295, 24))),
                # Big companion star
                [(0.68, 0.28), (0.71, 0.36), (0.79, 0.39), (0.71, 0.42), (0.68, 0.50), (0.65, 0.42), (0.57, 0.39), (0.65, 0.36), (0.68, 0.28)],
            ],
            "accents": [("plus", 0.24, 0.22, 1.0), ("lines", 0.78, 0.68, 1.0), ("swirl", 0.24, 0.78, 1.0)],
        },
        "book": {
            "blob_centers": [(0.60, 0.60, 0.24), (0.42, 0.65, 0.18)],
            "strokes": [
                # Open book left & right pages
                [(0.50, 0.32), (0.34, 0.27), (0.16, 0.32), (0.16, 0.68), (0.34, 0.64), (0.50, 0.70)],
                [(0.50, 0.32), (0.66, 0.27), (0.84, 0.32), (0.84, 0.68), (0.66, 0.64), (0.50, 0.70)],
                [(0.50, 0.32), (0.50, 0.70)],
                # Page lines
                [(0.24, 0.42), (0.42, 0.40)],
                [(0.24, 0.52), (0.42, 0.50)],
                [(0.58, 0.40), (0.76, 0.42)],
                [(0.58, 0.50), (0.76, 0.52)],
                # Rehal (book stand) X-legs
                [(0.26, 0.72), (0.50, 0.78), (0.74, 0.72)],
                [(0.34, 0.74), (0.28, 0.85)],
                [(0.66, 0.74), (0.72, 0.85)],
            ],
            "accents": [("lines", 0.50, 0.14, 1.0), ("star", 0.18, 0.18, 1.0), ("plus", 0.82, 0.78, 1.0)],
        },
        "hands": {
            "blob_centers": [(0.56, 0.60, 0.24), (0.44, 0.66, 0.18)],
            "strokes": [
                # Left open palm raising in dua
                [(0.20, 0.68), (0.18, 0.46), (0.26, 0.36), (0.38, 0.38), (0.47, 0.50), (0.47, 0.72), (0.20, 0.68)],
                [(0.26, 0.38), (0.30, 0.54)],
                [(0.34, 0.39), (0.37, 0.55)],
                # Right open palm raising in dua
                [(0.80, 0.68), (0.82, 0.46), (0.74, 0.36), (0.62, 0.38), (0.53, 0.50), (0.53, 0.72), (0.80, 0.68)],
                [(0.74, 0.38), (0.70, 0.54)],
                [(0.66, 0.39), (0.63, 0.55)],
                # Subtle radiating light above hands
                [(0.50, 0.28), (0.50, 0.18)],
                [(0.38, 0.30), (0.33, 0.22)],
                [(0.62, 0.30), (0.67, 0.22)],
            ],
            "accents": [("star", 0.20, 0.22, 1.0), ("star", 0.80, 0.22, 0.9), ("plus", 0.78, 0.80, 1.0)],
        },
        "clock": {
            "blob_centers": [(0.58, 0.58, 0.24), (0.45, 0.66, 0.17)],
            "strokes": [
                _circle_pts(0.50, 0.52, 0.30, 0.30, 36),
                [(0.50, 0.28), (0.50, 0.32)],
                [(0.50, 0.72), (0.50, 0.76)],
                [(0.26, 0.52), (0.30, 0.52)],
                [(0.70, 0.52), (0.74, 0.52)],
                # Clock hands
                [(0.50, 0.52), (0.50, 0.35)],
                [(0.50, 0.52), (0.64, 0.58)],
                _circle_pts(0.50, 0.52, 0.03, 0.03, 10),
            ],
            "accents": [("lines", 0.78, 0.18, 1.0), ("star", 0.20, 0.22, 1.0), ("plus", 0.80, 0.76, 1.0)],
        },
    }
    return doodles.get(icon_name, doodles["mimbar"])

AVAILABLE_ICONS = ["mimbar", "scrolls", "speech", "stairs", "tasbih", "mosque", "heart", "crescent", "book", "hands", "clock"]

# =============================================================================
# 3. STATIC TEMPLATE RENDERING (Paper + Geometric Borders + Header + Footer)
# =============================================================================

def draw_islamic_border_strip(draw: ImageDraw.ImageDraw, width: int, y_top: int, height: int, primary: tuple, accent: tuple, bg: tuple):
    """
    Draws an authentic repeating 8-pointed Islamic star & diamond lattice border strip.
    """
    # Subtle soft band background
    draw.rectangle([(0, y_top), (width, y_top + height)], fill=bg)
    
    tile_w = 72
    cy = y_top + height // 2
    r_outer = height * 0.38
    r_inner = height * 0.19
    
    # Interlocking diamond lattice lines
    num_tiles = (width // tile_w) + 2
    for i in range(-1, num_tiles):
        cx = i * tile_w + tile_w // 2
        
        # Faint connecting diamond grid
        draw.line([(cx - tile_w // 2, cy), (cx, y_top + 6)], fill=accent, width=2)
        draw.line([(cx, y_top + 6), (cx + tile_w // 2, cy)], fill=accent, width=2)
        draw.line([(cx - tile_w // 2, cy), (cx, y_top + height - 6)], fill=accent, width=2)
        draw.line([(cx, y_top + height - 6), (cx + tile_w // 2, cy)], fill=accent, width=2)
        
        # 8-pointed star (Rub el Hizb: two rotated squares)
        star_pts = []
        for k in range(16):
            ang = math.radians(k * 22.5)
            rad = r_outer if k % 2 == 0 else r_inner
            star_pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
        draw.polygon(star_pts, outline=primary, fill=None)
        draw.line(star_pts + [star_pts[0]], fill=primary, width=2)
        
        # Inner accent dot
        dot_r = 4
        draw.ellipse([(cx - dot_r, cy - dot_r), (cx + dot_r, cy + dot_r)], fill=accent)

BG_TEXTURE_MAP = {
    "cream_paper": "assets/retro/textures/cream_paper.png",
    "kraft_paper": "assets/retro/textures/kraft_paper.png",
    "parchment_paper": "assets/retro/textures/parchment_paper.png",
}

def create_background_canvas(
    width: int,
    height: int,
    theme: Dict[str, Any],
    bg_style: str = "classic_cream",
    bg_image: str = "",
) -> Image.Image:
    """
    Creates the 1080x1920 background canvas supporting built-in paper/notebook/gradient styles
    or a user-uploaded custom background image.
    """
    bg = theme["paper_bg"]

    # 1. Custom uploaded image
    if bg_image and os.path.exists(bg_image):
        custom = Image.open(bg_image).convert("RGB")
        custom = ImageOps.fit(custom, (width, height), Image.Resampling.LANCZOS)
        # Apply gentle warm paper veil (35%) so dark doodle strokes & text stay crisp and legible
        veil = Image.new("RGB", (width, height), bg)
        return Image.blend(custom, veil, alpha=0.32)

    # 2. Pre-generated HD paper textures
    if bg_style in BG_TEXTURE_MAP and os.path.exists(BG_TEXTURE_MAP[bg_style]):
        tex = Image.open(BG_TEXTURE_MAP[bg_style]).convert("RGB")
        return tex.resize((width, height), Image.Resampling.LANCZOS)

    # 3. Soft pastel gradient (top paper_bg -> bottom gentle accent tint)
    if bg_style == "soft_gradient":
        img = Image.new("RGB", (width, height), bg)
        draw = ImageDraw.Draw(img)
        r1, g1, b1 = bg
        br, bg_c, bb = theme["blob"]
        r2 = int(r1 * 0.78 + br * 0.22)
        g2 = int(g1 * 0.78 + bg_c * 0.22)
        b2 = int(b1 * 0.78 + bb * 0.22)
        for y in range(height):
            t = y / max(1, height - 1)
            cr = int(r1 + (r2 - r1) * t)
            cg = int(g1 + (g2 - g1) * t)
            cb = int(b1 + (b2 - b1) * t)
            draw.line([(0, y), (width, y)], fill=(cr, cg, cb))
        return img

    # 4. Base warm paper with subtle organic grain
    img = Image.new("RGB", (width, height), bg)
    rng = random.Random(42)
    grain = Image.new("L", (width // 2, height // 2))
    grain.putdata([rng.randint(122, 134) for _ in range((width // 2) * (height // 2))])
    grain = grain.resize((width, height), Image.Resampling.BILINEAR)

    px = img.load()
    gpx = grain.load()
    br, bg_c, bb = bg
    for y in range(height):
        for x in range(width):
            d = gpx[x, y] - 128
            px[x, y] = (
                max(0, min(255, br + d)),
                max(0, min(255, bg_c + d)),
                max(0, min(255, bb + d)),
            )

    draw = ImageDraw.Draw(img)
    grid_color = (
        max(0, br - 26),
        max(0, bg_c - 26),
        max(0, bb - 24),
    )

    # 5. Dotted notebook grid overlay
    if bg_style == "dot_grid":
        spacing = 48
        for y in range(110, height - 110, spacing):
            for x in range(36, width - 36, spacing):
                draw.ellipse([(x - 2, y - 2), (x + 2, y + 2)], fill=grid_color)
    # 6. Vintage lined stationery overlay
    elif bg_style == "lined_notebook":
        spacing = 64
        for y in range(130, height - 120, spacing):
            draw.line([(48, y), (width - 48, y)], fill=grid_color, width=2)

    return img

def build_static_canvas(
    width: int,
    height: int,
    theme: Dict[str, Any],
    series_tag: str,
    title: str,
    speaker: str,
    footer_brand: str,
    bg_style: str = "classic_cream",
    bg_image: str = "",
) -> Image.Image:
    """
    Creates the static editorial template frame (customizable background + top/bottom Islamic borders + header + footer).
    Cached once per video so rendering is blazing fast.
    """
    bg = theme["paper_bg"]
    img = create_background_canvas(width, height, theme, bg_style=bg_style, bg_image=bg_image)

    draw = ImageDraw.Draw(img)
    primary = theme["primary"]
    accent = theme["accent"]
    muted = theme["muted"]

    # 2. Top & Bottom Islamic geometric pattern borders
    border_h = 74
    draw_islamic_border_strip(draw, width, 6, border_h, primary, accent, bg)
    draw.line([(0, border_h + 14), (width, border_h + 14)], fill=accent, width=4)

    bot_y = height - border_h - 6
    draw.line([(0, bot_y - 10), (width, bot_y - 10)], fill=accent, width=4)
    draw_islamic_border_strip(draw, width, bot_y, border_h, primary, accent, bg)

    # 3. Header: Series Tag (uppercase with letter spacing)
    y_cursor = 136
    if series_tag:
        f_tag = load_font("sans_bold", 25)
        tracked = "  ".join(list(series_tag.upper()))
        bbox = draw.textbbox((0, 0), tracked, font=f_tag)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y_cursor), tracked, font=f_tag, fill=accent)
        y_cursor += 46

    # 4. Header: Main Editorial Serif Title (balanced wrap)
    if title:
        f_title = load_font("serif_bold", 60)
        title_lines = _wrap_plain_text(draw, title, f_title, max_width=520)
        for line in title_lines[:3]:
            bbox = draw.textbbox((0, 0), line, font=f_title)
            tw = bbox[2] - bbox[0]
            draw.text(((width - tw) // 2, y_cursor), line, font=f_title, fill=primary)
            y_cursor += 70
        y_cursor += 12

    # 5. Header: Speaker / Source Credit
    if speaker:
        f_speaker = load_font("sans_regular", 27)
        bbox = draw.textbbox((0, 0), speaker, font=f_speaker)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y_cursor), speaker, font=f_speaker, fill=muted)

    # 6. Footer Branding
    if footer_brand:
        f_foot = load_font("serif_bold", 38)
        f_foot_sub = load_font("sans_bold", 26)
        parts = [p.strip() for p in footer_brand.split("|")]
        foot_y = height - 178
        if len(parts) == 2:
            b1 = draw.textbbox((0, 0), parts[0], font=f_foot)
            b2 = draw.textbbox((0, 0), parts[1], font=f_foot_sub)
            w1, w2 = b1[2] - b1[0], b2[2] - b2[0]
            gap = 42
            total_w = w1 + gap + w2
            sx = (width - total_w) // 2
            draw.text((sx, foot_y), parts[0], font=f_foot, fill=primary)
            # Divider line
            div_x = sx + w1 + gap // 2
            draw.line([(div_x, foot_y + 4), (div_x, foot_y + 46)], fill=(200, 198, 192), width=2)
            draw.text((sx + w1 + gap, foot_y + 10), parts[1], font=f_foot_sub, fill=primary)
        else:
            b1 = draw.textbbox((0, 0), footer_brand, font=f_foot)
            tw = b1[2] - b1[0]
            draw.text(((width - tw) // 2, foot_y), footer_brand, font=f_foot, fill=primary)

    return img

# =============================================================================
# 4. ANIMATED DOODLE & HIGHLIGHTED SUBTITLE RENDERERS
# =============================================================================

def _wrap_plain_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
    words = text.split()
    lines, cur = [], []
    for w in words:
        test = " ".join(cur + [w])
        if draw.textbbox((0, 0), test, font=font)[2] <= max_width or not cur:
            cur.append(w)
        else:
            lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    return lines

def _parse_highlighted_tokens(text: str) -> List[Tuple[str, bool]]:
    """
    Parses text with *highlighted phrase* into list of (word, is_highlighted).
    """
    tokens: List[Tuple[str, bool]] = []
    parts = text.split("*")
    for idx, part in enumerate(parts):
        is_hl = (idx % 2 == 1)
        for word in part.split():
            if word:
                tokens.append((word, is_hl))
    return tokens

def _draw_thick_polyline(draw: ImageDraw.ImageDraw, pts: List[Tuple[float, float]], color: tuple, width: int):
    if len(pts) < 2:
        if len(pts) == 1:
            r = width / 2
            x, y = pts[0]
            draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color)
        return
    draw.line(pts, fill=color, width=width, joint="curve")
    r = width / 2
    for (x, y) in pts:
        draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color)

def _draw_accent(draw: ImageDraw.ImageDraw, kind: str, cx: float, cy: float, size: float, color: tuple, stroke_w: int):
    if kind == "star":
        pts = [
            (cx, cy - size),
            (cx + size * 0.30, cy - size * 0.30),
            (cx + size, cy),
            (cx + size * 0.30, cy + size * 0.30),
            (cx, cy + size),
            (cx - size * 0.30, cy + size * 0.30),
            (cx - size, cy),
            (cx - size * 0.30, cy - size * 0.30),
            (cx, cy - size),
        ]
        _draw_thick_polyline(draw, pts, color, max(6, stroke_w - 4))
    elif kind == "plus":
        _draw_thick_polyline(draw, [(cx - size * 0.65, cy), (cx + size * 0.65, cy)], color, max(7, stroke_w - 3))
        _draw_thick_polyline(draw, [(cx, cy - size * 0.65), (cx, cy + size * 0.65)], color, max(7, stroke_w - 3))
    elif kind == "lines":
        angles = (-155, -125, -95) if cx < 540 else (-75, -45, -15)
        for ang_deg in angles:
            a = math.radians(ang_deg)
            p1 = (cx + size * 0.72 * math.cos(a), cy + size * 0.72 * math.sin(a))
            p2 = (cx + size * 1.45 * math.cos(a), cy + size * 1.45 * math.sin(a))
            _draw_thick_polyline(draw, [p1, p2], color, max(7, stroke_w - 3))
    elif kind == "swirl":
        pts = []
        for i in range(18):
            t = i / 17.0
            ang = t * 3.2 * math.pi
            rad = size * 0.18 + t * size * 0.48
            pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
        _draw_thick_polyline(draw, pts, color, max(6, stroke_w - 4))

def render_doodle_on_frame(
    frame: Image.Image,
    icon_name: str,
    theme: Dict[str, Any],
    progress: float,
    boil_seed: int,
    box_x: int = 190,
    box_y: int = 400,
    box_size: int = 700,
):
    """
    Draws the hand-drawn doodle with:
    - Organic pastel watercolor blob (fades/grows in smoothly)
    - Progressive stroke-by-stroke draw-on animation (progress: 0.0 -> 1.0)
    - Subtle hand-drawn boil/wiggle (boil_seed changes ~3 times/sec)
    """
    doodle = get_doodle_definition(icon_name)
    rng = random.Random(boil_seed)

    # 1. Organic pastel watercolor blob behind icon
    blob_alpha = min(1.0, max(0.0, (progress - 0.15) / 0.55))
    if blob_alpha > 0.01:
        blob_layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        bdraw = ImageDraw.Draw(blob_layer)
        br, bg_c, bb = theme["blob"]
        alpha_val = int(175 * blob_alpha)
        for (bcx, bcy, brad) in doodle["blob_centers"]:
            cx = box_x + bcx * box_size
            cy = box_y + bcy * box_size
            r = brad * box_size * (0.85 + 0.15 * blob_alpha)
            # Draw organic wobbly polygon blob
            pts = []
            for k in range(18):
                ang = math.radians(k * 20)
                wobble = 1.0 + 0.12 * math.sin(ang * 3 + bcx * 10) + 0.06 * math.cos(ang * 5)
                pts.append((cx + r * wobble * math.cos(ang), cy + r * wobble * math.sin(ang)))
            bdraw.polygon(pts, fill=(br, bg_c, bb, alpha_val))
        blob_layer = blob_layer.filter(ImageFilter.GaussianBlur(radius=3))
        frame.paste(blob_layer, (0, 0), blob_layer)

    # 2. Progressive stroke-by-stroke hand-drawn lines
    draw = ImageDraw.Draw(frame)
    primary = theme["primary"]
    stroke_w = 15

    # Calculate total stroke length across all polylines
    scaled_strokes = []
    stroke_lengths = []
    total_len = 0.0
    for poly in doodle["strokes"]:
        spts = [
            (
                box_x + x * box_size + rng.uniform(-1.6, 1.6),
                box_y + y * box_size + rng.uniform(-1.6, 1.6),
            )
            for (x, y) in poly
        ]
        slen = 0.0
        for i in range(len(spts) - 1):
            slen += math.hypot(spts[i + 1][0] - spts[i][0], spts[i + 1][1] - spts[i][1])
        scaled_strokes.append(spts)
        stroke_lengths.append(slen)
        total_len += slen

    target_len = total_len * min(1.0, max(0.0, progress))
    drawn_so_far = 0.0

    for spts, slen in zip(scaled_strokes, stroke_lengths):
        if drawn_so_far >= target_len:
            break
        if drawn_so_far + slen <= target_len:
            _draw_thick_polyline(draw, spts, primary, stroke_w)
            drawn_so_far += slen
        else:
            # Partial stroke interpolation
            rem = target_len - drawn_so_far
            partial = [spts[0]]
            for i in range(len(spts) - 1):
                seg = math.hypot(spts[i + 1][0] - spts[i][0], spts[i + 1][1] - spts[i][1])
                if seg <= 0.001:
                    continue
                if rem >= seg:
                    partial.append(spts[i + 1])
                    rem -= seg
                else:
                    ratio = rem / seg
                    ix = spts[i][0] + (spts[i + 1][0] - spts[i][0]) * ratio
                    iy = spts[i][1] + (spts[i + 1][1] - spts[i][1]) * ratio
                    partial.append((ix, iy))
                    break
            _draw_thick_polyline(draw, partial, primary, stroke_w)
            break

    # 3. Doodle Accents pop in once strokes are mostly drawn
    if progress >= 0.72:
        acc_scale = min(1.0, (progress - 0.72) / 0.28)
        for (kind, ax, ay, sc) in doodle["accents"]:
            cx = box_x + ax * box_size + rng.uniform(-1.2, 1.2)
            cy = box_y + ay * box_size + rng.uniform(-1.2, 1.2)
            _draw_accent(draw, kind, cx, cy, 34 * sc * acc_scale, primary, stroke_w)

def render_highlighted_subtitle(
    frame: Image.Image,
    text: str,
    theme: Dict[str, Any],
    hl_progress: float = 1.0,
    center_y: int = 1340,
    max_width: int = 860,
):
    """
    Draws bold condensed centered subtitle with *highlighted keywords* rendered in accent color
    over a soft pastel rectangular highlighter bar.
    """
    draw = ImageDraw.Draw(frame)
    font = load_font("condensed_bold", 76)
    tokens = _parse_highlighted_tokens(text)
    if not tokens:
        return

    space_w = draw.textbbox((0, 0), " ", font=font)[2]
    lines: List[List[Tuple[str, bool, int]]] = []
    cur_line: List[Tuple[str, bool, int]] = []
    cur_w = 0

    for word, is_hl in tokens:
        ww = draw.textbbox((0, 0), word, font=font)[2]
        add_w = ww if not cur_line else space_w + ww
        if cur_w + add_w <= max_width or not cur_line:
            cur_line.append((word, is_hl, ww))
            cur_w += add_w
        else:
            lines.append(cur_line)
            cur_line = [(word, is_hl, ww)]
            cur_w = ww
    if cur_line:
        lines.append(cur_line)

    line_h = 94
    total_h = len(lines) * line_h
    start_y = center_y - total_h // 2

    primary = theme["primary"]
    accent = theme["accent"]
    hl_bg = theme["highlight_bg"]

    for li, line_tokens in enumerate(lines):
        y = start_y + li * line_h
        total_w = sum(t[2] for t in line_tokens) + space_w * max(0, len(line_tokens) - 1)
        x = (frame.width - total_w) // 2

        # First pass: draw pastel highlight bars behind contiguous highlighted spans
        if hl_progress > 0.05:
            cx = x
            i = 0
            while i < len(line_tokens):
                word, is_hl, ww = line_tokens[i]
                if is_hl:
                    span_x1 = cx - 10
                    span_x2 = cx + ww
                    j = i + 1
                    while j < len(line_tokens) and line_tokens[j][1]:
                        span_x2 += space_w + line_tokens[j][2]
                        j += 1
                    span_x2 += 10
                    anim_x2 = span_x1 + (span_x2 - span_x1) * min(1.0, hl_progress)
                    draw.rectangle(
                        [(span_x1, y + 18), (anim_x2, y + 84)],
                        fill=hl_bg,
                    )
                    for k in range(i, j):
                        cx += line_tokens[k][2] + space_w
                    i = j
                else:
                    cx += ww + space_w
                    i += 1

        # Second pass: draw text cleanly on top
        cx = x
        for word, is_hl, ww in line_tokens:
            color = accent if (is_hl and hl_progress > 0.25) else primary
            draw.text((cx, y), word, font=font, fill=color)
            cx += ww + space_w

# =============================================================================
# 5. AUDIO (PER-SCENE EDGE-TTS + AMBIENT BGM) & VIDEO ASSEMBLY
# =============================================================================

async def generate_scene_audio(text: str, voice: str, output_path: str) -> float:
    """
    Generates clean narration audio for a scene using Edge-TTS, with offline fallback.
    Returns exact audio duration in seconds.
    """
    clean_text = text.replace("*", "").strip()
    if edge_tts and clean_text:
        try:
            comm = edge_tts.Communicate(clean_text, voice, rate="-4%")
            await comm.save(output_path)
            res = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", output_path],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if res.stdout.strip():
                dur = float(res.stdout.strip())
                return max(2.2, dur)
        except Exception as e:
            print(f"[WARN] Edge-TTS failed ({e}), using offline timing fallback.")

    words = max(3, len(clean_text.split()))
    dur = max(3.0, min(8.0, words * 0.42))
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
         "-t", f"{dur:.2f}", "-c:a", "libmp3lame", "-b:a", "128k", output_path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    return dur

async def render_doodle_reel(
    series_tag: str,
    title: str,
    speaker: str,
    footer_brand: str,
    scenes: List[Dict[str, str]],
    theme_id: str = "navy_blue",
    bg_style: str = "classic_cream",
    bg_image: str = "",
    voice: str = "id-ID-ArdiNeural",
    output_mp4: str = "content-trend-intelligence/public/clips/retro_dzikirqu_demo.mp4",
    bgm_path: str = "assets/bgm/chill_ambient.mp3",
    fps: int = 24,
) -> str:
    """
    End-to-end multi-scene DzikirQu Doodle Motion Reel generator.
    """
    width, height = 1080, 1920
    theme = THEMES.get(theme_id, THEMES["navy_blue"])
    tmp_dir = Path("data/temp_retro")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    # 1. Pre-render static editorial template ONCE
    static_canvas = build_static_canvas(
        width, height, theme, series_tag, title, speaker, footer_brand,
        bg_style=bg_style, bg_image=bg_image,
    )

    # 2. Generate per-scene narration audio & concat
    scene_durations = []
    audio_files = []
    for idx, sc in enumerate(scenes):
        ap = str(tmp_dir / f"scene_{idx}.mp3")
        dur = await generate_scene_audio(sc.get("text", ""), voice, ap)
        # Add 0.45s breathing room between slides
        padded_ap = str(tmp_dir / f"scene_{idx}_pad.mp3")
        total_sc_dur = dur + 0.45
        subprocess.run(
            ["ffmpeg", "-y", "-i", ap, "-af", f"apad=pad_dur=0.45", "-t", f"{total_sc_dur:.2f}",
             "-c:a", "libmp3lame", "-b:a", "128k", padded_ap],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        audio_files.append(padded_ap)
        scene_durations.append(total_sc_dur)

    concat_list = tmp_dir / "audio_list.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for af in audio_files:
            f.write(f"file '{os.path.abspath(af)}'\n")

    merged_voice = str(tmp_dir / "merged_voice.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", merged_voice],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )

    total_duration = sum(scene_durations)
    os.makedirs(os.path.dirname(os.path.abspath(output_mp4)), exist_ok=True)

    # 3. Stream raw animated RGB frames directly to FFmpeg stdin
    has_bgm = bgm_path and os.path.exists(bgm_path)
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{width}x{height}", "-pix_fmt", "rgb24", "-r", str(fps),
        "-i", "-",
        "-i", merged_voice,
    ]
    if has_bgm:
        cmd += [
            "-stream_loop", "-1", "-i", bgm_path,
            "-filter_complex", "[2:a]volume=0.10[bgm];[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]",
            "-map", "0:v", "-map", "[a]",
        ]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]

    cmd += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", f"{total_duration:.2f}",
        output_mp4,
    ]

    print(f"[INFO] Streaming {len(scenes)} scenes ({total_duration:.1f}s @ {fps}fps) to FFmpeg...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    for s_idx, (sc, s_dur) in enumerate(zip(scenes, scene_durations)):
        n_frames = max(1, int(round(s_dur * fps)))
        icon_name = sc.get("icon", AVAILABLE_ICONS[s_idx % len(AVAILABLE_ICONS)])
        text = sc.get("text", "")

        for fi in range(n_frames):
            t_sec = fi / fps
            # Draw-on animation completes in ~1.25s
            draw_prog = min(1.0, t_sec / 1.25)
            # Highlight bar sweeps in smoothly between 0.35s and 1.1s
            hl_prog = min(1.0, max(0.0, (t_sec - 0.35) / 0.75))
            # Subtle hand-drawn boil updates every ~6 frames (~4 fps)
            boil_seed = s_idx * 1000 + (fi // 6)

            frame = static_canvas.copy()
            render_doodle_on_frame(frame, icon_name, theme, draw_prog, boil_seed)
            render_highlighted_subtitle(frame, text, theme, hl_progress=hl_prog)
            proc.stdin.write(frame.tobytes())

    proc.stdin.close()
    err = proc.stderr.read()
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg render failed: {err.decode('utf-8', errors='ignore')}")

    print(f"[SUCCESS] Doodle Motion Reel rendered: {output_mp4}")
    return output_mp4

def render_preview_frame(
    series_tag: str,
    title: str,
    speaker: str,
    footer_brand: str,
    icon_name: str,
    subtitle_text: str,
    theme_id: str = "navy_blue",
    bg_style: str = "classic_cream",
    bg_image: str = "",
    output_png: str = "content-trend-intelligence/public/clips/retro_preview.png",
) -> str:
    """
    Renders a single high-res 1080x1920 preview frame instantly (<0.4s).
    """
    theme = THEMES.get(theme_id, THEMES["navy_blue"])
    frame = build_static_canvas(
        1080, 1920, theme, series_tag, title, speaker, footer_brand,
        bg_style=bg_style, bg_image=bg_image,
    )
    render_doodle_on_frame(frame, icon_name, theme, progress=1.0, boil_seed=1)
    render_highlighted_subtitle(frame, subtitle_text, theme, hl_progress=1.0)
    os.makedirs(os.path.dirname(os.path.abspath(output_png)), exist_ok=True)
    frame.save(output_png, quality=95)
    print(f"[OK] Preview generated: {output_png}")
    return output_png

# =============================================================================
# 6. CLI ENTRYPOINT
# =============================================================================

DEFAULT_SCENES = [
    {"icon": "mimbar", "text": "Bila khatib naik mimbar, ia menghadap jamaah dan *memberi salam.*"},
    {"icon": "speech", "text": "Jawab muadzin, lalu berdoa. Berdoalah *di antara dua khutbah.*"},
    {"icon": "stairs", "text": "Berdoalah juga saat ia *turun dari mimbar,* selesai khutbah kedua, sampai shalat dimulai."},
    {"icon": "tasbih", "text": "dan di *akhir tasyahud terakhir.* Semua ini adalah *tempat dikabulkannya doa.*"},
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DzikirQu Doodle Motion Reel Engine")
    parser.add_argument("--preview", action="store_true", help="Render 1-frame preview PNG")
    parser.add_argument("--series", default="SERI JUMAT 3/3", help="Top series badge")
    parser.add_argument("--title", default="Tempat Berdoa di Hari Jumat", help="Header serif title")
    parser.add_argument("--speaker", default="Syaikh Prof. Dr. Badr bin Nashir al-Badr", help="Speaker / source credit")
    parser.add_argument("--footer", default="DzikirQu | MASJID BASHIRAH", help="Footer brand watermark")
    parser.add_argument("--theme", default="navy_blue", choices=list(THEMES.keys()), help="Color theme")
    parser.add_argument("--bg-style", default="classic_cream", help="Background preset style")
    parser.add_argument("--bg-image", default="", help="Optional path to custom uploaded background image")
    parser.add_argument("--voice", default="id-ID-ArdiNeural", help="Edge-TTS voice")
    parser.add_argument("--scenes-json", default="", help="JSON string or path to JSON array of {icon, text}")
    parser.add_argument("--icon", default="mimbar", help="Icon for preview mode")
    parser.add_argument("--text", default=DEFAULT_SCENES[0]["text"], help="Subtitle text for preview mode")
    parser.add_argument("--output", default="content-trend-intelligence/public/clips/retro_dzikirqu_demo.mp4", help="Output file path")

    args = parser.parse_args()

    scenes = DEFAULT_SCENES
    if args.scenes_json:
        if os.path.exists(args.scenes_json):
            with open(args.scenes_json, "r", encoding="utf-8") as f:
                scenes = json.load(f)
        else:
            scenes = json.loads(args.scenes_json)

    if args.preview:
        out_img = args.output if args.output.endswith(".png") else "content-trend-intelligence/public/clips/retro_preview.png"
        first_icon = scenes[0].get("icon", args.icon) if scenes else args.icon
        first_text = scenes[0].get("text", args.text) if scenes else args.text
        render_preview_frame(
            series_tag=args.series,
            title=args.title,
            speaker=args.speaker,
            footer_brand=args.footer,
            icon_name=first_icon,
            subtitle_text=first_text,
            theme_id=args.theme,
            bg_style=args.bg_style,
            bg_image=args.bg_image,
            output_png=out_img,
        )
        sys.exit(0)

    asyncio.run(render_doodle_reel(
        series_tag=args.series,
        title=args.title,
        speaker=args.speaker,
        footer_brand=args.footer,
        scenes=scenes,
        theme_id=args.theme,
        bg_style=args.bg_style,
        bg_image=args.bg_image,
        voice=args.voice,
        output_mp4=args.output,
    ))
