import os
import subprocess
import json
import time
from datetime import datetime
from dotenv import load_dotenv
import warnings

warnings.filterwarnings("ignore")

load_dotenv(dotenv_path="content-trend-intelligence/.env")

# ==========================================
# CONFIGURATION & API KEYS
# ==========================================
AI_API_KEY = os.environ.get("AI_API_KEY", "")
# Untuk Fase 4 (Auto-Publish) kita butuh OAuth JSON file, biasanya disimpan di folder creds/
YOUTUBE_CLIENT_SECRETS_FILE = "client_secret.json" 

def log(msg):
    timestamp = datetime.now().strftime('%H:%M:%S')
    log_msg = f"[{timestamp}] {msg}"
    print(log_msg)
    # Also log to a file so we can read it from sandbox
    with open("clipper_debug.log", "a", encoding="utf-8") as f:
        f.write(log_msg + "\n")

DEFAULT_APP_SETTINGS = {
    "autoScrapeEnabled": True,
    "scrapeIntervalHours": 3,
    "defaultRegion": "ID",
    "maxTrendingResults": 30,
    "subtitleTheme": "hormozi_yellow",
    "watermarkText": "",
    "showProgressBar": True,
    "showTopHook": True,
    "showSubtitles": True,
    "captionTemplate": "{title}\n\n🔥 {hook}\n\n👇 Tonton video lengkapnya di channel kami!\n\n{hashtags}",
    "defaultHashtags": "#shorts #reels #viral #trending #podcastindonesia",
    "targetDurationMin": 30,
    "targetDurationMax": 50,
    "webhookType": "none",
    "webhookUrl": ""
}

def get_app_settings():
    settings = dict(DEFAULT_APP_SETTINGS)
    candidates = [
        "data/settings.json",
        "content-trend-intelligence/data/settings.json",
        os.path.join(os.path.dirname(__file__), "data", "settings.json"),
        os.path.join(os.path.dirname(__file__), "content-trend-intelligence", "data", "settings.json")
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                with open(c, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        settings.update(data)
                        return settings
            except Exception:
                pass
    return settings

# ==========================================
# FASE 1: DOWNLOAD & POTONG VIDEO DASAR
# ==========================================
def download_and_cut(url, start_time, end_time, output_filename="raw_clip.mp4"):
    log(f"Fase 1: Mendownload full video {url} (720p)...")
    
    # 1. Download full video cepat (720p)
    full_video = "temp_full_video.mp4"
    command_dl = [
        "yt-dlp",
        "-q", "--no-warnings", "--force-overwrites",
        "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", full_video,
        url
    ]
    
    try:
        subprocess.run(command_dl, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL, text=True)
    except subprocess.CalledProcessError as e:
        log(f"yt-dlp error: {e.stderr}")
        raise
        
    log(f"Fase 1: Memotong bagian {start_time} - {end_time}...")
    # 2. Potong secara lokal menggunakan ffmpeg
    command_cut = [
        "ffmpeg", "-y",
        "-i", full_video,
        "-ss", start_time,
        "-to", end_time,
        "-c", "copy",
        output_filename
    ]
    subprocess.run(command_cut, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
    
    # Cleanup
    if os.path.exists(full_video):
        os.remove(full_video)
        
    log(f"Fase 1 Selesai: Tersimpan di {output_filename}")
    return output_filename

def download_audio_only(url, output_filename="full_audio.m4a"):
    log(f"Mendownload audio penuh, lalu memotong 2 menit awal untuk AI testing...")
    temp_audio = "temp_full_audio.m4a"
    command = [
        "yt-dlp",
        "-q", "--no-warnings", "--force-overwrites",
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "-o", temp_audio,
        url
    ]
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL, text=True)
    except subprocess.CalledProcessError as e:
        log(f"yt-dlp error (audio): {e.stderr}")
        raise
        
    # Potong 2 menit awal secara lokal agar Whisper tidak CPU overload
    command_cut = [
        "ffmpeg", "-y",
        "-i", temp_audio,
        "-t", "00:02:00",
        "-c", "copy",
        output_filename
    ]
    subprocess.run(command_cut, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
    
    if os.path.exists(temp_audio):
        os.remove(temp_audio)
        
    return output_filename

# ==========================================
# FASE 2: INTELLIGENCE (WHISPER & GEMINI)
# ==========================================
def analyze_with_ai(audio_file, settings=None):
    if settings is None:
        settings = get_app_settings()

    target_min = int(settings.get("targetDurationMin", 30))
    target_max = int(settings.get("targetDurationMax", 50))

    log("Fase 2: Menjalankan Whisper untuk Transkripsi...")
    whisper_segments = []
    try:
        import whisper
        # Gunakan model 'base' untuk transkripsi cepat dengan segment timestamps
        model = whisper.load_model("base")
        result = model.transcribe(audio_file)
        transcript_text = result["text"]
        whisper_segments = result.get("segments", [])
    except ImportError:
        log("⚠️ Whisper belum terinstall. Menggunakan simulasi teks...")
        transcript_text = "Ini adalah simulasi teks transkripsi dari video podcast dr. Tirta tentang bahaya begadang. Begadang itu sangat merusak fungsi hati dan ginjal."

    log(f"Fase 2: Mengirim transkrip ke AI untuk mencari momen viral ({target_min}-{target_max}s) & hook penasaran...")
    try:
        import google.generativeai as genai
        if not AI_API_KEY:
            raise ValueError("AI_API_KEY tidak ditemukan")
        
        genai.configure(api_key=AI_API_KEY)
        model = genai.GenerativeModel('gemini-3.6-flash')
        prompt = f"""
        Anda adalah Master Editor Video Pendek Viral (TikTok, Instagram Reels, YouTube Shorts) dengan spesialisasi Retensi Penonton Tinggi (Audience Retention & Anti-Skip Hook).
        
        Tugas Anda:
        1. Analisis transkrip audio berikut dan temukan 1 momen PALING MENARIK / MENGAGETKAN / KONTROVERSIAL / LUCU / EDUKATIF yang berdurasi antara {target_min} hingga {target_max} detik.
        2. Buat "Hook Penasaran Ekstrem" (Curiosity Gap) untuk ditampilkan di bagian atas video agar penonton TERPAKU dan TIDAK SKIP sampai detik terakhir:
           - "badge": Urgency / Retention trigger pendek (2-4 kata dengan emoji). Contoh pilihan: "⚠️ JANGAN DISKIP! ⚠️", "🚨 DETIK AKHIR BIKIN SYOK! 🚨", "🔥 GILA BANGET! 🔥", "⚠️ PERINGATAN KERAS! ⚠️", "🤯 BANYAK YANG GAK TAU! 🤯"
           - "hook": Kalimat penasaran / cliffhanger / pertanyaan provokatif (5-8 kata saja). HARUS bikin orang penasaran ingin tahu jawabannya atau reaksi lanjutannya.
             JANGAN gunakan judul datar seperti "Dr Tirta Bicara Soal X".
             Gunakan gaya viral yang memaksa orang nonton, contoh:
             * "DITANTANG BEGINI, REAKSI DR. TIRTA BIKIN KAGET!"
             * "TERNYATA SELAMA INI KITA SEMUA DIBOHONGI?!"
             * "JANGAN LAKUKAN INI KALAU MAU GINJAL SELAMAT!"
             * "DETIK KE-30 BIKIN SEMUA ORANG TERDIAM..."
            - "title": Judul video untuk caption postingan YouTube Shorts / Instagram Reels (menarik & dilengkapi hashtag).
            - "tags": Array 10-15 kata kunci pencarian YouTube spesifik tentang topik/tokoh klip ini (huruf kecil, tanpa tanda #).
            - "hashtags": Array 5-8 hashtag spesifik topik konten diawali tanda # (contoh: ["#drtirta", "#kesehatan", ...]).
        
        Kembalikan output murni HANYA dalam format JSON valid (tanpa markdown ```json, tanpa teks pengantar):
        {{
          "start": "00:00:15",
          "end": "00:00:55",
          "badge": "⚠️ JANGAN DISKIP! ⚠️",
          "hook": "DITANTANG BEGINI, REAKSI DR. TIRTA BIKIN KAGET!",
          "title": "Reaksi Tak Terduga Dr. Tirta Saat Ditantang Peragakan Konten Viral!",
          "tags": ["dr tirta", "reaksi dr tirta", "konten viral", "podcast indonesia", "kesehatan", "edukasi"],
          "hashtags": ["#drtirta", "#podcastindonesia", "#kontenviral", "#reaksidrtirta"]
        }}
        
        Transkrip:
        {transcript_text[:15000]}
        """
        response = model.generate_content(prompt)
        
        import json
        import re
        raw_json = re.sub(r'```json|```', '', response.text).strip()
        best_moment = json.loads(raw_json)
        if "badge" not in best_moment:
            best_moment["badge"] = "⚠️ JANGAN DISKIP! ⚠️"
        if "hook" not in best_moment:
            best_moment["hook"] = best_moment.get("title", "MOMEN VIRAL PILIHAN")
        if "tags" not in best_moment or not isinstance(best_moment["tags"], list):
            best_moment["tags"] = ["podcast indonesia", "viral", "shorts", "reels"]
        if "hashtags" not in best_moment or not isinstance(best_moment["hashtags"], list):
            best_moment["hashtags"] = ["#viral", "#shorts", "#reels"]
        
    except Exception as e:
        log(f"⚠️ Gagal memanggil AI ({str(e)}). Menggunakan simulasi momen...")
        best_moment = {
            "start": "00:00:15",
            "end": "00:00:55",
            "badge": "⚠️ JANGAN DISKIP! ⚠️",
            "hook": "DITANTANG BEGINI, REAKSI DR. TIRTA BIKIN KAGET!",
            "title": "Reaksi Tak Terduga Dr. Tirta Saat Ditantang Peragakan Konten Viral!",
            "tags": ["dr tirta", "reaksi dr tirta", "konten viral", "podcast indonesia", "tips sehat", "shorts", "reels"],
            "hashtags": ["#drtirta", "#reaksidrtirta", "#podcastindonesia", "#kontenviral", "#shorts", "#reels"]
        }
        
    best_moment["segments"] = whisper_segments
    log(f"Momen ditemukan AI: '{best_moment.get('title')}' [{best_moment.get('badge')}: {best_moment.get('hook')}] dari menit {best_moment.get('start')} - {best_moment.get('end')}")
    return best_moment

# ==========================================
# FASE 3: VIDEO POLISH (SMART CROP, HOOK TITLE, AUTO SUBTITLE & PROGRESS BAR)
# ==========================================
def get_video_duration(video_file):
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_file
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=True)
        return float(res.stdout.strip())
    except Exception:
        return 40.0

def parse_time_str(t_str):
    parts = str(t_str).strip().split(":")
    if len(parts) == 3:
        h, m, s = parts
        return float(h)*3600 + float(m)*60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return float(m)*60 + float(s)
    try:
        return float(t_str)
    except Exception:
        return 0.0

def format_ass_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def download_youtube_subtitles(url, temp_prefix="temp_yt_sub"):
    log("Fase 3: Mengambil subtitle bahasa Indonesia dari video YouTube...")
    try:
        cmd = [
            "yt-dlp",
            "-q", "--no-warnings", "--force-overwrites",
            "--write-auto-sub",
            "--sub-lang", "id,en",
            "--skip-download",
            "-o", temp_prefix,
            url
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
        for ext in [".id.vtt", ".id.srv3", ".vtt", ".en.vtt"]:
            target = f"{temp_prefix}{ext}"
            if os.path.exists(target):
                log(f"Subtitle ditemukan: {target}")
                return target
    except Exception as e:
        log(f"⚠️ Gagal download subtitle otomatis: {e}")
    return None

import textwrap

def format_hook_lines(hook_text, max_chars_per_line=22, max_lines=2):
    """
    Memformat hook teks agar otomatis ter-wrap dengan rapi,
    maksimal 2 baris, dan TIDAK AKAN PERNAH terpotong di layar 1080px.
    """
    clean = (hook_text or "").strip().upper()
    clean = clean.replace('"', '').replace("'", '').replace("`", "")
    
    lines = textwrap.wrap(clean, width=max_chars_per_line)
    if not lines:
        return "MOMEN VIRAL PILIHAN"
    
    if len(lines) > max_lines:
        line1 = lines[0]
        remaining = " ".join(lines[1:])
        line2_wrapped = textwrap.wrap(remaining, width=max_chars_per_line)
        line2 = line2_wrapped[0] if line2_wrapped else remaining[:max_chars_per_line]
        lines = [line1, line2]
    
    return r"\N".join(lines)

def generate_ass_subtitles(vtt_file=None, whisper_segments=None, start_sec=0.0, end_sec=60.0, badge="⚠️ JANGAN DISKIP! ⚠️", hook="MOMEN VIRAL PILIHAN", duration=60.0, output_ass="clip_subtitles.ass", settings=None):
    if settings is None:
        settings = get_app_settings()

    subtitle_theme = settings.get("subtitleTheme", "hormozi_yellow")
    # Subtitle Theme Color map (BGR in ASS hex format: &HAABBGGRR&)
    theme_colors = {
        "hormozi_yellow": "&H0000FFFF&",  # Kuning Hormozi
        "neon_green": "&H0000FF00&",      # Hijau Neon
        "clean_white": "&H00FFFFFF&"      # Putih Bersih
    }
    sub_color = theme_colors.get(subtitle_theme, "&H0000FFFF&")

    watermark_text = settings.get("watermarkText", "").strip()
    show_top_hook = settings.get("showTopHook", True)
    show_subtitles = settings.get("showSubtitles", True)

    log(f"Fase 3: Mengolah Hook Banner & Subtitle (Theme: {subtitle_theme}, Hook: {show_top_hook}, Subs: {show_subtitles}, Watermark: '{watermark_text}')...")
    import re
    
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HookBadge,DejaVu Sans,34,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,3,10,0,8,40,40,240,1
Style: HookTitle,DejaVu Sans,48,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,3,8,60,60,310,1
Style: Subtitle,DejaVu Sans,48,{sub_color},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,60,60,340,1
Style: Watermark,DejaVu Sans,26,&H80FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,9,40,40,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    clean_badge = (badge or "⚠️ JANGAN DISKIP! ⚠️").strip().upper().replace("{", "").replace("}", "")
    wrapped_hook = format_hook_lines(hook)
    duration_str = format_ass_time(duration)

    events_str = ""
    # 0. Watermark jika ada (Alignment 9 = Top-Right)
    if watermark_text:
        clean_watermark = watermark_text.replace("{", "").replace("}", "")
        events_str += f"Dialogue: 0,0:00:00.00,{duration_str},Watermark,,0,0,0,,{clean_watermark}\n"

    # 1. Hook Badge & Title selalu tampil di atas jika show_top_hook
    if show_top_hook:
        events_str += f"Dialogue: 0,0:00:00.00,{duration_str},HookBadge,,0,0,0,,{clean_badge}\n"
        events_str += f"Dialogue: 0,0:00:00.00,{duration_str},HookTitle,,0,0,0,,{wrapped_hook}\n"

    # 2. Subtitle Dialog (Hanya jika show_subtitles diaktifkan)
    if show_subtitles:
        dialog_cues = []
        if vtt_file and os.path.exists(vtt_file):
            try:
                with open(vtt_file, "r", encoding="utf-8") as f:
                    content = f.read()

                blocks = re.findall(r"(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})[^\n]*\n(.*?)(?=\n\n|\n\d{2}:|\Z)", content, re.DOTALL)
                for start_str, end_str, text_raw in blocks:
                    s_val = parse_time_str(start_str)
                    e_val = parse_time_str(end_str)
                    if e_val < start_sec or s_val > end_sec:
                        continue
                    if (e_val - s_val) < 0.25:
                        continue
                    clean_text = re.sub(r"<[^>]+>", "", text_raw)
                    clean_text = re.sub(r"\[[^\]]+\]", "", clean_text).strip()
                    clean_text = " ".join(clean_text.split())
                    if not clean_text:
                        continue
                    rel_start = max(0.0, s_val - start_sec)
                    rel_end = min(end_sec - start_sec, e_val - start_sec)
                    lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
                    final_text = lines[-1] if lines else clean_text
                    dialog_cues.append([rel_start, rel_end, final_text.upper()])
            except Exception as e:
                log(f"⚠️ Gagal parse VTT: {e}")

        # Fallback ke whisper_segments jika vtt kosong
        if not dialog_cues and whisper_segments:
            for seg in whisper_segments:
                s_val = seg.get("start", 0.0)
                e_val = seg.get("end", 0.0)
                text_val = seg.get("text", "").strip()
                if e_val < start_sec or s_val > end_sec:
                    continue
                if not text_val:
                    continue
                rel_start = max(0.0, s_val - start_sec)
                rel_end = min(end_sec - start_sec, e_val - start_sec)
                dialog_cues.append([rel_start, rel_end, text_val.upper()])

        # Deduplicate cues
        results = []
        for cue in dialog_cues:
            if results and results[-1][2] == cue[2]:
                results[-1][1] = max(results[-1][1], cue[1])
            else:
                results.append(cue)

        for r in results:
            s_str = format_ass_time(r[0])
            e_str = format_ass_time(r[1])
            txt = r[2].replace("{", "").replace("}", "")
            events_str += f"Dialogue: 0,{s_str},{e_str},Subtitle,,0,0,0,,{txt}\n"

    try:
        with open(output_ass, "w", encoding="utf-8") as f:
            f.write(ass_header + events_str)
        log(f"Fase 3: ASS subtitle file berhasil dibuat di {output_ass}!")
        return output_ass
    except Exception as e:
        log(f"⚠️ Gagal simpan ASS: {e}")
        return None

def polish_video(input_video, output_video="final_vertical.mp4", ass_subtitle_file=None, settings=None):
    if settings is None:
        settings = get_app_settings()

    show_progress_bar = settings.get("showProgressBar", True)
    log(f"Fase 3: Mengubah format ke vertikal (9:16) + Blur Background (ProgressBar: {show_progress_bar})...")
    
    duration = get_video_duration(input_video)
    
    # 1. Base Blur 9:16 + Overlay Center Video
    filter_parts = [
        "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg]",
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:20[bg]",
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[base]"
    ]
    
    # 2. Dynamic Bottom Red Progress Bar (hanya jika diaktifkan)
    if show_progress_bar:
        enhancement_filter = (
            f"[base]drawbox=x=0:y=1905:w=1080:h=15:color=black@0.6:t=fill,"
            f"drawbox=x=0:y=1905:w='1080*(t/{duration})':h=15:color=red@0.95:t=fill"
        )
        if ass_subtitle_file and os.path.exists(ass_subtitle_file):
            filter_complex = f"{';'.join(filter_parts)};{enhancement_filter},ass={ass_subtitle_file}[outv]"
        else:
            filter_complex = f"{';'.join(filter_parts)};{enhancement_filter}[outv]"
    else:
        if ass_subtitle_file and os.path.exists(ass_subtitle_file):
            filter_complex = f"{';'.join(filter_parts)};[base]ass={ass_subtitle_file}[outv]"
        else:
            filter_complex = f"{';'.join(filter_parts)};[base]null[outv]"
    
    command = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "copy",
        output_video
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
    log(f"Fase 3 Selesai: Video vertikal High-Retention tersimpan di {output_video}")
    return output_video

# ==========================================
# FASE 4: ROUTING & AUTO-PUBLISH (YOUTUBE, IG, TIKTOK)
# ==========================================
def upload_to_youtube(video_file, title):
    log("-> Uploading ke YouTube Shorts...")
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        import pickle

        if not os.path.exists(YOUTUBE_CLIENT_SECRETS_FILE):
            log(f"⚠️ File {YOUTUBE_CLIENT_SECRETS_FILE} tidak ditemukan. Harus unduh dari Google Cloud Console. Simulasi sukses.")
            return

        SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
        creds = None
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                creds = pickle.load(token)
                
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(YOUTUBE_CLIENT_SECRETS_FILE, SCOPES)
                creds = flow.run_local_server(port=0)
            with open('token.pickle', 'wb') as token:
                pickle.dump(creds, token)
                
        youtube = build('youtube', 'v3', credentials=creds)
        request_body = {
            'snippet': {'title': title, 'description': title + " #shorts #podcast", 'categoryId': '22'},
            'status': {'privacyStatus': 'public', 'selfDeclaredMadeForKids': False}
        }
        
        mediaFile = MediaFileUpload(video_file, chunksize=-1, resumable=True)
        response_upload = youtube.videos().insert(part='snippet,status', body=request_body, media_body=mediaFile).execute()
        log(f"✅ Berhasil upload YouTube! ID: {response_upload.get('id')}")
    except ImportError:
        log("⚠️ Library google-api-python-client belum di-install (pip install google-api-python-client google-auth-oauthlib). Simulasi sukses.")
    except Exception as e:
        log(f"❌ Gagal YouTube: {str(e)}")

def upload_to_instagram(video_file, title):
    log("-> Uploading ke Instagram Reels...")
    try:
        from instagrapi import Client
        cl = Client()
        IG_USERNAME = os.environ.get("IG_USERNAME")
        IG_PASSWORD = os.environ.get("IG_PASSWORD")
        
        if not IG_USERNAME or not IG_PASSWORD:
            log("⚠️ IG_USERNAME & IG_PASSWORD belum diset di .env. Simulasi sukses.")
            return
            
        cl.login(IG_USERNAME, IG_PASSWORD)
        cl.clip_upload(video_file, title + " #reels", extra_data={"custom_accessibility_caption": title})
        log("✅ Berhasil upload ke Instagram!")
    except ImportError:
        log("⚠️ Library instagrapi belum di-install (pip install instagrapi). Simulasi sukses.")
    except Exception as e:
        log(f"❌ Gagal IG: {str(e)}")

def upload_to_tiktok(video_file, title):
    log("-> Uploading ke TikTok...")
    try:
        from tiktok_uploader.upload import upload_video
        cookies_path = "tiktok_cookies.txt"
        
        if not os.path.exists(cookies_path):
            log("⚠️ tiktok_cookies.txt belum ada. Anda butuh ekstensi Get cookies.txt. Simulasi sukses.")
            return

        upload_video(video_file, description=title + " #fyp", cookies=cookies_path, headless=True)
        log("✅ Berhasil upload ke TikTok!")
    except ImportError:
        log("⚠️ Library tiktok-uploader belum di-install (pip install tiktok-uploader). Simulasi sukses.")
    except Exception as e:
        log(f"❌ Gagal TikTok: {str(e)}")

def publish_to_social_media(video_file, title, profile_id):
    log(f"Fase 4: Mengupload video '{title}' ke sosmed (Profile {profile_id})")
    
    upload_to_youtube(video_file, title)
    upload_to_instagram(video_file, title)
    upload_to_tiktok(video_file, title)
    
    log("Fase 4 Selesai: Proses Publikasi Selesai!")

# ==========================================
# FASE 5: MASTER PIPELINE (OTOMATISASI PENUH)
# ==========================================
def run_full_automation(youtube_url, profile_id=1):
    print("\n" + "="*50)
    print("🚀 MEMULAI PIPELINE AI CLIPPER OTOMATIS")
    print("="*50)
    
    try:
        # 1. Bersihkan file sementara sebelumnya agar tidak tertimpa/tercampur
        for temp_f in ["temp_raw.mp4", "full_audio.m4a", "temp_full_video.mp4", "temp_full_audio.m4a"]:
            if os.path.exists(temp_f):
                try:
                    os.remove(temp_f)
                except Exception:
                    pass

        # 2. Buat nama file unik berdasarkan timestamp agar Meta Graph API tidak menggunakan cache lama
        timestamp = int(time.time())
        unique_filename = f"clip_{timestamp}.mp4"

        app_settings = get_app_settings()
        audio_file = download_audio_only(youtube_url)
        moment = analyze_with_ai(audio_file, settings=app_settings)
        raw_clip = download_and_cut(youtube_url, moment["start"], moment["end"], "temp_raw.mp4")
        
        output_dir = os.path.join("public", "clips")
        os.makedirs(output_dir, exist_ok=True)
        final_path = os.path.join(output_dir, unique_filename)
        fallback_path = os.path.join(output_dir, "final_ready_to_upload.mp4")

        # 3. FASE 3: POLISH VIDEO (Ubah 9:16 vertikal + blur background + Hook Badge + Hook Title + Subtitles + Progress Bar)
        vtt_file = download_youtube_subtitles(youtube_url, "temp_yt_sub")
        start_sec = parse_time_str(moment.get("start", "00:00:15"))
        end_sec = parse_time_str(moment.get("end", "00:00:55"))
        clip_duration = get_video_duration(raw_clip)
        
        ass_file = generate_ass_subtitles(
            vtt_file=vtt_file,
            whisper_segments=moment.get("segments"),
            start_sec=start_sec,
            end_sec=end_sec,
            badge=moment.get("badge", "⚠️ JANGAN DISKIP! ⚠️"),
            hook=moment.get("hook", moment.get("title", "MOMEN VIRAL")),
            duration=clip_duration,
            output_ass="temp_subtitles.ass",
            settings=app_settings
        )

        final_video = polish_video(
            raw_clip, 
            final_path, 
            ass_subtitle_file=ass_file,
            settings=app_settings
        )

        # Cleanup subtitle temps
        for sub_tmp in ["temp_subtitles.ass", "temp_yt_sub.id.vtt", "temp_yt_sub.en.vtt", "temp_yt_sub.vtt"]:
            if os.path.exists(sub_tmp):
                try:
                    os.remove(sub_tmp)
                except Exception:
                    pass

        # Salin juga ke fallback final_ready_to_upload.mp4
        import shutil
        shutil.copyfile(final_path, fallback_path)

        # 4. Simpan metadata klip ke data/last_clip.json agar langsung tampil di UI & persist saat refresh
        data_dir = "data"
        os.makedirs(data_dir, exist_ok=True)
        clip_meta = {
            "outputFile": f"/clips/{unique_filename}",
            "title": moment.get("title", "Momen Pilihan AI"),
            "badge": moment.get("badge", "⚠️ JANGAN DISKIP! ⚠️"),
            "hook": moment.get("hook", moment.get("title", "Momen Pilihan AI")),
            "tags": moment.get("tags", []),
            "hashtags": moment.get("hashtags", []),
            "startTime": moment.get("start", ""),
            "endTime": moment.get("end", ""),
            "sourceUrl": youtube_url,
            "updatedAt": datetime.now().isoformat(),
            "published": False,
            "publishedTo": []
        }
        with open(os.path.join(data_dir, "last_clip.json"), "w", encoding="utf-8") as f:
            json.dump(clip_meta, f, indent=2)
            
        log(f"Fase 4: Video baru ({unique_filename}) berhasil dipolish dan siap dipublish!")
        print(f"\n🎉 SEMUA FASE SELESAI. SISTEM BERHASIL BERJALAN OTOMATIS. File di: {final_path}")
        
    except Exception as e:
        log(f"❌ Terjadi kesalahan pada pipeline: {str(e)}")
        import sys
        sys.exit(1)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
    else:
        target_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    run_full_automation(target_url, profile_id=1)
