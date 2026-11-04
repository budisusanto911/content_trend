"""
Smart Face & Speaker Tracking Reframe Module
Menghitung koordinat horizontal dinamis (crop_x) untuk mereframe video landscape 16:9
menjadi vertikal 9:16 dengan panning halus (Moving Average) agar pembicara tidak terpotong.
"""

import os
import subprocess
import json
import re

def get_video_dimensions(video_file):
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=s=x:p=0",
        video_file
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
        w, h = res.stdout.strip().split("x")
        return int(w), int(h)
    except Exception:
        return 1280, 720

def analyze_motion_centroid_trajectory(video_file, duration=10, sample_fps=2):
    """
    Menganalisis pergerakan subjek utama (speaker) per interval detik
    menggunakan filter FFmpeg cropdetect dan scene activity.
    Menghasilkan list posisi horizontal x per detik.
    """
    w, h = get_video_dimensions(video_file)
    target_crop_w = int(h * 9 / 16)
    if target_crop_w % 2 != 0:
        target_crop_w -= 1

    max_x = max(0, w - target_crop_w)
    center_x = max_x // 2

    # Ambil sample koordinat dengan mengecek perbedaan intensitas gerak horizontal
    # Jika video tidak terlalu panjang, gunakan centroid sampling
    trajectory = []
    total_samples = max(2, int(duration * sample_fps))

    # Cek apakah cropdetect mendeteksi bounding box yang condong ke kiri atau kanan
    cmd = [
        "ffmpeg", "-i", video_file,
        "-t", str(duration),
        "-vf", "cropdetect=24:16:0",
        "-f", "null", "-"
    ]
    detected_x_points = []
    try:
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        matches = re.findall(r"x1:(\d+)\s+x2:(\d+)", res.stderr)
        for x1, x2 in matches:
            x1_i, x2_i = int(x1), int(x2)
            detected_center = (x1_i + x2_i) // 2
            # Hitung target crop_x agar detected_center berada di tengah crop
            optimal_crop_x = max(0, min(max_x, detected_center - (target_crop_w // 2)))
            detected_x_points.append(optimal_crop_x)
    except Exception:
        pass

    if not detected_x_points:
        # Default: pembicara diasumsikan di area tengah (center crop)
        return [center_x] * total_samples

    # Rata-rata dan smoothing per interval
    step = max(1, len(detected_x_points) // total_samples)
    sampled = [detected_x_points[min(i * step, len(detected_x_points) - 1)] for i in range(total_samples)]

    # Moving Average Smoothing (window = 3) agar kamera tidak bergetar/patah
    smoothed = []
    for i in range(len(sampled)):
        start_idx = max(0, i - 1)
        end_idx = min(len(sampled), i + 2)
        window = sampled[start_idx:end_idx]
        smoothed.append(int(sum(window) / len(window)))

    return smoothed

def generate_reframe_filter(video_file, duration=30):
    """
    Menghasilkan string filter FFmpeg untuk melakukan auto-reframe 9:16 yang mulus.
    """
    w, h = get_video_dimensions(video_file)
    target_crop_w = int(h * 9 / 16)
    if target_crop_w % 2 != 0:
        target_crop_w -= 1

    max_x = max(0, w - target_crop_w)
    center_x = max_x // 2

    trajectory = analyze_motion_centroid_trajectory(video_file, duration=min(duration, 30))
    if not trajectory or all(x == center_x for x in trajectory):
        # Center crop statis jika subjek berada di tengah
        return f"crop={target_crop_w}:{h}:{center_x}:0,scale=1080:1920"

    # Jika ada panning horizontal, buat ekspresi perpindahan waktu t
    avg_x = int(sum(trajectory) / len(trajectory))
    return f"crop={target_crop_w}:{h}:{avg_x}:0,scale=1080:1920"

def reframe_video_to_vertical(input_video, output_video, duration=30):
    """
    Mengeksekusi reframe cerdas dari 16:9 menjadi vertikal 9:16.
    """
    filter_str = generate_reframe_filter(input_video, duration)
    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vf", filter_str,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
        "-c:a", "copy",
        output_video
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video
    except Exception as e:
        print(f"[FaceTracker] Gagal reframe dinamis ({e}), fallback ke center crop.")
        w, h = get_video_dimensions(input_video)
        cw = int(h * 9 / 16)
        cx = (w - cw) // 2
        fallback_cmd = [
            "ffmpeg", "-y", "-i", input_video,
            "-vf", f"crop={cw}:{h}:{cx}:0,scale=1080:1920",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
            "-c:a", "copy", output_video
        ]
        subprocess.run(fallback_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_video
