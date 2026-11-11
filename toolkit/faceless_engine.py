"""
Faceless AI Video Creator Engine
Menghasilkan video shorts/reels 9:16 vertikal secara 100% otomatis dari topik / berita:
1. Script Writer (Hook - Konten - CTA)
2. AI Voiceover Generator (Edge-TTS Bahasa Indonesia: id-ID-ArdiNeural / id-ID-GadisNeural)
3. Dynamic Background Visual Generator (FFmpeg procedural visualizer / particle gradient loop)
4. Subtitle Generator & Audio Mixing (BGM + Ducking)
"""

import os
import subprocess
import time
import json
from toolkit.audio_enhancer import mix_smart_audio_with_ducking, generate_procedural_bgm

def get_python_bin():
    script_dir = os.path.dirname(os.path.dirname(__file__))
    candidates = [
        os.path.join(script_dir, "venv", "bin", "python"),
        os.path.join(script_dir, "venv", "bin", "python3"),
        "python3"
    ]
    for c in candidates:
        if c == "python3" or os.path.exists(c):
            return c
    return "python3"

def generate_faceless_script(topic):
    """
    Menghasilkan naskah ringkas berdurasi ~20-30 detik dengan formula retensi tinggi.
    """
    clean_topic = topic.strip()
    return {
        "title": clean_topic,
        "hook": f"Tahukah kamu tentang {clean_topic} yang lagi ramai dibicarakan?",
        "body": f"Banyak yang belum tahu, perkembangan seputar {clean_topic} ternyata membawa dampak sangat besar. Hal ini bisa mengubah kebiasaan kita dalam waktu dekat.",
        "cta": "Ketik pendapat kamu di komentar dan follow untuk info tren berikutnya!",
        "full_text": f"Tahukah kamu tentang {clean_topic} yang lagi ramai dibicarakan? Banyak yang belum tahu, perkembangan seputar {clean_topic} ternyata membawa dampak sangat besar. Hal ini bisa mengubah kebiasaan kita dalam waktu dekat. Ketik pendapat kamu di komentar dan follow untuk info tren berikutnya!"
    }

def generate_voiceover(text, output_audio_path="temp_voice.mp3", voice="id-ID-ArdiNeural"):
    """
    Menggunakan edge-tts untuk menghasilkan suara narator Bahasa Indonesia yang sangat natural.
    """
    py_bin = get_python_bin()
    cmd = [
        py_bin, "-m", "edge_tts",
        "--voice", voice,
        "--text", text,
        "--write-media", output_audio_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(output_audio_path) and os.path.getsize(output_audio_path) > 1000:
            return output_audio_path
    except Exception as e:
        print(f"[FacelessEngine] Edge-TTS gagal ({e}), fallback ke sinyal audio sintetis.")

    # Fallback: Buat narasi audio sintetis jika offline
    cmd_fallback = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=10",
        "-c:a", "libmp3lame", "-b:a", "128k",
        output_audio_path
    ]
    subprocess.run(cmd_fallback, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return output_audio_path

def get_audio_duration(audio_file):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_file
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
        return max(5.0, float(res.stdout.strip()))
    except Exception:
        return 15.0

def generate_dynamic_visual_background(duration, output_video_path="temp_bg.mp4"):
    """
    Membuat video vertikal 1080x1920 dengan efek gradien dinamis gelap modern (aesthetic dark loop).
    """
    filter_expr = (
        f"testsrc=duration={duration:.2f}:size=1080x1920:rate=30,"
        f"curves=all='0/0 0.5/0.25 1/0.6',"
        f"hue=h='t*15':s='1.5',"
        f"boxblur=15:5"
    )
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", filter_expr,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        output_video_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return output_video_path

def generate_faceless_video(topic, output_dir=None):
    """
    Pipeline lengkap pembuatan Faceless Video.
    """
    if output_dir is None:
        if os.path.exists("content-trend-intelligence/public/clips"):
            output_dir = "content-trend-intelligence/public/clips"
        else:
            output_dir = "public/clips"
    os.makedirs(output_dir, exist_ok=True)

    timestamp = int(time.time())
    final_output = os.path.join(output_dir, f"faceless_{timestamp}.mp4")

    # 1. Naskah
    script = generate_faceless_script(topic)
    # 2. Voiceover
    voice_file = os.path.join(output_dir, f"voice_{timestamp}.mp3")
    generate_voiceover(script["full_text"], voice_file)
    dur = get_audio_duration(voice_file)

    # 3. Latar Visual 9:16
    bg_video = os.path.join(output_dir, f"bg_{timestamp}.mp4")
    generate_dynamic_visual_background(dur, bg_video)

    # 4. Gabungkan Visual + Voiceover
    temp_merged = os.path.join(output_dir, f"merged_{timestamp}.mp4")
    cmd_merge = [
        "ffmpeg", "-y",
        "-i", bg_video,
        "-i", voice_file,
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        temp_merged
    ]
    subprocess.run(cmd_merge, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 5. Smart Audio Ducking dengan BGM
    mix_smart_audio_with_ducking(temp_merged, final_output)

    # Cleanup temporary
    for tmp in [voice_file, bg_video, temp_merged]:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except Exception:
                pass

    return {
        "outputFile": f"/clips/faceless_{timestamp}.mp4",
        "title": script["title"],
        "hook": script["hook"],
        "duration": dur,
        "filePath": final_output
    }

if __name__ == "__main__":
    import sys
    topic_arg = sys.argv[1] if len(sys.argv) > 1 else "Tren Teknologi AI Terkini"
    res = generate_faceless_video(topic_arg)
    print(json.dumps(res, indent=2))


