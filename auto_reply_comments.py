#!/usr/bin/env python3
"""
Auto Reply Comment Bot untuk Content Trend Intelligence
Balas komentar otomatis di YouTube Shorts dan Instagram Reels.
Jalankan sebagai cron job tiap 15 menit.
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, '/opt/content-trend')
os.environ.setdefault('PATH', '/usr/bin:/usr/local/bin:/home/ubuntu/.local/bin')

from dotenv import load_dotenv
load_dotenv('/opt/content-trend/.env')

# Direktori
DATA_DIR = Path("/opt/content-trend/data")
LOG_FILE = DATA_DIR / "comment_reply_log.json"
REPLIED_COMMENTS_FILE = DATA_DIR / "replied_comments.json"

# Credentials
YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
IG_USERNAME = os.environ.get("IG_USERNAME", "")
IG_PASSWORD = os.environ.get("IG_PASSWORD", "")
INSTAGRAM_CLIENT_ID = os.environ.get("INSTAGRAM_CLIENT_ID", "")
INSTAGRAM_CLIENT_SECRET = os.environ.get("INSTAGRAM_CLIENT_SECRET", "")
FACEBOOK_APP_ID = os.environ.get("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET", "")


def load_json(path, default):
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return default
    return default


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_log():
    return load_json(LOG_FILE, [])


def save_log(logs):
    save_json(LOG_FILE, logs)


def load_replied():
    return load_json(REPLIED_COMMENTS_FILE, {})


def save_replied(replied):
    save_json(REPLIED_COMMENTS_FILE, replied)


# ============================================================================
# REPLY TEMPLATES
# ============================================================================

REPLY_TEMPLATES = {
    "youtube": [
        "Terima kasih telah menonton! 😊 Jangan lupa like dan subscribe untuk update video terbaru!",
        "Makasih banget buat supportnya! 🙏 Video baru tiap hari, stay tuned!",
        "Terima kasih ya! ❤️ Comentar pendapat kalian soal video ini!",
        "Makasih sudah nonton! 🔥 Share ke teman-teman yang suka konten kaya gini!",
        "Terima kasih supportnya! 💪 Aktifin lonceng notifikasi biar nggak ketinggalan video baru!",
    ],
    "instagram": [
        "Terima kasih ya! ❤️ Follow buat konten baru tiap hari!",
        "Makasih banget supportnya! 🙏 Share ke story ya!",
        "Terima kasih telah menonton! 😊 Comentar pendapat kalian!",
        "Makasih sudah nonton! 🔥 Follow buat update terbaru!",
        "Terima kasih supportnya! 💪 Aktifin notifikasi biar nggak ketinggalan!",
    ],
    "generic": [
        "Terima kasih ya! ❤️",
        "Makasih banget! 🙏",
        "Terima kasih telah menonton! 😊",
        "Makasih sudah nonton! 🔥",
        "Terima kasih supportnya! 💪",
    ]
}

import random


def get_reply_template(platform="generic", comment_text=""):
    """Pilih template reply yang relevan."""
    templates = REPLY_TEMPLATES.get(platform, REPLY_TEMPLATES["generic"])
    
    # Cek keyword spesifik untuk reply yang lebih personal
    comment_lower = comment_text.lower()
    if any(kw in comment_lower for kw in ["mantap", "keren", "bagus", "hebat", "top"]):
        templates = [
            "Makasih banget! 🙏 Seneng banget kalian suka!",
            "Terima kasih ya! ❤️ Semoga bermanfaat!",
            "Makasih supportnya! 💪 Konten baru tiap hari!",
        ]
    elif any(kw in comment_lower for kw in ["nangis", "sedih", "emosi", "merinding"]):
        templates = [
            "Iya kan? 😭 Momennya bikin emosi banget!",
            "Terima kasih ya! ❤️ Video ini bikin nangis beneran!",
            "Makasih sudah nonton! 😭 Share kalian yang nonton!",
        ]
    elif any(kw in comment_lower for kw in ["lucu", "ngakak", "komedi", "banget"]):
        templates = [
            "Haha iya! 😂 Lucu banget kan?",
            "Makasih ya! ❤️ Seneng kalian senyum!",
            "Terima kasih supportnya! 💪 Konten lucu lagi datang!",
        ]
    
    return random.choice(templates)


# ============================================================================
# YOUTUBE API
# ============================================================================

def get_youtube_service():
    """Buat YouTube API service menggunakan OAuth2 atau API Key."""
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        
        # Coba load token yang sudah disimpan
        token_file = DATA_DIR / "youtube_token.json"
        if token_file.exists():
            try:
                with open(token_file, "r") as f:
                    token_data = json.load(f)
                creds = Credentials.from_authorized_user_info(token_data)
                if creds and creds.valid:
                    return build("youtube", "v3", credentials=creds)
            except Exception:
                pass
        
        # Fallback: hanya API Key (read-only, tidak bisa reply)
        if YOUTUBE_API_KEY:
            return build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        
        return None
    except ImportError:
        print("⚠️  google-api-python-client tidak terinstall")
        return None


def reply_youtube_comment(comment_id, reply_text, youtube_service):
    """Balas komentar YouTube."""
    try:
        youtube_service.comments().insert(
            part="snippet",
            body={
                "snippet": {
                    "parentId": comment_id,
                    "textOriginal": reply_text
                }
            }
        ).execute()
        return True
    except Exception as e:
        print(f"❌ Gagal balas komentar YouTube: {e}")
        return False


def get_youtube_comments(youtube_service, video_id, max_results=50):
    """Ambil komentar terbaru dari video YouTube."""
    try:
        request = youtube_service.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=max_results,
            order="time",
            textFormat="plainText"
        )
        response = request.execute()
        
        comments = []
        for item in response.get("items", []):
            snippet = item["snippet"]["topLevelComment"]["snippet"]
            comments.append({
                "comment_id": item["id"],
                "author": snippet.get("authorDisplayName", "Unknown"),
                "text": snippet.get("textOriginal", ""),
                "published_at": snippet.get("publishedAt", ""),
                "video_id": video_id
            })
        return comments
    except Exception as e:
        print(f"❌ Gagal ambil komentar YouTube: {e}")
        return []


# ============================================================================
# INSTAGRAM (Facebook Graph API)
# ============================================================================

def get_instagram_access_token():
    """Dapatkan access token Instagram melalui Facebook Graph API."""
    # Butuh OAuth flow yang kompleks - placeholder untuk sekarang
    # User perlu complete OAuth flow manual sekali
    token_file = DATA_DIR / "instagram_token.json"
    if token_file.exists():
        try:
            with open(token_file, "r") as f:
                return json.load(f).get("access_token")
        except Exception:
            pass
    return None


def reply_instagram_comment(comment_id, reply_text, access_token):
    """Balas komentar Instagram melalui Graph API."""
    try:
        import requests
        url = f"https://graph.facebook.com/v18.0/{comment_id}/replies"
        data = {
            "message": reply_text,
            "access_token": access_token
        }
        response = requests.post(url, data=data, timeout=10)
        if response.status_code == 200:
            return True
        else:
            print(f"❌ Gagal balas komentar IG: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Gagal balas komentar IG: {e}")
        return False


def get_instagram_comments(access_token, ig_media_id, max_results=50):
    """Ambil komentar Instagram."""
    try:
        import requests
        url = f"https://graph.facebook.com/v18.0/{ig_media_id}/comments"
        params = {
            "access_token": access_token,
            "limit": max_results,
            "fields": "id,text,username,timestamp"
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            comments = []
            for item in data.get("data", []):
                comments.append({
                    "comment_id": item.get("id", ""),
                    "author": item.get("username", "Unknown"),
                    "text": item.get("text", ""),
                    "published_at": item.get("timestamp", ""),
                    "media_id": ig_media_id
                })
            return comments
        else:
            print(f"❌ Gagal ambil komentar IG: {response.text}")
            return []
    except Exception as e:
        print(f"❌ Gagal ambil komentar IG: {e}")
        return []


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("🤖 Memulai Auto Reply Comment Bot...")
    
    logs = load_log()
    replied = load_replied()
    
    new_logs = []
    replied_count = 0
    
    # ========================================================================
    # YOUTUBE
    # ========================================================================
    youtube_service = get_youtube_service()
    
    if youtube_service:
        print("📺 YouTube service aktif")
        
        # Cek apakah token OAuth valid atau cuma API Key (read-only)
        token_file = DATA_DIR / "youtube_token.json"
        has_oauth = token_file.exists()
        
        if not has_oauth:
            print("  ⚠️  YouTube butuh OAuth token untuk balas komentar. API Key cuma read-only.")
            print("  📋 Jalankan setup OAuth dulu (lihat SETUP_GUIDE.md)")
        else:
            print("  ✅ OAuth token tersedia, siap balas komentar")
            
            # Ambil video ID dari clip jobs
            clip_jobs_file = DATA_DIR / "clip_jobs.json"
            if clip_jobs_file.exists():
                try:
                    with open(clip_jobs_file, "r", encoding="utf-8") as f:
                        jobs = json.load(f)
                
                    for job in jobs:
                        source_url = job.get("sourceUrl", "")
                        video_id = None
                    
                        # Extract video ID from YouTube URL
                        if "youtube.com/watch?v=" in source_url:
                            video_id = source_url.split("v=")[1].split("&")[0]
                        elif "youtu.be/" in source_url:
                            video_id = source_url.split("youtu.be/")[1].split("?")[0]
                    
                        if not video_id:
                            continue
                    
                        print(f"🔍 Mengecek komentar YouTube: {video_id}")
                    
                        try:
                            comments = get_youtube_comments(youtube_service, video_id)
                        
                            for comment in comments:
                                comment_id = comment["comment_id"]
                            
                                if comment_id in replied:
                                    continue
                            
                                reply_text = get_reply_template("youtube", comment["text"])
                            
                                if reply_youtube_comment(comment_id, reply_text, youtube_service):
                                    replied[comment_id] = {
                                        "platform": "youtube",
                                        "video_id": video_id,
                                        "author": comment["author"],
                                        "text": comment["text"],
                                        "reply": reply_text,
                                        "replied_at": datetime.now().isoformat()
                                    }
                                    replied_count += 1
                                    print(f"  ✅ Balas komentar dari {comment['author']}: {reply_text[:30]}...")
                                
                                    new_logs.append({
                                        "platform": "youtube",
                                        "comment_id": comment_id,
                                        "author": comment["author"],
                                        "video_id": video_id,
                                        "reply": reply_text,
                                        "timestamp": datetime.now().isoformat(),
                                        "status": "success"
                                    })
                                else:
                                    new_logs.append({
                                        "platform": "youtube",
                                        "comment_id": comment_id,
                                        "author": comment["author"],
                                        "video_id": video_id,
                                        "reply": reply_text,
                                        "timestamp": datetime.now().isoformat(),
                                        "status": "failed"
                                    })
                        except Exception as e:
                            print(f"  ⚠️  YouTube comment access error: {e}")
                except Exception as e:
                    print(f"❌ Error memproses YouTube: {e}")
    else:
        print("⚠️  YouTube service tidak aktif (butuh google-api-python-client)")
    
    # ========================================================================
    # INSTAGRAM
    # ========================================================================
    ig_token = get_instagram_access_token()
    
    if ig_token:
        print("📸 Instagram service aktif")
        
        # Ambil media ID dari clip jobs (butuh mapping video -> IG media ID)
        # Untuk sekarang, user perlu input IG media ID manual atau lewat dashboard
        print("  📝 Butuh IG Media ID untuk membaca komentar (setup manual)")
    else:
        print("⚠️  Instagram service tidak aktif (butuh access token)")
    
    # Simpan log dan replied comments
    save_log(logs + new_logs)
    save_replied(replied)
    
    print(f"✅ Selesai! {replied_count} komentar dibalas")
    
    return replied_count


if __name__ == "__main__":
    main()
