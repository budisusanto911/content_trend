#!/usr/bin/env python3
"""
Minimalist Stickman Doodle Animation Engine
Generates expressive 9:16 animated stickman storytelling reels for relatable daily life,
self-reflection, practical solutions, and happy moments.
100% local Pillow + FFmpeg rawvideo pipe (0 AI tokens for rendering).
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
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageChops

try:
    import edge_tts
except ImportError:
    edge_tts = None

# =============================================================================
# 1. THEMES & PAPER STYLES
# =============================================================================

STICKMAN_THEMES = {
    "calm_ink": {
        "name": "Tinta Klasik & Stabilo Kuning",
        "bg": (249, 246, 238),
        "grid": (222, 226, 232),
        "ink": (30, 32, 38),
        "accent": (214, 134, 24),
        "highlight_bg": (253, 234, 152),
        "muted": (118, 122, 130),
        "prop_fill": (253, 234, 152),
    },
    "warm_healing": {
        "name": "Warm Healing & Peach",
        "bg": (250, 243, 235),
        "grid": (232, 218, 206),
        "ink": (54, 38, 32),
        "accent": (196, 90, 62),
        "highlight_bg": (248, 212, 196),
        "muted": (132, 112, 104),
        "prop_fill": (248, 212, 196),
    },
    "happy_pop": {
        "name": "Cerah & Positif (Mint + Kuning)",
        "bg": (248, 250, 247),
        "grid": (218, 230, 224),
        "ink": (26, 42, 58),
        "accent": (36, 146, 114),
        "highlight_bg": (194, 240, 222),
        "muted": (106, 122, 128),
        "prop_fill": (254, 236, 148),
    },
    "midnight_chalk": {
        "name": "Papan Malam / Overthinking (Dark)",
        "bg": (24, 27, 34),
        "grid": (40, 46, 58),
        "ink": (240, 242, 246),
        "accent": (122, 184, 252),
        "highlight_bg": (48, 72, 108),
        "muted": (152, 160, 174),
        "prop_fill": (250, 220, 122),
    },
}

FONT_PATHS = {
    "bold": [
        "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "serif_bold": [
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ],
    "regular": [
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
}

def load_font(role: str, size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_PATHS.get(role, []):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# =============================================================================
# 2. BACKGROUND PAPER GENERATOR (Graph, Lined, Dotted, Sketchbook)
# =============================================================================

def build_stickman_canvas(width: int, height: int, theme: Dict[str, Any], paper_style: str, channel_tag: str) -> Image.Image:
    bg = theme["bg"]
    grid = theme["grid"]
    img = Image.new("RGB", (width, height), bg)

    # Subtle paper grain
    rng = random.Random(77)
    grain = Image.new("L", (width // 2, height // 2))
    grain.putdata([rng.randint(123, 133) for _ in range((width // 2) * (height // 2))])
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

    if paper_style == "notebook_grid":
        step = 54
        for x in range(0, width, step):
            draw.line([(x, 0), (x, height)], fill=grid, width=2)
        for y in range(0, height, step):
            draw.line([(0, y), (width, y)], fill=grid, width=2)
    elif paper_style == "lined_journal":
        step = 68
        for y in range(120, height - 100, step):
            draw.line([(0, y), (width, y)], fill=grid, width=2)
        # Subtle red/accent margin line on left
        margin_col = (224, 162, 162) if br > 100 else (72, 54, 62)
        draw.line([(96, 0), (96, height)], fill=margin_col, width=3)
    elif paper_style == "dot_journal":
        step = 52
        for y in range(40, height - 40, step):
            for x in range(40, width - 40, step):
                draw.ellipse([(x - 2, y - 2), (x + 2, y + 2)], fill=grid)
    # else warm_sketchbook: clean subtle grain paper

    # Subtle channel watermark at bottom
    if channel_tag:
        f_ch = load_font("regular", 30)
        bbox = draw.textbbox((0, 0), channel_tag, font=f_ch)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, height - 145), channel_tag, font=f_ch, fill=theme["muted"])

    return img

# =============================================================================
# 3. HAND-DRAWN PRIMITIVES & PROCEDURAL ANIMATED STICKMAN RIG
# =============================================================================

def _j(val: float, rng: random.Random, amp: float = 2.0) -> float:
    return val + rng.uniform(-amp, amp)

def _line(draw: ImageDraw.ImageDraw, p1, p2, color, width=12, rng=None, amp=1.8):
    if rng:
        p1 = (_j(p1[0], rng, amp), _j(p1[1], rng, amp))
        p2 = (_j(p2[0], rng, amp), _j(p2[1], rng, amp))
    draw.line([p1, p2], fill=color, width=width)
    r = width / 2
    draw.ellipse([(p1[0] - r, p1[1] - r), (p1[0] + r, p1[1] + r)], fill=color)
    draw.ellipse([(p2[0] - r, p2[1] - r), (p2[0] + r, p2[1] + r)], fill=color)

def _poly(draw: ImageDraw.ImageDraw, pts, color, width=12, rng=None, amp=1.6):
    jpts = [(_j(x, rng, amp), _j(y, rng, amp)) for (x, y) in pts] if rng else pts
    if len(jpts) >= 2:
        draw.line(jpts, fill=color, width=width, joint="curve")
    r = width / 2
    for (x, y) in jpts:
        draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color)

def _circle_outline(draw: ImageDraw.ImageDraw, cx, cy, r, color, width=12, fill=None, rng=None):
    pts = []
    for i in range(28):
        ang = math.radians(i * (360 / 28))
        rr = r + (rng.uniform(-2.0, 2.0) if rng else 0)
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    if fill is not None:
        draw.polygon(pts, fill=fill)
    _poly(draw, pts + [pts[0]], color, width=width)

def _draw_face(draw: ImageDraw.ImageDraw, hx: float, hy: float, mood: str, ink: tuple, rng: random.Random):
    """Draws minimalist expressive stickman face."""
    # Eyes
    if mood in ("happy", "cheer", "eureka"):
        # Happy curved eyes ^ ^
        _poly(draw, [(hx - 24, hy - 8), (hx - 16, hy - 18), (hx - 8, hy - 8)], ink, width=6, rng=rng, amp=0.6)
        _poly(draw, [(hx + 8, hy - 8), (hx + 16, hy - 18), (hx + 24, hy - 8)], ink, width=6, rng=rng, amp=0.6)
        # Big smile
        _poly(draw, [(hx - 18, hy + 12), (hx, hy + 26), (hx + 18, hy + 12)], ink, width=6, rng=rng, amp=0.6)
    elif mood in ("sad", "tired", "burden"):
        # Droopy dot eyes
        draw.ellipse([(hx - 20, hy - 12), (hx - 10, hy - 2)], fill=ink)
        draw.ellipse([(hx + 10, hy - 12), (hx + 20, hy - 2)], fill=ink)
        # Small sad frown
        _poly(draw, [(hx - 14, hy + 22), (hx, hy + 13), (hx + 14, hy + 22)], ink, width=6, rng=rng, amp=0.6)
    elif mood in ("calm", "breathe", "hug", "chill"):
        # Peaceful closed eyes u u
        _poly(draw, [(hx - 24, hy - 10), (hx - 16, hy - 2), (hx - 8, hy - 10)], ink, width=6, rng=rng, amp=0.5)
        _poly(draw, [(hx + 8, hy - 10), (hx + 16, hy - 2), (hx + 24, hy - 10)], ink, width=6, rng=rng, amp=0.5)
        # Gentle small smile
        _poly(draw, [(hx - 12, hy + 14), (hx, hy + 20), (hx + 12, hy + 14)], ink, width=5, rng=rng, amp=0.5)
    elif mood == "stargaze":
        # Looking up peacefully
        draw.ellipse([(hx - 18, hy - 22), (hx - 8, hy - 12)], fill=ink)
        draw.ellipse([(hx + 10, hy - 22), (hx + 20, hy - 12)], fill=ink)
        _poly(draw, [(hx - 10, hy + 10), (hx, hy + 15), (hx + 10, hy + 10)], ink, width=5, rng=rng, amp=0.5)
    else:
        # Neutral / thoughtful
        draw.ellipse([(hx - 20, hy - 14), (hx - 10, hy - 4)], fill=ink)
        draw.ellipse([(hx + 10, hy - 14), (hx + 20, hy - 4)], fill=ink)
        _line(draw, (hx - 12, hy + 16), (hx + 12, hy + 16), ink, width=5, rng=rng, amp=0.5)

def _draw_heart(draw: ImageDraw.ImageDraw, cx, cy, s, color, fill=None):
    pts = [
        (cx, cy - s * 0.25),
        (cx - s * 0.45, cy - s * 0.75),
        (cx - s * 0.95, cy - s * 0.25),
        (cx - s * 0.80, cy + s * 0.35),
        (cx, cy + s * 0.95),
        (cx + s * 0.80, cy + s * 0.35),
        (cx + s * 0.95, cy - s * 0.25),
        (cx + s * 0.45, cy - s * 0.75),
        (cx, cy - s * 0.25),
    ]
    if fill:
        draw.polygon(pts, fill=fill)
    _poly(draw, pts, color, width=7)

def render_stickman_scene(
    frame: Image.Image,
    pose: str,
    theme: Dict[str, Any],
    t_sec: float,
    boil_seed: int,
    cx: int = 540,
    ground_y: int = 1040,
):
    """
    Renders an animated minimalist stickman character + expressive props + ground line.
    Uses continuous time t_sec for smooth breathing, walking, jumping, rain, glowing lightbulb, etc.
    """
    draw = ImageDraw.Draw(frame)
    rng = random.Random(boil_seed)
    ink = theme["ink"]
    accent = theme["accent"]
    prop_fill = theme["prop_fill"]
    bg = theme["bg"]
    sw = 13  # Bold crisp stickman stroke width

    # Subtle ground line
    _line(draw, (cx - 260, ground_y), (cx + 260, ground_y), ink, width=7, rng=rng, amp=1.5)

    # Smooth breathing wave
    breath = math.sin(t_sec * 2.6) * 5.0
    bob = math.sin(t_sec * 4.5) * 6.0

    # --- POSE 1: OVERTHINKING (Sitting with swirling tangled cloud above head) ---
    if pose == "overthinking":
        hip = (cx - 10, ground_y - 35)
        neck = (cx + 15, ground_y - 180 + breath)
        head = (cx + 26, ground_y - 255 + breath)
        # Legs bent seated
        _poly(draw, [hip, (cx + 75, ground_y - 95), (cx + 105, ground_y - 8)], ink, sw, rng)
        _poly(draw, [hip, (cx + 50, ground_y - 85), (cx + 80, ground_y - 8)], ink, sw, rng)
        # Slumped torso
        _poly(draw, [hip, (cx - 8, ground_y - 110), neck], ink, sw, rng)
        # Arms hugging knees / chin
        _poly(draw, [neck, (cx + 55, ground_y - 120), (cx + 35, ground_y - 210 + breath)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "sad", ink, rng)
        # Swirling tangled scribble above head
        sx, sy = head[0], head[1] - 155
        scribble = []
        for i in range(42):
            ang = i * 0.55 + t_sec * 2.2
            rad = 22 + 52 * abs(math.sin(i * 0.23))
            scribble.append((sx + rad * math.cos(ang), sy + rad * 0.65 * math.sin(ang)))
        _poly(draw, scribble, accent, width=8, rng=rng, amp=1.2)

    # --- POSE 2: WALKING ALONE (Smooth walking cycle) ---
    elif pose == "walking_alone":
        phase = t_sec * 4.2
        step_l = math.sin(phase) * 55
        step_r = math.sin(phase + math.pi) * 55
        hip = (cx, ground_y - 155 + abs(math.sin(phase)) * 12)
        neck = (cx + 8, hip[1] - 160)
        head = (cx + 12, neck[1] - 70)
        _line(draw, hip, (cx + step_l, ground_y - 8), ink, sw, rng)
        _line(draw, hip, (cx + step_r, ground_y - 8), ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        # Swinging arms
        _line(draw, neck, (cx - step_l * 0.7, neck[1] + 105), ink, sw, rng)
        _line(draw, neck, (cx - step_r * 0.7, neck[1] + 105), ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "neutral", ink, rng)
        # Small trailing motion lines
        for k in range(3):
            lx = cx - 150 - k * 25
            ly = ground_y - 80 - k * 55
            _line(draw, (lx, ly), (lx + 38, ly), accent, width=6, rng=rng)

    # --- POSE 3: RAIN SAD (Standing under animated rain cloud) ---
    elif pose == "rain_sad":
        hip = (cx, ground_y - 155)
        neck = (cx + 6, ground_y - 305 + breath * 0.6)
        head = (cx + 14, neck[1] - 68)
        _line(draw, hip, (cx - 28, ground_y - 8), ink, sw, rng)
        _line(draw, hip, (cx + 28, ground_y - 8), ink, sw, rng)
        _poly(draw, [hip, (cx - 4, ground_y - 230), neck], ink, sw, rng)
        _line(draw, neck, (cx - 38, neck[1] + 115), ink, sw, rng)
        _line(draw, neck, (cx + 46, neck[1] + 115), ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "sad", ink, rng)
        # Cloud above
        cl_y = head[1] - 185 + math.sin(t_sec * 1.8) * 6
        _circle_outline(draw, cx - 55, cl_y + 10, 48, ink, 10, fill=prop_fill, rng=rng)
        _circle_outline(draw, cx + 50, cl_y + 10, 48, ink, 10, fill=prop_fill, rng=rng)
        _circle_outline(draw, cx, cl_y - 14, 58, ink, 10, fill=prop_fill, rng=rng)
        # Animated falling raindrops
        for i in range(6):
            rx = cx - 90 + i * 36
            drop_offset = ((t_sec * 160 + i * 45) % 130)
            ry = cl_y + 52 + drop_offset
            _line(draw, (rx, ry), (rx - 6, ry + 20), accent, width=7, rng=rng, amp=0.6)

    # --- POSE 4: CARRYING BURDEN (Heavy boulder on shoulders) ---
    elif pose == "carrying_burden":
        strain = math.sin(t_sec * 5.0) * 3.0
        hip = (cx - 15, ground_y - 140)
        neck = (cx + 35, ground_y - 250 + strain)
        head = (cx + 75, neck[1] - 35 + strain)
        _poly(draw, [hip, (cx - 55, ground_y - 70), (cx - 45, ground_y - 8)], ink, sw, rng)
        _poly(draw, [hip, (cx + 25, ground_y - 70), (cx + 45, ground_y - 8)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        # Arms holding heavy boulder
        _poly(draw, [neck, (cx + 20, neck[1] - 60), (cx - 10, neck[1] - 110)], ink, sw, rng)
        _poly(draw, [neck, (cx + 60, neck[1] - 70), (cx + 30, neck[1] - 120)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 56, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "burden", ink, rng)
        # Huge boulder on back
        _circle_outline(draw, cx - 20, neck[1] - 115 + strain, 110, ink, sw, fill=prop_fill, rng=rng)

    # --- POSE 5: EUREKA IDEA (Glowing animated lightbulb!) ---
    elif pose == "eureka_idea":
        hip = (cx, ground_y - 160)
        neck = (cx, ground_y - 320 + breath * 0.5)
        head = (cx, neck[1] - 70)
        _line(draw, hip, (cx - 42, ground_y - 8), ink, sw, rng)
        _line(draw, hip, (cx + 42, ground_y - 8), ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        # One arm pointing up excitedly, other on hip
        _poly(draw, [neck, (cx + 85, neck[1] - 35), (cx + 115, neck[1] - 135)], ink, sw, rng)
        _poly(draw, [neck, (cx - 75, neck[1] + 55), (cx - 35, neck[1] + 105)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "eureka", ink, rng)
        # Glowing lightbulb above head
        bx, by = cx, head[1] - 175
        pulse = 1.0 + 0.14 * math.sin(t_sec * 6.5)
        _circle_outline(draw, bx, by, 44, ink, 10, fill=prop_fill, rng=rng)
        _line(draw, (bx - 20, by + 48), (bx + 20, by + 48), ink, 9, rng)
        _line(draw, (bx - 16, by + 62), (bx + 16, by + 62), ink, 9, rng)
        # Radiating rays
        for ang_deg in range(0, 360, 45):
            if 65 <= ang_deg <= 115:
                continue
            a = math.radians(ang_deg)
            p1 = (bx + 62 * math.cos(a), by + 62 * math.sin(a))
            p2 = (bx + (88 * pulse) * math.cos(a), by + (88 * pulse) * math.sin(a))
            _line(draw, p1, p2, accent, 8, rng, amp=0.8)

    # --- POSE 6: DEEP BREATH / MEDITATE (Expanding calm aura rings) ---
    elif pose == "deep_breath":
        inhale = (math.sin(t_sec * 1.6) + 1.0) / 2.0  # 0..1 slow breathing
        hip = (cx, ground_y - 25)
        neck = (cx, ground_y - 185 - inhale * 12)
        head = (cx, neck[1] - 72)
        # Aura rings expanding with breath
        r1 = 155 + inhale * 65
        r2 = 215 + inhale * 85
        _circle_outline(draw, cx, neck[1] + 10, r1, accent, 5, rng=rng)
        _circle_outline(draw, cx, neck[1] + 10, r2, theme["highlight_bg"], 4, rng=rng)
        # Cross-legged lotus pose
        _poly(draw, [hip, (cx - 115, ground_y - 40), (cx - 25, ground_y - 10)], ink, sw, rng)
        _poly(draw, [hip, (cx + 115, ground_y - 40), (cx + 25, ground_y - 10)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        # Hands resting gently on knees
        _poly(draw, [neck, (cx - 85, ground_y - 110), (cx - 105, ground_y - 48)], ink, sw, rng)
        _poly(draw, [neck, (cx + 85, ground_y - 110), (cx + 105, ground_y - 48)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "breathe", ink, rng)

    # --- POSE 7: COFFEE CHILL (Sitting with steaming warm mug) ---
    elif pose == "coffee_chill":
        hip = (cx - 20, ground_y - 35)
        neck = (cx - 15, ground_y - 195 + breath)
        head = (cx - 10, neck[1] - 70)
        _poly(draw, [hip, (cx + 75, ground_y - 80), (cx + 95, ground_y - 8)], ink, sw, rng)
        _poly(draw, [hip, (cx - 95, ground_y - 35), (cx - 25, ground_y - 10)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        # Holding mug out in front
        mug_x, mug_y = cx + 95, neck[1] + 60
        _poly(draw, [neck, (cx + 45, neck[1] + 70), (mug_x - 25, mug_y + 10)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "chill", ink, rng)
        # Mug
        draw.rectangle([(mug_x - 28, mug_y - 24), (mug_x + 28, mug_y + 34)], fill=prop_fill, outline=ink, width=9)
        _circle_outline(draw, mug_x + 36, mug_y + 4, 15, ink, 8, rng=rng)
        # Rising wavy steam
        for s_off in (-14, 10):
            spts = []
            for k in range(10):
                sy = mug_y - 40 - k * 14
                sx = mug_x + s_off + math.sin(t_sec * 3.5 + k * 0.7 + s_off) * 9
                spts.append((sx, sy))
            _poly(draw, spts, accent, width=6)

    # --- POSE 8: HAPPY JUMP (Jumping for joy + sparkles!) ---
    elif pose == "happy_jump":
        jump_h = abs(math.sin(t_sec * 4.5)) * 75
        hip = (cx, ground_y - 185 - jump_h)
        neck = (cx, hip[1] - 150)
        head = (cx, neck[1] - 70)
        # Joyful spread legs & raised arms
        _poly(draw, [hip, (cx - 75, hip[1] + 75), (cx - 95, hip[1] + 135)], ink, sw, rng)
        _poly(draw, [hip, (cx + 75, hip[1] + 75), (cx + 95, hip[1] + 135)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        _poly(draw, [neck, (cx - 90, neck[1] - 40), (cx - 125, neck[1] - 115)], ink, sw, rng)
        _poly(draw, [neck, (cx + 90, neck[1] - 40), (cx + 125, neck[1] - 115)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "happy", ink, rng)
        # Floating confetti / sparkles
        for i, (ox, oy) in enumerate([(-175, -120), (180, -100), (-150, 60), (165, 50), (0, -210)]):
            pulse = 12 + 8 * math.sin(t_sec * 6 + i)
            px_s, py_s = cx + ox, neck[1] + oy
            _line(draw, (px_s - pulse, py_s), (px_s + pulse, py_s), accent, 7)
            _line(draw, (px_s, py_s - pulse), (px_s, py_s + pulse), accent, 7)

    # --- POSE 9: CLIMBING UP (Stepping up stairs of progress) ---
    elif pose == "climbing_up":
        # 3 rising steps
        steps = [
            (cx - 210, ground_y),
            (cx - 210, ground_y - 70),
            (cx - 80, ground_y - 70),
            (cx - 80, ground_y - 140),
            (cx + 60, ground_y - 140),
            (cx + 60, ground_y - 210),
            (cx + 220, ground_y - 210),
            (cx + 220, ground_y),
        ]
        _poly(draw, steps, ink, 10, rng)
        # Stickman stepping onto top step
        lift = abs(math.sin(t_sec * 3.5)) * 18
        hip = (cx + 10, ground_y - 265 - lift)
        neck = (cx + 35, hip[1] - 140)
        head = (cx + 48, neck[1] - 66)
        _poly(draw, [hip, (cx - 25, ground_y - 195), (cx - 25, ground_y - 145)], ink, sw, rng)
        _poly(draw, [hip, (cx + 85, ground_y - 245 - lift), (cx + 105, ground_y - 212)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        _poly(draw, [neck, (cx + 105, neck[1] - 25), (cx + 135, neck[1] - 80)], ink, sw, rng)
        _poly(draw, [neck, (cx - 35, neck[1] + 55), (cx - 55, neck[1] + 100)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 58, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "happy", ink, rng)
        # Flag on top step
        _line(draw, (cx + 185, ground_y - 210), (cx + 185, ground_y - 340), ink, 8, rng)
        draw.polygon([(cx + 185, ground_y - 340), (cx + 255, ground_y - 312), (cx + 185, ground_y - 285)], fill=prop_fill, outline=ink)

    # --- POSE 10: SELF HUG (Self-compassion with floating heart) ---
    elif pose == "self_hug":
        hip = (cx, ground_y - 160)
        neck = (cx, ground_y - 315 + breath)
        head = (cx, neck[1] - 68)
        _line(draw, hip, (cx - 32, ground_y - 8), ink, sw, rng)
        _line(draw, hip, (cx + 32, ground_y - 8), ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        # Arms crossed hugging self
        _poly(draw, [neck, (cx - 65, neck[1] + 55), (cx + 28, neck[1] + 75)], ink, sw, rng)
        _poly(draw, [neck, (cx + 65, neck[1] + 55), (cx - 28, neck[1] + 75)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "hug", ink, rng)
        # Floating heart gently pulsing above
        hy_float = head[1] - 135 + math.sin(t_sec * 3.0) * 12
        _draw_heart(draw, cx, hy_float, 40 + math.sin(t_sec * 4.0) * 4, accent, fill=prop_fill)

    # --- POSE 11: WORKING TIRED (Burnout at desk/laptop) ---
    elif pose == "working_tired":
        # Desk
        desk_y = ground_y - 165
        _line(draw, (cx - 190, desk_y), (cx + 190, desk_y), ink, 11, rng)
        _line(draw, (cx - 155, desk_y), (cx - 155, ground_y - 6), ink, 10, rng)
        _line(draw, (cx + 155, desk_y), (cx + 155, ground_y - 6), ink, 10, rng)
        # Laptop on right of desk
        _poly(draw, [(cx + 20, desk_y - 6), (cx + 115, desk_y - 6), (cx + 140, desk_y - 95)], ink, 10, rng)
        # Slumped stickman head resting on desk
        hip = (cx - 120, ground_y - 110)
        neck = (cx - 50, desk_y - 55 + breath * 0.5)
        head = (cx - 20, desk_y - 52 + breath * 0.5)
        _poly(draw, [hip, (cx - 115, ground_y - 6)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 54, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "tired", ink, rng)
        # Floating "z Z" tiredness marks
        f_z = load_font("bold", 44)
        z_y = head[1] - 115 - (t_sec * 25 % 55)
        draw.text((head[0] - 40, z_y), "z", font=f_z, fill=accent)
        draw.text((head[0] + 10, z_y - 36), "Z", font=f_z, fill=accent)

    # --- POSE 12: POINTING SOLUTION (Pointing to checklist board!) ---
    elif pose == "pointing_solution":
        # Stickman on left
        sx = cx - 135
        hip = (sx, ground_y - 155)
        neck = (sx, ground_y - 310 + breath * 0.5)
        head = (sx, neck[1] - 66)
        _line(draw, hip, (sx - 35, ground_y - 8), ink, sw, rng)
        _line(draw, hip, (sx + 35, ground_y - 8), ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        _line(draw, neck, (sx - 45, neck[1] + 105), ink, sw, rng)
        # Pointing arm to board
        _line(draw, neck, (sx + 135, neck[1] - 25 + math.sin(t_sec * 4) * 6), ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 58, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "cheer", ink, rng)
        # Checklist board on right
        bx1, by1, bx2, by2 = cx + 15, ground_y - 420, cx + 235, ground_y - 130
        draw.rectangle([(bx1, by1), (bx2, by2)], fill=bg, outline=ink, width=10)
        for k in range(3):
            cy_row = by1 + 65 + k * 75
            # Checkmark
            _poly(draw, [(bx1 + 30, cy_row), (bx1 + 48, cy_row + 18), (bx1 + 78, cy_row - 16)], accent, 9, rng)
            _line(draw, (bx1 + 98, cy_row + 4), (bx2 - 30, cy_row + 4), ink, 9, rng)

    # --- POSE 13: STARGAZING (Sitting peacefully watching moon & stars) ---
    elif pose == "stargazing":
        hip = (cx - 40, ground_y - 30)
        neck = (cx - 65, ground_y - 180 + breath)
        head = (cx - 58, neck[1] - 68)
        _poly(draw, [hip, (cx + 45, ground_y - 80), (cx + 80, ground_y - 8)], ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        _line(draw, neck, (cx - 125, ground_y - 10), ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 60, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "stargaze", ink, rng)
        # Crescent moon & twinkling stars on upper right
        mx, my = cx + 145, ground_y - 430
        _circle_outline(draw, mx, my, 48, ink, 9, fill=prop_fill, rng=rng)
        draw.ellipse([(mx - 15, my - 46), (mx + 58, my + 32)], fill=bg)
        for i, (stx, sty) in enumerate([(cx - 140, ground_y - 460), (cx + 20, ground_y - 480), (cx + 200, ground_y - 320)]):
            s = 10 + 7 * abs(math.sin(t_sec * 3.5 + i * 1.4))
            _line(draw, (stx - s, sty), (stx + s, sty), accent, 6)
            _line(draw, (stx, sty - s), (stx, sty + s), accent, 6)

    # --- POSE 14: HIGH FIVE / CHEER (Waving warmly) ---
    else:
        wave = math.sin(t_sec * 6.5) * 28
        hip = (cx, ground_y - 160)
        neck = (cx, ground_y - 315 + bob * 0.5)
        head = (cx, neck[1] - 68)
        _line(draw, hip, (cx - 42, ground_y - 8), ink, sw, rng)
        _line(draw, hip, (cx + 42, ground_y - 8), ink, sw, rng)
        _line(draw, hip, neck, ink, sw, rng)
        _poly(draw, [neck, (cx - 75, neck[1] + 55), (cx - 45, neck[1] + 105)], ink, sw, rng)
        _poly(draw, [neck, (cx + 75, neck[1] - 40), (cx + 115 + wave, neck[1] - 125)], ink, sw, rng)
        _circle_outline(draw, head[0], head[1], 62, ink, sw, fill=bg, rng=rng)
        _draw_face(draw, head[0], head[1], "cheer", ink, rng)

AVAILABLE_POSES = [
    "overthinking", "walking_alone", "rain_sad", "carrying_burden",
    "eureka_idea", "deep_breath", "coffee_chill", "happy_jump",
    "climbing_up", "self_hug", "working_tired", "pointing_solution",
    "stargazing", "high_five_cheer",
]

# =============================================================================
# 3B. CHIBI / MARSHMALLOW BEAN CHARACTER RENDERER (HIGH-RETENTION STYLE)
# =============================================================================

def _chibi_body_fill(theme: Dict[str, Any]) -> Tuple[int, int, int]:
    # Bright clean marshmallow fill (soft white on light themes, light chalk on dark)
    return (255, 255, 255) if theme["bg"][0] > 100 else (238, 240, 246)

def _chibi_shade_fill(theme: Dict[str, Any]) -> Tuple[int, int, int]:
    return (226, 224, 220) if theme["bg"][0] > 100 else (188, 194, 206)

def _draw_chibi_face(
    draw: ImageDraw.ImageDraw,
    hx: float,
    hy: float,
    mood: str,
    ink: tuple,
    accent: tuple,
    t_sec: float,
    rng: random.Random,
):
    """Expressive chibi/marshmallow face with periodic eye blinks, tilted brows, and cheek blush."""
    is_blinking = (t_sec % 3.5) > 3.36
    # Subtle soft cheek blush on happy/calm/hug moods
    if mood in ("happy", "cheer", "hug", "chill", "eureka", "breathe"):
        blush = (248, 198, 192)
        draw.ellipse([(hx - 78, hy + 18), (hx - 44, hy + 36)], fill=blush)
        draw.ellipse([(hx + 44, hy + 18), (hx + 78, hy + 36)], fill=blush)

    if is_blinking and mood not in ("calm", "breathe", "hug", "chill"):
        _line(draw, (hx - 48, hy + 4), (hx - 20, hy + 4), ink, width=8, rng=rng, amp=0.4)
        _line(draw, (hx + 20, hy + 4), (hx + 48, hy + 4), ink, width=8, rng=rng, amp=0.4)
    elif mood in ("sad", "tired", "burden"):
        # Expressive tired/gundah eyes with heavy straight eyebrows (like the uploaded reference!)
        _line(draw, (hx - 54, hy - 14), (hx - 18, hy - 20), ink, width=10, rng=rng, amp=0.5)
        _line(draw, (hx + 18, hy - 20), (hx + 54, hy - 14), ink, width=10, rng=rng, amp=0.5)
        draw.rounded_rectangle([(hx - 44, hy - 14), (hx - 26, hy + 18)], radius=8, fill=ink)
        draw.rounded_rectangle([(hx + 26, hy - 14), (hx + 44, hy + 18)], radius=8, fill=ink)
        # Small pensive mouth
        _poly(draw, [(hx - 22, hy + 44), (hx, hy + 38), (hx + 22, hy + 46)], ink, width=8, rng=rng, amp=0.5)
        return
    elif mood in ("happy", "cheer", "eureka"):
        # Big joyful curved eyes ^ ^
        _poly(draw, [(hx - 52, hy + 6), (hx - 34, hy - 16), (hx - 16, hy + 6)], ink, width=10, rng=rng, amp=0.5)
        _poly(draw, [(hx + 16, hy + 6), (hx + 34, hy - 16), (hx + 52, hy + 6)], ink, width=10, rng=rng, amp=0.5)
        _poly(draw, [(hx - 26, hy + 32), (hx, hy + 54), (hx + 26, hy + 32)], ink, width=9, rng=rng, amp=0.5)
        return
    elif mood in ("calm", "breathe", "hug", "chill"):
        # Peaceful closed smiling eyes u u
        _poly(draw, [(hx - 52, hy - 4), (hx - 34, hy + 12), (hx - 16, hy - 4)], ink, width=9, rng=rng, amp=0.4)
        _poly(draw, [(hx + 16, hy - 4), (hx + 34, hy + 12), (hx + 52, hy - 4)], ink, width=9, rng=rng, amp=0.4)
        _poly(draw, [(hx - 18, hy + 36), (hx, hy + 46), (hx + 18, hy + 36)], ink, width=8, rng=rng, amp=0.4)
        return
    else:
        # Expressive cute oval eyes with subtle white highlight dot
        draw.ellipse([(hx - 44, hy - 16), (hx - 22, hy + 16)], fill=ink)
        draw.ellipse([(hx + 22, hy - 16), (hx + 44, hy + 16)], fill=ink)
        draw.ellipse([(hx - 38, hy - 10), (hx - 30, hy - 2)], fill=(255, 255, 255))
        draw.ellipse([(hx + 28, hy - 10), (hx + 36, hy - 2)], fill=(255, 255, 255))

    # Mouth for neutral/blinking
    if mood in ("sad", "tired", "burden"):
        _poly(draw, [(hx - 20, hy + 44), (hx, hy + 36), (hx + 20, hy + 44)], ink, width=8, rng=rng, amp=0.5)
    elif mood in ("happy", "cheer", "eureka"):
        _poly(draw, [(hx - 24, hy + 34), (hx, hy + 52), (hx + 24, hy + 34)], ink, width=8, rng=rng, amp=0.5)
    else:
        _line(draw, (hx - 18, hy + 40), (hx + 18, hy + 38), ink, width=8, rng=rng, amp=0.4)

def _draw_chibi_fx(
    draw: ImageDraw.ImageDraw,
    fx: str,
    cx: float,
    top_y: float,
    theme: Dict[str, Any],
    t_sec: float,
    rng: random.Random,
):
    ink = theme["ink"]
    accent = theme["accent"]
    prop_fill = theme["prop_fill"]

    if fx == "scribble":
        # Thick tangled cloud scribble rotating gently above head (like uploaded ref!)
        sx, sy = cx - 20, top_y - 115
        scribble = []
        for i in range(52):
            ang = i * 0.52 + t_sec * 1.8
            rad = 28 + 68 * abs(math.sin(i * 0.21))
            scribble.append((sx + rad * math.cos(ang), sy + rad * 0.68 * math.sin(ang)))
        _poly(draw, scribble, (78, 74, 78) if theme["bg"][0] > 100 else accent, width=11, rng=rng, amp=1.0)
        # Floating "?" mark on right
        f_q = load_font("bold", 118)
        qy = top_y - 155 + math.sin(t_sec * 3.5) * 10
        draw.text((cx + 125, qy), "?", font=f_q, fill=(78, 74, 78) if theme["bg"][0] > 100 else accent)
    elif fx == "question":
        f_q = load_font("bold", 130)
        qy = top_y - 140 + math.sin(t_sec * 4.0) * 12
        draw.text((cx + 115, qy), "?", font=f_q, fill=accent)
    elif fx == "idea":
        bx, by = cx, top_y - 135
        pulse = 1.0 + 0.14 * math.sin(t_sec * 6.0)
        _circle_outline(draw, bx, by, 46, ink, 11, fill=prop_fill, rng=rng)
        _line(draw, (bx - 22, by + 52), (bx + 22, by + 52), ink, 10, rng)
        _line(draw, (bx - 16, by + 66), (bx + 16, by + 66), ink, 10, rng)
        for ang_deg in range(0, 360, 45):
            if 65 <= ang_deg <= 115:
                continue
            a = math.radians(ang_deg)
            _line(draw, (bx + 62 * math.cos(a), by + 62 * math.sin(a)),
                  (bx + (92 * pulse) * math.cos(a), by + (92 * pulse) * math.sin(a)), accent, 9, rng, amp=0.6)
    elif fx == "heart":
        hy = top_y - 100 + math.sin(t_sec * 3.0) * 12
        _draw_heart(draw, cx, hy, 44 + math.sin(t_sec * 4.0) * 4, accent, fill=prop_fill)
    elif fx == "sparkles":
        for i, (ox, oy) in enumerate([(-195, -50), (195, -40), (-165, 110), (175, 100), (0, -145)]):
            s = 14 + 8 * math.sin(t_sec * 6.0 + i)
            px_s, py_s = cx + ox, top_y + oy
            _line(draw, (px_s - s, py_s), (px_s + s, py_s), accent, 8)
            _line(draw, (px_s, py_s - s), (px_s, py_s + s), accent, 8)
    elif fx == "rain":
        cl_y = top_y - 135 + math.sin(t_sec * 1.8) * 6
        _circle_outline(draw, cx - 55, cl_y + 10, 48, ink, 10, fill=prop_fill, rng=rng)
        _circle_outline(draw, cx + 50, cl_y + 10, 48, ink, 10, fill=prop_fill, rng=rng)
        _circle_outline(draw, cx, cl_y - 14, 58, ink, 10, fill=prop_fill, rng=rng)
        for i in range(6):
            rx = cx - 90 + i * 36
            ry = cl_y + 52 + ((t_sec * 150 + i * 45) % 120)
            _line(draw, (rx, ry), (rx - 6, ry + 20), accent, width=7, rng=rng, amp=0.6)

def render_chibi_scene(
    frame: Image.Image,
    pose: str,
    theme: Dict[str, Any],
    t_sec: float,
    boil_seed: int,
    char_style: str = "chibi",
    cx: int = 540,
    ground_y: int = 1045,
):
    """
    Renders expressive animated characters across 5 cozy chibi variants:
    chibi | cat_mochi | hoodie_kid | bear_cozy | cloud_spirit
    with thick brush outlines, soft cel-shading, periodic eye blinks, and relatable props.
    """
    draw = ImageDraw.Draw(frame)
    rng = random.Random(boil_seed)
    ink = theme["ink"]
    accent = theme["accent"]
    prop_fill = theme["prop_fill"]
    body_fill = _chibi_body_fill(theme)
    shade_fill = _chibi_shade_fill(theme)
    sw = 15  # Thick cozy brush ink

    breath = math.sin(t_sec * 2.5) * 6.0
    jump = abs(math.sin(t_sec * 4.5)) * 70.0 if pose == "happy_jump" else 0.0

    # Determine mood & FX per pose
    mood_map = {
        "overthinking": ("sad", "scribble"),
        "working_tired": ("tired", "scribble"),
        "rain_sad": ("sad", "rain"),
        "carrying_burden": ("burden", "question"),
        "walking_alone": ("neutral", "none"),
        "eureka_idea": ("eureka", "idea"),
        "pointing_solution": ("cheer", "idea"),
        "deep_breath": ("breathe", "none"),
        "coffee_chill": ("chill", "none"),
        "self_hug": ("hug", "heart"),
        "happy_jump": ("happy", "sparkles"),
        "high_five_cheer": ("cheer", "sparkles"),
        "climbing_up": ("happy", "sparkles"),
        "stargazing": ("calm", "sparkles"),
    }
    face_mood, auto_fx = mood_map.get(pose, ("neutral", "none"))

    # --- SPECIAL VARIANT: FLUFFY FLOATING CLOUD SPIRIT ---
    if char_style == "cloud_spirit":
        hover = math.sin(t_sec * 2.4) * 14.0 - jump * 0.7
        cy = ground_y - 285 + hover
        # Soft ground shadow
        sh_rx = 125 - hover * 0.6
        draw.ellipse([(cx - sh_rx, ground_y - 16), (cx + sh_rx, ground_y + 10)], fill=shade_fill)
        # Fluffy multi-puff cloud body
        puffs = [
            (cx - 110, cy + 35, 92),
            (cx + 110, cy + 35, 92),
            (cx - 60, cy - 55, 98),
            (cx + 60, cy - 55, 98),
            (cx, cy - 80, 108),
            (cx, cy + 55, 118),
        ]
        # Outer ink silhouette
        for (px, py, pr) in puffs:
            draw.ellipse([(px - pr - sw, py - pr - sw), (px + pr + sw, py + pr + sw)], fill=ink)
        # Inner fluffy white cloud fill
        for (px, py, pr) in puffs:
            draw.ellipse([(px - pr, py - pr), (px + pr, py + pr)], fill=body_fill)
        # Tiny cute stubby cloud hands
        wave = math.sin(t_sec * 5.0) * 14 if pose in ("happy_jump", "high_five_cheer", "eureka_idea") else 0
        draw.ellipse([(cx - 195, cy + 35 - wave), (cx - 135, cy + 85 - wave)], fill=body_fill, outline=ink, width=11)
        draw.ellipse([(cx + 135, cy + 35 + wave), (cx + 195, cy + 85 + wave)], fill=body_fill, outline=ink, width=11)
        _draw_chibi_face(draw, cx, cy + 5, face_mood, ink, accent, t_sec, rng)
        if auto_fx != "none":
            _draw_chibi_fx(draw, auto_fx, cx, cy - 190, theme, t_sec, rng)
        return

    # Ground or Desk surface
    is_desk_scene = pose in ("overthinking", "working_tired")
    if is_desk_scene:
        desk_top = ground_y - 35
        draw.rectangle([(cx - 320, desk_top), (cx + 320, ground_y + 15)], fill=shade_fill, outline=ink, width=10)
        mug_x = cx - 265
        draw.rectangle([(mug_x, desk_top - 95), (mug_x + 72, desk_top)], fill=(120, 120, 128), outline=ink, width=9)
        _line(draw, (mug_x + 18, desk_top - 95), (mug_x + 10, desk_top - 145), ink, 11, rng)
        _line(draw, (mug_x + 42, desk_top - 95), (mug_x + 48, desk_top - 150), ink, 11, rng)
        draw.polygon(
            [(cx + 155, desk_top), (cx + 215, desk_top - 195), (cx + 315, desk_top - 180), (cx + 285, desk_top)],
            fill=(95, 98, 108), outline=ink
        )
        _poly(draw, [(cx + 155, desk_top), (cx + 215, desk_top - 195), (cx + 315, desk_top - 180), (cx + 285, desk_top)], ink, 11, rng)
    else:
        _line(draw, (cx - 280, ground_y), (cx + 280, ground_y), ink, width=8, rng=rng, amp=1.2)

    if pose == "deep_breath":
        inhale = (math.sin(t_sec * 1.6) + 1.0) / 2.0
        _circle_outline(draw, cx, ground_y - 230, 185 + inhale * 60, accent, 5, rng=rng)
        _circle_outline(draw, cx, ground_y - 230, 245 + inhale * 80, theme["highlight_bg"], 4, rng=rng)

    # Torso color (hoodie uses accent/soft tint, bear uses warm cozy tint, others white)
    torso_fill = body_fill
    if char_style == "hoodie_kid":
        torso_fill = theme["highlight_bg"]
    elif char_style == "bear_cozy":
        torso_fill = (242, 224, 200) if theme["bg"][0] > 100 else (216, 198, 178)

    body_cy = ground_y - 125 - jump + breath * 0.5
    body_rx, body_ry = 98, 108

    # Animated wagging cat tail behind torso for cat_mochi
    if char_style == "cat_mochi" and not is_desk_scene:
        wag = math.sin(t_sec * 4.5) * 26
        tail_pts = [
            (cx + 78, body_cy + 45),
            (cx + 145, body_cy + 20 + wag * 0.4),
            (cx + 172, body_cy - 35 + wag),
        ]
        _poly(draw, tail_pts, ink, sw + 1, rng)

    if not is_desk_scene:
        walk_off = math.sin(t_sec * 4.2) * 32 if pose == "walking_alone" else 0
        draw.rounded_rectangle([(cx - 56 + walk_off, body_cy + 65), (cx - 14 + walk_off, ground_y - 4 - jump)], radius=20, fill=torso_fill, outline=ink, width=sw - 2)
        draw.rounded_rectangle([(cx + 14 - walk_off, body_cy + 65), (cx + 56 - walk_off, ground_y - 4 - jump)], radius=20, fill=torso_fill, outline=ink, width=sw - 2)

    # Rounded bean torso
    draw.ellipse([(cx - body_rx, body_cy - body_ry), (cx + body_rx, body_cy + body_ry)], fill=torso_fill, outline=ink, width=sw)

    # Hoodie drawstrings & pocket for hoodie_kid
    if char_style == "hoodie_kid":
        _line(draw, (cx - 24, body_cy - 58), (cx - 28, body_cy + 10), ink, 8, rng)
        _line(draw, (cx + 24, body_cy - 58), (cx + 28, body_cy + 10), ink, 8, rng)
        if not is_desk_scene:
            draw.rounded_rectangle([(cx - 52, body_cy + 18), (cx + 52, body_cy + 68)], radius=14, outline=ink, width=7)

    if is_desk_scene:
        draw.rectangle([(cx - 315, ground_y - 30), (cx + 315, ground_y + 10)], fill=shade_fill)
        _line(draw, (cx - 320, ground_y - 35), (cx + 320, ground_y - 35), ink, 10)

    # Chubby expressive arms
    if pose in ("overthinking", "working_tired"):
        _poly(draw, [(cx + 68, body_cy - 10), (cx + 95, body_cy - 65), (cx + 62, body_cy - 115)], ink, sw, rng)
        _poly(draw, [(cx - 75, body_cy - 5), (cx - 98, body_cy + 45), (cx - 45, body_cy + 55)], ink, sw, rng)
    elif pose in ("happy_jump", "eureka_idea", "high_five_cheer"):
        wave = math.sin(t_sec * 6.0) * 20
        _poly(draw, [(cx - 88, body_cy - 25), (cx - 145, body_cy - 95 - wave)], ink, sw, rng)
        _poly(draw, [(cx + 88, body_cy - 25), (cx + 145, body_cy - 95 + wave)], ink, sw, rng)
    elif pose == "self_hug":
        _poly(draw, [(cx - 85, body_cy - 15), (cx + 30, body_cy + 15)], ink, sw, rng)
        _poly(draw, [(cx + 85, body_cy - 15), (cx - 30, body_cy + 15)], ink, sw, rng)
    elif pose == "coffee_chill":
        mug_x, mug_y = cx + 115, body_cy - 10
        _poly(draw, [(cx + 75, body_cy - 10), (mug_x - 24, mug_y + 6)], ink, sw, rng)
        draw.rounded_rectangle([(mug_x - 28, mug_y - 26), (mug_x + 28, mug_y + 32)], radius=10, fill=prop_fill, outline=ink, width=10)
        _circle_outline(draw, mug_x + 36, mug_y + 4, 14, ink, 8, rng=rng)
        for s_off in (-12, 10):
            spts = [(mug_x + s_off + math.sin(t_sec * 3.5 + k * 0.7 + s_off) * 8, mug_y - 42 - k * 14) for k in range(8)]
            _poly(draw, spts, accent, width=6)
    else:
        _poly(draw, [(cx - 88, body_cy - 15), (cx - 118, body_cy + 45)], ink, sw, rng)
        _poly(draw, [(cx + 88, body_cy - 15), (cx + 118, body_cy + 45)], ink, sw, rng)

    # Head position & dimensions
    hx = cx
    hy = body_cy - 175 + breath
    hrx, hry = 132, 118
    head_fill = torso_fill if char_style == "bear_cozy" else body_fill

    # Outer hood shell behind head for hoodie_kid
    if char_style == "hoodie_kid":
        draw.ellipse([(hx - hrx - 22, hy - hry - 20), (hx + hrx + 22, hy + hry + 16)], fill=theme["highlight_bg"], outline=ink, width=sw)

    # Cat triangular ears for cat_mochi
    if char_style == "cat_mochi":
        ear_l = [(hx - 112, hy - 64), (hx - 104, hy - 165), (hx - 36, hy - 108)]
        ear_r = [(hx + 112, hy - 64), (hx + 104, hy - 165), (hx + 36, hy - 108)]
        draw.polygon(ear_l, fill=body_fill, outline=ink)
        draw.polygon(ear_r, fill=body_fill, outline=ink)
        _poly(draw, ear_l + [ear_l[0]], ink, sw - 2)
        _poly(draw, ear_r + [ear_r[0]], ink, sw - 2)
        # Cute pink inner ears
        draw.polygon([(hx - 96, hy - 80), (hx - 92, hy - 135), (hx - 54, hy - 104)], fill=(246, 198, 200))
        draw.polygon([(hx + 96, hy - 80), (hx + 92, hy - 135), (hx + 54, hy - 104)], fill=(246, 198, 200))

    # Round teddy bear ears for bear_cozy
    if char_style == "bear_cozy":
        draw.ellipse([(hx - 135, hy - 148), (hx - 60, hy - 72)], fill=head_fill, outline=ink, width=sw - 2)
        draw.ellipse([(hx + 60, hy - 148), (hx + 135, hy - 72)], fill=head_fill, outline=ink, width=sw - 2)
        draw.ellipse([(hx - 114, hy - 126), (hx - 82, hy - 94)], fill=(214, 178, 148))
        draw.ellipse([(hx + 82, hy - 126), (hx + 114, hy - 94)], fill=(214, 178, 148))

    # Head with subtle cel shading
    draw.ellipse([(hx - hrx, hy - hry), (hx + hrx, hy + hry)], fill=head_fill)
    draw.pieslice([(hx - hrx + 6, hy - hry + 6), (hx + hrx - 6, hy + hry - 6)], start=25, end=145, fill=shade_fill)
    draw.ellipse([(hx - hrx + 18, hy - hry + 10), (hx + hrx - 22, hy + hry - 26)], fill=head_fill)
    draw.ellipse([(hx - hrx, hy - hry), (hx + hrx, hy + hry)], outline=ink, width=sw)

    # Cozy bear snout oval & nose
    if char_style == "bear_cozy":
        draw.ellipse([(hx - 44, hy + 8), (hx + 44, hy + 68)], fill=(255, 248, 240))
        draw.ellipse([(hx - 14, hy + 14), (hx + 14, hy + 32)], fill=ink)

    # Cute cat whiskers
    if char_style == "cat_mochi":
        _line(draw, (hx - 106, hy + 14), (hx - 152, hy + 6), ink, 6, rng, amp=0.5)
        _line(draw, (hx - 106, hy + 32), (hx - 150, hy + 38), ink, 6, rng, amp=0.5)
        _line(draw, (hx + 106, hy + 14), (hx + 152, hy + 6), ink, 6, rng, amp=0.5)
        _line(draw, (hx + 106, hy + 32), (hx + 150, hy + 38), ink, 6, rng, amp=0.5)

    _draw_chibi_face(draw, hx, hy, face_mood, ink, accent, t_sec, rng)

    if auto_fx != "none":
        _draw_chibi_fx(draw, auto_fx, hx, hy - hry - (22 if char_style in ("cat_mochi", "bear_cozy", "hoodie_kid") else 0), theme, t_sec, rng)

def render_custom_mascot_scene(
    frame: Image.Image,
    custom_image_path: str,
    fx_overlay: str,
    theme: Dict[str, Any],
    t_sec: float,
    boil_seed: int,
    cx: int = 540,
    center_y: int = 740,
):
    """
    Hybrid Mode: Composites a user-uploaded Chibi/Mascot illustration seamlessly onto paper
    (using multiply blend so white backgrounds vanish naturally!) with gentle breathing bounce
    + optional live animated FX overlay (scribble, ?, idea, heart, sparkles, rain).
    """
    rng = random.Random(boil_seed)
    mascot = Image.open(custom_image_path).convert("RGB")
    target_w = 640
    scale = 1.0 + 0.015 * math.sin(t_sec * 2.6)
    new_w = int(target_w * scale)
    new_h = int(mascot.height * (new_w / max(1, mascot.width)))
    if new_h > 680:
        new_h = int(680 * scale)
        new_w = int(mascot.width * (new_h / max(1, mascot.height)))

    mascot_resized = mascot.resize((new_w, new_h), Image.Resampling.LANCZOS)
    bob_y = int(math.sin(t_sec * 2.6) * 8)
    x0 = cx - new_w // 2
    y0 = center_y - new_h // 2 + bob_y

    # Multiply blend onto paper canvas if light theme so white background disappears cleanly!
    if theme["bg"][0] > 100:
        crop = frame.crop((x0, y0, x0 + new_w, y0 + new_h))
        blended = ImageChops.multiply(crop, mascot_resized)
        frame.paste(blended, (x0, y0))
    else:
        frame.paste(mascot_resized, (x0, y0))

    if fx_overlay and fx_overlay != "none":
        draw = ImageDraw.Draw(frame)
        _draw_chibi_fx(draw, fx_overlay, cx, y0 + 25, theme, t_sec, rng)

# =============================================================================
# 4. HEADER PILL & HIGHLIGHTED CAPTION RENDERING
# =============================================================================

def _parse_highlighted_tokens(text: str) -> List[Tuple[str, bool]]:
    tokens: List[Tuple[str, bool]] = []
    parts = text.split("*")
    for idx, part in enumerate(parts):
        is_hl = (idx % 2 == 1)
        for w in part.split():
            if w:
                tokens.append((w, is_hl))
    return tokens

def render_mood_pill(frame: Image.Image, label: str, theme: Dict[str, Any], y_pos: int = 230):
    if not label:
        return
    draw = ImageDraw.Draw(frame)
    font = load_font("bold", 34)
    bbox = draw.textbbox((0, 0), label.upper(), font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 34, 16
    x1 = (frame.width - tw) // 2 - pad_x
    x2 = (frame.width + tw) // 2 + pad_x
    y1 = y_pos
    y2 = y_pos + th + pad_y * 2
    draw.rounded_rectangle([(x1, y1), (x2, y2)], radius=28, fill=theme["highlight_bg"], outline=theme["ink"], width=4)
    draw.text(((frame.width - tw) // 2, y1 + pad_y - 3), label.upper(), font=font, fill=theme["ink"])

def render_story_caption(frame: Image.Image, text: str, theme: Dict[str, Any], hl_progress: float = 1.0, center_y: int = 1360):
    draw = ImageDraw.Draw(frame)
    font = load_font("bold", 72)
    tokens = _parse_highlighted_tokens(text)
    if not tokens:
        return

    space_w = draw.textbbox((0, 0), " ", font=font)[2]
    max_width = 860
    lines: List[List[Tuple[str, bool, int]]] = []
    cur: List[Tuple[str, bool, int]] = []
    cur_w = 0

    for word, is_hl in tokens:
        ww = draw.textbbox((0, 0), word, font=font)[2]
        add_w = ww if not cur else space_w + ww
        if cur_w + add_w <= max_width or not cur:
            cur.append((word, is_hl, ww))
            cur_w += add_w
        else:
            lines.append(cur)
            cur = [(word, is_hl, ww)]
            cur_w = ww
    if cur:
        lines.append(cur)

    line_h = 92
    start_y = center_y - (len(lines) * line_h) // 2
    ink = theme["ink"]
    accent = theme["accent"]
    hl_bg = theme["highlight_bg"]

    for li, line_tokens in enumerate(lines):
        y = start_y + li * line_h
        total_w = sum(t[2] for t in line_tokens) + space_w * max(0, len(line_tokens) - 1)
        x = (frame.width - total_w) // 2

        if hl_progress > 0.05:
            cx = x
            i = 0
            while i < len(line_tokens):
                word, is_hl, ww = line_tokens[i]
                if is_hl:
                    sx1 = cx - 10
                    sx2 = cx + ww
                    j = i + 1
                    while j < len(line_tokens) and line_tokens[j][1]:
                        sx2 += space_w + line_tokens[j][2]
                        j += 1
                    sx2 += 10
                    anim_x2 = sx1 + (sx2 - sx1) * min(1.0, hl_progress)
                    draw.rectangle([(sx1, y + 14), (anim_x2, y + 82)], fill=hl_bg)
                    for k in range(i, j):
                        cx += line_tokens[k][2] + space_w
                    i = j
                else:
                    cx += ww + space_w
                    i += 1

        cx = x
        for word, is_hl, ww in line_tokens:
            color = accent if (is_hl and hl_progress > 0.25 and theme["bg"][0] < 80) else ink
            draw.text((cx, y), word, font=font, fill=color)
            cx += ww + space_w

# =============================================================================
# 5. AUDIO (MOOD-ADAPTIVE INTONATION EDGE-TTS + WARM EQ + AMBIENT BGM)
# =============================================================================

INTONATION_PROFILES = {
    "syahdu":   {"rate": "-11%", "pitch": "-4Hz", "pause": 0.65},  # Malam, overthinking, haru, renungan dalam
    "hangat":   {"rate": "-6%",  "pitch": "-2Hz", "pause": 0.50},  # Healing, tenang, peluk diri, kopi santai
    "santai":   {"rate": "-2%",  "pitch": "+0Hz", "pause": 0.40},  # Ngobrol santai, edukasi, solusi praktis
    "semangat": {"rate": "+4%",  "pitch": "+3Hz", "pause": 0.30},  # Bahagia, small wins, pagi semangat, eureka
}

def resolve_scene_intonation(intonation_mode: str, theme_id: str, pose: str) -> Dict[str, Any]:
    """
    Resolves voice rate, pitch, and breathing pause dynamically based on theme & scene pose
    when intonation_mode == 'auto', or uses the user's explicit intonation preset.
    """
    if intonation_mode in INTONATION_PROFILES:
        return INTONATION_PROFILES[intonation_mode]

    # Auto mode: adapt per scene pose first, then fallback to overall theme mood
    if pose in ("happy_jump", "high_five_cheer", "eureka_idea", "climbing_up"):
        return INTONATION_PROFILES["semangat"]
    if pose in ("rain_sad", "overthinking", "carrying_burden", "stargazing"):
        return INTONATION_PROFILES["syahdu"]
    if pose in ("deep_breath", "self_hug", "coffee_chill", "walking_alone"):
        return INTONATION_PROFILES["hangat"]
    if pose in ("pointing_solution", "working_tired"):
        return INTONATION_PROFILES["santai"]

    theme_defaults = {
        "midnight_chalk": "syahdu",
        "warm_healing": "hangat",
        "happy_pop": "semangat",
        "calm_ink": "santai",
    }
    return INTONATION_PROFILES[theme_defaults.get(theme_id, "santai")]

async def generate_scene_audio(
    text: str,
    voice: str,
    output_path: str,
    rate: str = "-3%",
    pitch: str = "+0Hz",
) -> float:
    clean = text.replace("*", "").strip()
    if edge_tts and clean:
        try:
            comm = edge_tts.Communicate(clean, voice, rate=rate, pitch=pitch)
            await comm.save(output_path)
            res = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", output_path],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if res.stdout.strip():
                return max(2.2, float(res.stdout.strip()))
        except Exception as e:
            print(f"[WARN] Edge-TTS failed ({e}), using offline timing fallback.")

    words = max(3, len(clean.split()))
    dur = max(2.8, min(7.5, words * 0.42))
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
         "-t", f"{dur:.2f}", "-c:a", "libmp3lame", "-b:a", "128k", output_path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    return dur

BGM_TRACKS = {
    "chill_ambient": "assets/bgm/chill_ambient.mp3",
    "healing_piano": "assets/bgm/healing_piano_pad.mp3",
    "happy_morning": "assets/bgm/happy_morning_bells.mp3",
    "midnight_rain": "assets/bgm/midnight_rain_lofi.mp3",
}

THEME_BGM_MAP = {
    "calm_ink": "chill_ambient",
    "warm_healing": "healing_piano",
    "happy_pop": "happy_morning",
    "midnight_chalk": "midnight_rain",
}

def resolve_bgm_path(use_bgm: bool, bgm_track: str, theme_id: str, custom_bgm_path: str = "") -> str:
    if not use_bgm:
        return ""
    if custom_bgm_path and os.path.exists(custom_bgm_path):
        return custom_bgm_path
    key = THEME_BGM_MAP.get(theme_id, "chill_ambient") if bgm_track == "auto" else bgm_track
    path_cand = BGM_TRACKS.get(key, BGM_TRACKS["chill_ambient"])
    return path_cand if os.path.exists(path_cand) else ""

async def render_stickman_reel(
    scenes: List[Dict[str, str]],
    theme_id: str = "calm_ink",
    paper_style: str = "notebook_grid",
    char_style: str = "chibi",
    intonation: str = "auto",
    channel_tag: str = "@catatan.tenang",
    use_voice: bool = True,
    voice: str = "en-US-AndrewMultilingualNeural",
    custom_voice_audio: str = "",
    use_bgm: bool = True,
    bgm_track: str = "auto",
    custom_bgm_path: str = "",
    bgm_volume: float = 0.28,
    output_mp4: str = "content-trend-intelligence/public/clips/stickman_demo.mp4",
    fps: int = 24,
) -> str:
    width, height = 1080, 1920
    theme = STICKMAN_THEMES.get(theme_id, STICKMAN_THEMES["calm_ink"])
    tmp_dir = Path("data/temp_stickman")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    static_bg = build_stickman_canvas(width, height, theme, paper_style, channel_tag)

    # Human-warmth vocal EQ chain (reduces robotic metallic edge, boosts natural chest warmth)
    human_eq = "highpass=f=90,lowpass=f=7200,equalizer=f=220:t=q:w=1.2:g=2.5,equalizer=f=3200:t=q:w=1.5:g=-1.8,acompressor=threshold=-20dB:ratio=2.4:attack=12:release=180"

    scene_durations = []
    merged_voice = str(tmp_dir / "merged_voice.mp3")

    if not use_voice:
        # Silent reading mode (no voiceover, comfortable reading duration per scene)
        for sc in scenes:
            words = max(4, len(sc.get("text", "").replace("*", "").split()))
            scene_durations.append(max(3.2, min(7.0, words * 0.38)))
        total_silent = sum(scene_durations)
        subprocess.run(
            ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
             "-t", f"{total_silent:.2f}", "-c:a", "libmp3lame", "-b:a", "128k", merged_voice],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
    elif custom_voice_audio and os.path.exists(custom_voice_audio):
        # User uploaded their own real human voiceover! Split scene timing proportionally by word count.
        res = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", custom_voice_audio],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        total_v_dur = max(4.0, float(res.stdout.strip())) if res.stdout.strip() else 15.0
        subprocess.run(
            ["ffmpeg", "-y", "-i", custom_voice_audio, "-af", human_eq, "-c:a", "libmp3lame", "-b:a", "192k", merged_voice],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        weights = [max(3, len(sc.get("text", "").replace("*", "").split())) for sc in scenes]
        w_sum = sum(weights)
        scene_durations = [max(1.5, total_v_dur * (w / w_sum)) for w in weights]
    else:
        audio_files = []
        for idx, sc in enumerate(scenes):
            ap = str(tmp_dir / f"sc_{idx}.mp3")
            pose = sc.get("pose", "overthinking")
            prof = resolve_scene_intonation(intonation, theme_id, pose)
            dur = await generate_scene_audio(
                sc.get("text", ""),
                voice,
                ap,
                rate=prof["rate"],
                pitch=prof["pitch"],
            )
            padded_ap = str(tmp_dir / f"sc_{idx}_pad.mp3")
            pause_s = prof["pause"]
            total_sc = dur + pause_s
            subprocess.run(
                ["ffmpeg", "-y", "-i", ap,
                 "-af", f"{human_eq},apad=pad_dur={pause_s:.2f}",
                 "-t", f"{total_sc:.2f}",
                 "-c:a", "libmp3lame", "-b:a", "128k", padded_ap],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            audio_files.append(padded_ap)
            scene_durations.append(total_sc)

        concat_list = tmp_dir / "audio_list.txt"
        with open(concat_list, "w", encoding="utf-8") as f:
            for af in audio_files:
                f.write(f"file '{os.path.abspath(af)}'\n")

        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", merged_voice],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

    total_dur = sum(scene_durations)
    os.makedirs(os.path.dirname(os.path.abspath(output_mp4)), exist_ok=True)

    resolved_bgm = resolve_bgm_path(use_bgm, bgm_track, theme_id, custom_bgm_path)
    has_bgm = bool(resolved_bgm and os.path.exists(resolved_bgm))
    vol = max(0.05, min(0.75, float(bgm_volume)))
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{width}x{height}", "-pix_fmt", "rgb24", "-r", str(fps),
        "-i", "-",
        "-i", merged_voice,
    ]
    if has_bgm:
        # Clearly audible cozy BGM tucked under voice with normalize=0 so amix doesn't halve volume!
        fade_start = max(0.5, total_dur - 1.5)
        cmd += [
            "-stream_loop", "-1", "-i", resolved_bgm,
            "-filter_complex",
            f"[2:a]lowpass=f=6000,volume={vol:.3f},afade=t=in:st=0:d=0.6,afade=t=out:st={fade_start:.2f}:d=1.4[bgm];[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a]",
            "-map", "0:v", "-map", "[a]",
        ]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]

    cmd += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", f"{total_dur:.2f}",
        output_mp4,
    ]

    print(f"[INFO] Streaming {len(scenes)} stickman scenes ({total_dur:.1f}s @ {fps}fps) to FFmpeg...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    for s_idx, (sc, s_dur) in enumerate(zip(scenes, scene_durations)):
        n_frames = max(1, int(round(s_dur * fps)))
        pose = sc.get("pose", "overthinking")
        mood_label = sc.get("moodLabel", "")
        text = sc.get("text", "")
        custom_img = sc.get("customImage", "")
        fx_overlay = sc.get("fxOverlay", "none")

        for fi in range(n_frames):
            t_sec = fi / fps
            hl_prog = min(1.0, max(0.0, (t_sec - 0.3) / 0.7))
            boil_seed = s_idx * 1000 + (fi // 6)

            frame = static_bg.copy()
            render_mood_pill(frame, mood_label, theme)
            if custom_img and os.path.exists(custom_img):
                render_custom_mascot_scene(frame, custom_img, fx_overlay, theme, t_sec, boil_seed)
            elif char_style == "stickman":
                render_stickman_scene(frame, pose, theme, t_sec, boil_seed)
            else:
                render_chibi_scene(frame, pose, theme, t_sec, boil_seed, char_style=char_style)
            render_story_caption(frame, text, theme, hl_progress=hl_prog)
            proc.stdin.write(frame.tobytes())

    proc.stdin.close()
    err = proc.stderr.read()
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg render failed: {err.decode('utf-8', errors='ignore')}")

    print(f"[SUCCESS] Stickman Reel rendered: {output_mp4}")
    return output_mp4

def render_stickman_preview(
    pose: str,
    mood_label: str,
    text: str,
    theme_id: str = "calm_ink",
    paper_style: str = "notebook_grid",
    char_style: str = "chibi",
    custom_img: str = "",
    fx_overlay: str = "none",
    channel_tag: str = "@catatan.tenang",
    output_png: str = "content-trend-intelligence/public/clips/stickman_preview.png",
) -> str:
    theme = STICKMAN_THEMES.get(theme_id, STICKMAN_THEMES["calm_ink"])
    frame = build_stickman_canvas(1080, 1920, theme, paper_style, channel_tag)
    render_mood_pill(frame, mood_label, theme)
    if custom_img and os.path.exists(custom_img):
        render_custom_mascot_scene(frame, custom_img, fx_overlay, theme, t_sec=0.8, boil_seed=1)
    elif char_style == "stickman":
        render_stickman_scene(frame, pose, theme, t_sec=0.8, boil_seed=1)
    else:
        render_chibi_scene(frame, pose, theme, t_sec=0.8, boil_seed=1, char_style=char_style)
    render_story_caption(frame, text, theme, hl_progress=1.0)
    os.makedirs(os.path.dirname(os.path.abspath(output_png)), exist_ok=True)
    frame.save(output_png, quality=95)
    print(f"[OK] Stickman preview generated: {output_png}")
    return output_png

DEFAULT_SCENES = [
    {"pose": "overthinking", "moodLabel": "POV: Lagi Gundah", "text": "Kadang hati terasa penuh, bukan butuh curhat, tapi *butuh ruang sendiri.*"},
    {"pose": "walking_alone", "moodLabel": "Menepi Sebentar", "text": "Coba matikan layar 15 menit, jalan pelan, dan *biarkan kepala bernapas.*"},
    {"pose": "eureka_idea", "moodLabel": "Solusi Simpel", "text": "Tulis satu hal kecil yang bisa kamu bereskan *hari ini saja.* Sisanya titipkan dulu."},
    {"pose": "coffee_chill", "moodLabel": "Pelan-Pelan Aja", "text": "Kamu gak harus selesai hari ini. *Bisa tenang sebentar* saja sudah hebat."},
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Minimalist Chibi & Stickman Doodle Animation Engine")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--theme", default="calm_ink", choices=list(STICKMAN_THEMES.keys()))
    parser.add_argument("--paper", default="notebook_grid", choices=["notebook_grid", "lined_journal", "dot_journal", "warm_sketchbook"])
    parser.add_argument("--char-style", default="chibi", choices=["chibi", "cat_mochi", "hoodie_kid", "bear_cozy", "cloud_spirit", "stickman"])
    parser.add_argument("--intonation", default="auto", choices=["auto", "syahdu", "hangat", "santai", "semangat"])
    parser.add_argument("--channel", default="@catatan.tenang")
    parser.add_argument("--no-voice", action="store_true")
    parser.add_argument("--voice", default="en-US-AndrewMultilingualNeural")
    parser.add_argument("--custom-voice-audio", default="")
    parser.add_argument("--no-bgm", action="store_true")
    parser.add_argument("--bgm-track", default="auto")
    parser.add_argument("--custom-bgm", default="")
    parser.add_argument("--bgm-volume", type=float, default=0.28)
    parser.add_argument("--scenes-json", default="")
    parser.add_argument("--output", default="content-trend-intelligence/public/clips/stickman_demo.mp4")

    args = parser.parse_args()
    scenes = DEFAULT_SCENES
    if args.scenes_json:
        if os.path.exists(args.scenes_json):
            with open(args.scenes_json, "r", encoding="utf-8") as f:
                scenes = json.load(f)
        else:
            scenes = json.loads(args.scenes_json)

    if args.preview:
        sc = scenes[0] if scenes else DEFAULT_SCENES[0]
        out_img = args.output if args.output.endswith(".png") else "content-trend-intelligence/public/clips/stickman_preview.png"
        render_stickman_preview(
            pose=sc.get("pose", "overthinking"),
            mood_label=sc.get("moodLabel", ""),
            text=sc.get("text", ""),
            theme_id=args.theme,
            paper_style=args.paper,
            char_style=args.char_style,
            custom_img=sc.get("customImage", ""),
            fx_overlay=sc.get("fxOverlay", "none"),
            channel_tag=args.channel,
            output_png=out_img,
        )
        sys.exit(0)

    asyncio.run(render_stickman_reel(
        scenes=scenes,
        theme_id=args.theme,
        paper_style=args.paper,
        char_style=args.char_style,
        intonation=args.intonation,
        channel_tag=args.channel,
        use_voice=not args.no_voice,
        voice=args.voice,
        custom_voice_audio=args.custom_voice_audio,
        use_bgm=not args.no_bgm,
        bgm_track=args.bgm_track,
        custom_bgm_path=args.custom_bgm,
        bgm_volume=args.bgm_volume,
        output_mp4=args.output,
    ))
