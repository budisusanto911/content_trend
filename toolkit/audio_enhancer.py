"""
Audio Enhancer & Retention Suite
Menangani:
1. Procedural BGM & SFX generation (Zero missing assets requirement).
2. Auto-ducking BGM (BGM volume turun saat suara vokal aktif).
3. EBU R128 Loudness Normalization.
4. Retention punch zoom (1.1x zoom pada hook penting).
"""

import os
import subprocess
import json

def ensure_asset_dir(path):
    os.makedirs(path, exist_ok=True)
    return path

def generate_procedural_bgm(output_path="assets/bgm/chill_ambient.mp3", duration=60):
    """
    Membuat background music lo-fi / chill ambient secara prosedural menggunakan FFmpeg lavfi
    sehingga sistem bisa berjalan mandiri tanpa harus download MP3 manual dari luar.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
        return output_path

    # Synthesize chord progression mellow (Cmaj7 - Am7) dengan flanger & lowpass lembut
    lavfi_synth = (
        f"aevalsrc=exprs='0.08*sin(2*PI*261.63*t) + 0.06*sin(2*PI*329.63*t) + 0.05*sin(2*PI*392.00*t) + "
        f"0.04*sin(2*PI*493.88*t) + 0.03*sin(2*PI*130.81*t)':s=44100:d={duration},"
        f"lowpass=f=800,flanger=delay=10:depth=2:regen=20:width=70:speed=0.2,volume=0.6"
    )
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", lavfi_synth,
        "-c:a", "libmp3lame", "-b:a", "128k",
        output_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_path
    except Exception as e:
        print(f"[AudioEnhancer] Gagal generate BGM: {e}")
        return None

def generate_procedural_sfx(output_path="assets/sfx/pop_punch.wav"):
    """
    Membuat sound effect pop / punch pendek untuk hook retention.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if os.path.exists(output_path) and os.path.getsize(output_path) > 500:
        return output_path

    # Fast pitch-drop sine wave (800Hz ke 100Hz dalam 0.15 detik)
    lavfi_sfx = "aevalsrc=exprs='0.4*sin(2*PI*(800 - 4500*t)*t)*exp(-25*t)':s=44100:d=0.25"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", lavfi_sfx,
        output_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_path
    except Exception as e:
        print(f"[AudioEnhancer] Gagal generate SFX: {e}")
        return None

def mix_smart_audio_with_ducking(input_video, output_video, bgm_file=None, bgm_volume=0.18):
    """
    Menggabungkan audio vokal asli dengan BGM menggunakan sidechain compression (Auto-Ducking).
    Saat pembicara bersuara, BGM otomatis mengecil. Saat hening, BGM naik secara halus.
    """
    if not bgm_file or not os.path.exists(bgm_file):
        bgm_file = generate_procedural_bgm()

    if not bgm_file or not os.path.exists(bgm_file):
        # Jika tetap tidak ada BGM, cukup copy
        cmd = ["ffmpeg", "-y", "-i", input_video, "-c", "copy", output_video]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video

    # Sidechain compressor filter complex:
    # 0:v (video passthrough)
    # 0:a (vocal), 1:a (bgm di-loop dan di-volume)
    # sidechaincompress mengecilkan stream 1 saat stream 0 mendeteksi suara > threshold
    filter_complex = (
        f"[1:a]aloop=loop=-1:size=2e+09,volume={bgm_volume}[bgm];"
        f"[bgm][0:a]sidechaincompress=threshold=0.04:ratio=5:attack=40:release=350[ducked_bgm];"
        f"[0:a][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2,loudnorm=I=-14:LRA=10:TP=-1.5[outa]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-stream_loop", "-1", "-i", bgm_file,
        "-filter_complex", filter_complex,
        "-map", "0:v",
        "-map", "[outa]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        output_video
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video
    except Exception as e:
        print(f"[AudioEnhancer] Gagal mix audio ducking ({e}), fallback ke audio asli.")
        cmd_fallback = ["ffmpeg", "-y", "-i", input_video, "-c", "copy", output_video]
        subprocess.run(cmd_fallback, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video

def apply_retention_zoom_punch(input_video, output_video, punch_timestamps=None):
    """
    Memberikan efek dynamic punch zoom (1.08x) pada detik-detik awal (hook) dan momen krusial
    untuk memecah kebosanan mata penonton (retention multiplier).
    """
    if punch_timestamps is None:
        # Default punch di detik 0.0 - 1.8 (hook opening)
        punch_timestamps = [(0.0, 1.8)]

    # Buat ekspresi crop dinamis FFmpeg:
    # Saat waktu 't' berada di dalam rentang punch, scale/crop sedikit masuk (zoom 1.08x)
    conds = []
    for start, end in punch_timestamps:
        conds.append(f"between(t,{start:.2f},{end:.2f})")
    
    or_cond = "+".join(conds)
    # Jika condition aktif, zoom_factor = 1.08, else 1.0
    # Menggunakan filter scale & crop dinamis
    v_filter = (
        f"crop=w='if({or_cond}, in_w/1.08, in_w)':h='if({or_cond}, in_h/1.08, in_h)':"
        f"x='(in_w-out_w)/2':y='(in_h-out_h)/2',scale=1080:1920"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vf", v_filter,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "copy",
        output_video
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video
    except Exception as e:
        print(f"[RetentionZoom] Gagal apply zoom punch ({e}), menggunakan video asli.")
        cmd_fallback = ["ffmpeg", "-y", "-i", input_video, "-c", "copy", output_video]
        subprocess.run(cmd_fallback, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video

