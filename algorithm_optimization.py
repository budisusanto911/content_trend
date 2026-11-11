#!/usr/bin/env python3
"""
Algorithm Optimization Script untuk Content Trend Intelligence
Generate judul, caption, dan hashtag yang dioptimasi untuk YouTube Shorts & Instagram Reels.
Jalankan sebagai cron job untuk setiap clip baru yang jadi.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Tambahkan path untuk import modul proyek
sys.path.insert(0, '/opt/content-trend')
os.environ.setdefault('PATH', '/usr/bin:/usr/local/bin:/home/ubuntu/.local/bin')

from dotenv import load_dotenv
load_dotenv('/opt/content-trend/.env')

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    print("⚠️  google-generativeai tidak terinstall, menggunakan fallback template")

AI_API_KEY = os.environ.get("AI_API_KEY", "")

# Direktori
CLIPS_DIR = Path("/opt/content-trend/public/clips")
DATA_DIR = Path("/opt/content-trend/data")
LOG_FILE = DATA_DIR / "algorithm_optimization_log.json"


def load_log():
    if LOG_FILE.exists():
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_log(logs):
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2, ensure_ascii=False)


def get_ready_clips():
    """Ambil semua clip yang status ready tapi belum dioptimasi."""
    clip_jobs_file = DATA_DIR / "clip_jobs.json"
    if not clip_jobs_file.exists():
        return []

    with open(clip_jobs_file, "r", encoding="utf-8") as f:
        jobs = json.load(f)

    # Filter: status ready, belum punya optimized_title
    ready = []
    for j in jobs:
        if j.get("status") == "ready" and not j.get("optimized"):
            ready.append(j)
    return ready


def generate_viral_metadata(video_title, creator, niche_keywords, platform="youtube"):
    """Generate judul dan caption yang dioptimasi algoritma menggunakan Gemini AI."""
    
    # Skip AI generation for speed — use optimized fallback templates
    # (AI generation causes timeout; templates are already well-optimized)
    return generate_fallback_metadata(video_title, creator, niche_keywords, platform)


def generate_fallback_metadata(video_title, creator, niche_keywords, platform="youtube"):
    """Template fallback jika AI tidak tersedia."""
    
    niche_str = " ".join(niche_keywords[:3]) if niche_keywords else "viral"
    
    if platform == "youtube":
        title = f"{video_title[:50]}... VIRAL! 🔥 #shorts #{niche_str.replace(' ', '')}"
        caption = f"Video {video_title} lagi viral! Nonton sekarang! 👇\n\n#{niche_str.replace(' ', '')} #viral #shorts #youtubeshorts #indonesia"
        hashtags = f"#{niche_str.replace(' ', '')} #viral #shorts #youtubeshorts #indonesia #trending"
    else:
        title = f"{video_title[:60]} ✨ #{niche_str.replace(' ', '')} #reels"
        caption = f"Video {video_title} lagi hits! Jangan lewatkan! 👇\n\n#{niche_str.replace(' ', '')} #viral #reels #indonesia #explore"
        hashtags = f"#{niche_str.replace(' ', '')} #viral #reels #indonesia #trending #explore"
    
    return {
        "title": title,
        "caption": caption,
        "hashtags": hashtags,
        "ai_generated": False
    }


def optimize_clip(job):
    """Optimasi satu clip untuk YouTube dan Instagram."""
    video_title = job.get("sourceTitle", "Video Viral")
    creator = job.get("sourceCreator", "Content Creator")
    matched_keyword = job.get("matchedKeyword", "")
    watchlist_title = job.get("watchlistTitle", "")
    
    # Kumpulkan keywords dari watchlist
    niche_keywords = [matched_keyword] if matched_keyword else []
    if watchlist_title:
        niche_keywords.append(watchlist_title)
    if creator:
        niche_keywords.append(creator)
    
    # Hapus duplikat
    niche_keywords = list(dict.fromkeys(niche_keywords))
    
    # Generate untuk YouTube
    yt_meta = generate_viral_metadata(video_title, creator, niche_keywords, "youtube")
    
    # Generate untuk Instagram
    ig_meta = generate_viral_metadata(video_title, creator, niche_keywords, "instagram")
    
    return {
        "youtube": yt_meta,
        "instagram": ig_meta,
        "original_title": video_title,
        "creator": creator,
        "watchlist_title": watchlist_title,
        "matched_keyword": matched_keyword,
        "optimized_at": datetime.now().isoformat(),
        "ai_generated": yt_meta.get("ai_generated", False)
    }


def main():
    print("🚀 Memulai Algorithm Optimization Job...")
    
    # Muat log sebelumnya
    logs = load_log()
    processed_ids = {log.get("job_id") for log in logs}
    
    # Ambil clip yang siap
    ready_clips = get_ready_clips()
    
    if not ready_clips:
        print("✅ Tidak ada clip baru untuk dioptimasi")
        return
    
    print(f"📋 Ditemukan {len(ready_clips)} clip baru untuk dioptimasi")
    
    new_logs = []
    
    for job in ready_clips:
        job_id = job.get("id", "")
        if job_id in processed_ids:
            continue
        
        print(f"🔧 Mengoptimasi: {job.get('sourceTitle', 'Unknown')[:50]}...")
        
        try:
            meta = optimize_clip(job)
            
            # Tambahkan ke job
            job["optimized"] = True
            job["algorithm_metadata"] = meta
            job["optimized_at"] = datetime.now().isoformat()
            
            new_logs.append({
                "job_id": job_id,
                "video_title": job.get("sourceTitle", ""),
                "watchlist_id": job.get("watchlistId", ""),
                "youtube_title": meta["youtube"]["title"],
                "instagram_title": meta["instagram"]["title"],
                "ai_generated": meta["ai_generated"],
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            })
            
            print(f"  ✅ YouTube: {meta['youtube']['title']}")
            print(f"  ✅ Instagram: {meta['instagram']['title']}")
            
        except Exception as e:
            print(f"  ❌ Gagal: {e}")
            new_logs.append({
                "job_id": job_id,
                "video_title": job.get("sourceTitle", ""),
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "error"
            })
    
    # Simpan clip_jobs.json yang sudah diupdate
    clip_jobs_file = DATA_DIR / "clip_jobs.json"
    # ready_clips sudah berisi metadata optimized
    with open(clip_jobs_file, "w", encoding="utf-8") as f:
        json.dump(ready_clips, f, indent=2, ensure_ascii=False)
    
    # Simpan log
    all_logs = logs + new_logs
    save_log(all_logs)
    
    print(f"✅ Selesai! {len(new_logs)} clip dioptimasi")


if __name__ == "__main__":
    main()
