#!/usr/bin/env python3
"""
Retro Video Engine (DzikirQu Style)
Generates Halftone / Dithered Risograph video with retro paper texture, Ken Burns motion, 
Edge-TTS voiceover, and elegant typography subtitles.
"""

import os
import sys
import json
import asyncio
import argparse
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# Ensure edge-tts can be imported
try:
    import edge_tts
except ImportError:
    edge_tts = None

# Palettes (RGB)
INK_PALETTES = {
    "charcoal": (34, 34, 34),          # Classic newspaper ink
    "terracotta": (142, 60, 42),       # Warm reddish earthy ink
    "sage_olive": (52, 70, 56),        # Calm vintage olive green
    "vintage_navy": (28, 44, 72),      # Deep indigo / cyanotype
    "sepia_brown": (90, 60, 40)        # Aged sepia ink
}

PAPER_TEXTURES = {
    "cream": "assets/retro/textures/cream_paper.png",
    "kraft": "assets/retro/textures/kraft_paper.png",
    "parchment": "assets/retro/textures/parchment_paper.png"
}

def apply_halftone_dither(image_path: str, ink_name="charcoal", paper_type="cream", output_path=None) -> str:
    """
    Applies authentic halftone dithering and blends with paper texture.
    Zero AI tokens, runs 100% locally in pure Pillow.
    """
    src_img = Image.open(image_path).convert("RGB")
    target_w, target_h = 1080, 1920
    
    # 1. Resize/Crop to 1080x1920 (aspect ratio fit)
    src_img = ImageOps.fit(src_img, (target_w, target_h), Image.Resampling.LANCZOS)
    
    # 2. Convert to Grayscale & Boost Contrast
    gray = src_img.convert("L")
    enhancer = ImageEnhance.Contrast(gray)
    high_contrast = enhancer.enhance(1.6)
    
    # Slight brightness adjustment to keep highlights clean
    brightener = ImageEnhance.Brightness(high_contrast)
    adjusted_gray = brightener.enhance(1.05)
    
    # 3. Floyd-Steinberg 1-bit Dithering (Stochastic Halftone)
    dithered_1bit = adjusted_gray.convert("1", dither=Image.Dither.FLOYDSTEINBERG)
    
    # 4. Load Paper Texture Background
    paper_path = PAPER_TEXTURES.get(paper_type, PAPER_TEXTURES["cream"])
    if os.path.exists(paper_path):
        paper = Image.open(paper_path).convert("RGB")
        paper = paper.resize((target_w, target_h), Image.Resampling.LANCZOS)
    else:
        # Fallback warm cream color
        paper = Image.new("RGB", (target_w, target_h), (246, 240, 232))
        
    # 5. Composite Ink onto Paper (Multiply blend where dot is black)
    ink_rgb = INK_PALETTES.get(ink_name, INK_PALETTES["charcoal"])
    
    # Mask: 0 = ink (black in dither), 255 = paper (white in dither)
    dither_l = dithered_1bit.convert("L")
    
    # Subtle ink bleed to simulate absorbent book paper
    dither_bleed = dither_l.filter(ImageFilter.GaussianBlur(radius=0.45))
    
    # Create solid ink image
    ink_layer = Image.new("RGB", (target_w, target_h), ink_rgb)
    
    # Blend: Multiply ink onto paper based on inverted mask
    # For each pixel: result = paper * (1 - opacity) + ((paper * ink) / 255) * opacity
    paper_pixels = paper.load()
    ink_pixels = ink_layer.load()
    mask_pixels = dither_bleed.load()
    
    final_img = Image.new("RGB", (target_w, target_h))
    final_pixels = final_img.load()
    
    ir, ig, ib = ink_rgb
    
    for y in range(target_h):
        for x in range(target_w):
            mask_val = mask_pixels[x, y] # 0 = full ink, 255 = no ink
            pr, pg, pb = paper_pixels[x, y]
            
            if mask_val == 255:
                final_pixels[x, y] = (pr, pg, pb)
            else:
                ink_coverage = (255 - mask_val) / 255.0
                # Multiply ink with paper
                mr = int((pr * ir) / 255)
                mg = int((pg * ig) / 255)
                mb = int((pb * ib) / 255)
                # Interpolate
                rr = int(pr * (1.0 - ink_coverage) + mr * ink_coverage)
                rg = int(pg * (1.0 - ink_coverage) + mg * ink_coverage)
                rb = int(pb * (1.0 - ink_coverage) + mb * ink_coverage)
                final_pixels[x, y] = (rr, rg, rb)
                
    if not output_path:
        output_path = f"assets/retro/samples/halftone_{ink_name}_{paper_type}.png"
        
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    final_img.save(output_path, quality=95)
    print(f"[OK] Halftone image created: {output_path}")
    return output_path

async def generate_voiceover(text: str, voice="id-ID-ArdiNeural", output_path="temp_voice.mp3") -> tuple[str, float]:
    """
    Generates TTS audio using edge-tts with offline/fallback support.
    Returns (audio_path, duration_seconds).
    """
    import subprocess
    duration = 8.0 # default fallback
    
    if edge_tts:
        try:
            communicate = edge_tts.Communicate(text, voice, rate="-4%")
            await communicate.save(output_path)
            cmd = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", output_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.stdout.strip():
                duration = float(res.stdout.strip())
                print(f"[OK] Voiceover generated via Edge-TTS: {output_path} ({duration:.2f}s)")
                return output_path, duration
        except Exception as e:
            print(f"[WARN] Edge-TTS network call failed ({e}). Using offline synthetic audio fallback.")

    # Offline fallback: Generate a clean silence audio with FFmpeg
    words = len(text.split())
    estimated_duration = max(5.0, min(25.0, words * 0.45))
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
        "-t", f"{estimated_duration}", "-c:a", "libmp3lame", "-b:a", "128k",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"[OK] Offline fallback audio created: {output_path} ({estimated_duration:.2f}s)")
    return output_path, estimated_duration

def generate_subtitles_ass(hook: str, body: str, duration: float, output_path="temp_subs.ass") -> str:
    """
    Creates an ASS subtitle file styled with classic typography for retro aesthetic.
    """
    ass_template = f"""[Script Info]
Title: Retro Story Subtitle
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HookTitle,DejaVu Serif,58,&H00202020,&H000000FF,&H50FFFFFF,&H00000000,1,0,0,0,100,100,2,0,1,2,0,2,80,80,1400,1
Style: BodyText,Liberation Serif,46,&H00202020,&H000000FF,&H60FFFFFF,&H00000000,0,0,0,0,100,100,1,0,1,1,0,2,100,100,320,1
Style: FooterBrand,DejaVu Sans,26,&H00707070,&H000000FF,&H00FFFFFF,&H00000000,1,0,0,0,100,100,4,0,1,0,0,2,80,80,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    # Timestamps
    hook_end = min(4.0, duration * 0.4)
    
    def fmt_time(seconds):
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:01d}:{m:02d}:{s:05.2f}"
        
    events = []
    # Brand watermark
    events.append(f"Dialogue: 0,0:00:00.00,{fmt_time(duration)},FooterBrand,,0,0,0,,— ARCHIVE —")
    
    # Hook Title
    if hook:
        clean_hook = hook.replace("\n", "\\N")
        events.append(f"Dialogue: 1,0:00:00.50,{fmt_time(hook_end)},HookTitle,,0,0,0,,{clean_hook}")
        
    # Body text
    if body:
        clean_body = body.replace("\n", "\\N")
        events.append(f"Dialogue: 1,{fmt_time(hook_end + 0.3)},{fmt_time(duration - 0.5)},BodyText,,0,0,0,,{clean_body}")
        
    full_content = ass_template + "\n".join(events) + "\n"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_content)
        
    print(f"[OK] Subtitle ASS created: {output_path}")
    return output_path

def assemble_video(image_path: str, audio_path: str, ass_path: str, duration: float, output_path="retro_video.mp4", bgm_path="assets/bgm/chill_ambient.mp3"):
    """
    Assembles final video with FFmpeg:
    - Ken Burns slow zoom
    - Film noise/grain filter
    - ASS subtitles
    - Voiceover + BGM ducking
    """
    import subprocess
    
    total_frames = int(duration * 30) + 10
    
    # FFmpeg filter:
    # 1. zoompan: subtle zoom in from 1.0 to 1.05
    # 2. noise: film grain
    # 3. subtitles: burned in
    vf_filter = (
        f"zoompan=z='min(zoom+0.0003,1.06)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,"
        f"noise=alls=14:allf=t+u,"
        f"ass={ass_path}"
    )
    
    has_bgm = bgm_path and os.path.exists(bgm_path)
    
    if has_bgm:
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-t", f"{duration}", "-i", image_path,
            "-i", audio_path,
            "-stream_loop", "-1", "-i", bgm_path,
            "-filter_complex",
            f"[0:v]{vf_filter}[v];[2:a]volume=0.12[bgm];[1:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-t", f"{duration}",
            output_path
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-t", f"{duration}", "-i", image_path,
            "-i", audio_path,
            "-vf", vf_filter,
            "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-t", f"{duration}",
            output_path
        ]
        
    print(f"Running FFmpeg render: {output_path}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr)
        raise RuntimeError(f"FFmpeg render failed: {res.stderr}")
        
    print(f"[SUCCESS] Final video rendered: {output_path}")
    return output_path

async def render_full_retro_video(
    image_input: str,
    hook_title: str,
    script_text: str,
    ink_name="charcoal",
    paper_type="cream",
    voice="id-ID-ArdiNeural",
    output_mp4="public/clips/retro_sample.mp4",
    bgm_path="assets/bgm/chill_ambient.mp3"
) -> str:
    """
    End-to-end generation:
    1. Halftone dither filter
    2. Edge-TTS voiceover
    3. Typography Subtitle ASS
    4. FFmpeg Video Assembly
    """
    tmp_dir = Path("data/temp_retro")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Image Halftone
    halftone_img = tmp_dir / f"halftone_{ink_name}.png"
    apply_halftone_dither(image_input, ink_name=ink_name, paper_type=paper_type, output_path=str(halftone_img))
    
    # 2. TTS Voiceover
    voice_path = tmp_dir / "narration.mp3"
    _, duration = await generate_voiceover(script_text, voice=voice, output_path=str(voice_path))
    
    # Extra pause at the end
    duration += 1.2
    
    # 3. Subtitles
    ass_path = tmp_dir / "subtitles.ass"
    generate_subtitles_ass(hook_title, script_text, duration, output_path=str(ass_path))
    
    # 4. Assemble Final Video
    os.makedirs(os.path.dirname(os.path.abspath(output_mp4)), exist_ok=True)
    assemble_video(str(halftone_img), str(voice_path), str(ass_path), duration, output_path=output_mp4, bgm_path=bgm_path)
    
    return output_mp4

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render retro halftone story video")
    parser.add_argument("--preview", action="store_true", help="Only render a 1-frame static preview image")
    parser.add_argument("--image", default="test_orig_frame.png", help="Input image path")
    parser.add_argument("--hook", default="Ketika Hatimu Merasa Lelah", help="Hook title")
    parser.add_argument("--script", default="Ingatlah, tidak ada lelah yang sia-sia bagi hati yang selalu bersandar pada ketetapan-Nya. Tenangkan dirimu, perbanyaklah istighfar.", help="Narration script")
    parser.add_argument("--ink", default="charcoal", choices=list(INK_PALETTES.keys()), help="Risograph ink color")
    parser.add_argument("--paper", default="cream", choices=list(PAPER_TEXTURES.keys()), help="Paper texture")
    parser.add_argument("--voice", default="id-ID-ArdiNeural", help="TTS Voice")
    parser.add_argument("--output", default="content-trend-intelligence/public/clips/retro_dzikirqu_demo.mp4", help="Output MP4 or PNG")
    
    args = parser.parse_args()
    
    if args.preview:
        out_img = args.output if args.output.endswith(".png") else "content-trend-intelligence/public/clips/retro_preview.png"
        apply_halftone_dither(args.image, ink_name=args.ink, paper_type=args.paper, output_path=out_img)
        print(f"[OK] Preview generated: {out_img}")
        sys.exit(0)
        
    asyncio.run(render_full_retro_video(
        image_input=args.image,
        hook_title=args.hook,
        script_text=args.script,
        ink_name=args.ink,
        paper_type=args.paper,
        voice=args.voice,
        output_mp4=args.output
    ))
