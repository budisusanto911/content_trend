# 🎬 Content Trend Intelligence & AI Auto-Clipper

An end-to-end automated system for discovering viral trends, analyzing social media metrics, and automatically generating high-retention 9:16 vertical short-form clips (YouTube Shorts, TikTok, Instagram Reels) powered by AI.

---

## 🚀 Fitur Utama (Key Features)

### 1. 📊 Trend Intelligence & Market Research
- **Trending & Rising Tracker**: Monitor dan temukan konten yang sedang trending serta topik yang sedang naik daun di YouTube & TikTok.
- **Niche Finder**: Identifikasi ceruk pasar (*niche*) yang memiliki permintaan tinggi namun persaingan rendah.
- **AI Trend Analyzer**: Analisis mendalam terhadap pola engagement, komentar netizen, struktur hook, dan sentimen konten.

### 2. ✂️ Automated AI Video Clipper (`clipper_pipeline.py`)
- **Smart Hook Detection**: AI mendeteksi bagian paling menarik dan viral dari video panjang secara otomatis.
- **Auto 9:16 Framing**: Konversi video horizontal (16:9) menjadi format vertikal (9:16) untuk Shorts/Reels/TikTok menggunakan FFmpeg.
- **Hormozi-Style Dynamic Subtitles**: Pembuatan subtitle beranimasi dengan gaya Alex Hormozi (highlight kata kuning/hijau, outline tebal, font tebal).
- **Customizable Overlays**: Dukungan Top Hook badge banner, custom watermark, dan animated progress bar.
- **Auto Cut & Polish**: Download audio cepat, transkripsi (Whisper/VTT), rendering presisi tanpa jeda, dan audio leveling.

### 3. 🤖 Autopilot & Multi-Channel Distribution
- **Scheduled Auto-Jobs**: Cron scheduler untuk scraping otomatis dan clipping video berkala.
- **Multi-Account Profiles**: Pengelolaan profil channel berbeda untuk target audiens yang beragam.
- **Multi-Platform Publishing**: Integrasi modul auto-publish ke YouTube Shorts, Instagram Reels, dan TikTok.
- **Webhook Alerts**: Notifikasi otomatis hasil render & status publikasi via Discord / Telegram webhook.

---

## 🏗️ Arsitektur Proyek

```
tool content creator/
├── clipper_pipeline.py              # Python automation engine (yt-dlp, ffmpeg, AI hook extraction)
├── clipper.py                       # Lightweight clipper CLI script
├── .gitignore                       # Git ignore untuk file media besar, binary & cache
├── data/                            # Cache data, settings, & clip logs
│   ├── settings.json
│   ├── last_clip.json
│   └── trending_cache.json
└── content-trend-intelligence/      # Web Dashboard Full-Stack (Next.js 16/15 + Tailwind CSS)
    ├── src/
    │   ├── app/
    │   │   ├── dashboard/           # UI Dashboard, Analyzer, Clipper, Niche Finder, Settings
    │   │   └── api/                 # REST Endpoints (Scraper, Clipper, Publish, Cron, Webhooks)
    │   ├── components/              # Komponen antarmuka (Sidebar, Layout, Cards)
    │   ├── services/                # Business logic (AIService, ClipperService, TrendEngine)
    │   └── lib/                     # Stores, schedulers, utilities
    ├── prisma/                      # Database schema & migrations
    ├── public/                      # Static assets & verification tokens
    ├── package.json
    └── next.config.ts
```

---

## 🛠️ Prasyarat (Prerequisites)

Pastikan dependensi sistem berikut sudah terpasang:
- **Node.js**: v18.x atau lebih baru (disarankan v20+)
- **Python**: v3.10+
- **FFmpeg**: Terpasang di system PATH (`ffmpeg` & `ffprobe`)
- **yt-dlp**: Versi terbaru (`pip install -U yt-dlp`)

---

## ⚡ Panduan Instalasi & Menjalankan

### 1. Clone Repository
```bash
git clone https://github.com/budisusanto911/content_trend.git
cd content_trend
```

### 2. Setup Web Dashboard (Next.js)
```bash
cd content-trend-intelligence

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Jalankan development server
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser untuk mengakses dashboard.

### 3. Setup Python Clipper Pipeline
Kembali ke root directory:
```bash
# Buat virtual environment (opsional namun disarankan)
python3 -m venv venv
source venv/bin/activate  # Untuk Linux/macOS
# venv\Scripts\activate   # Untuk Windows

# Install package Python yang diperlukan
pip install yt-dlp python-dotenv requests google-genai
```

Jalankan clipper secara langsung via terminal:
```bash
python3 clipper_pipeline.py "https://www.youtube.com/watch?v=VIDEO_ID"
```

---

## ⚙️ Konfigurasi Environment (`.env`)

Buat file `.env` di dalam folder `content-trend-intelligence/`:

```env
# AI Model APIs (Gemini / OpenAI / Groq)
AI_API_KEY="your_gemini_or_openai_api_key"

# Platform API Keys (Opsional untuk data scraping & publishing)
YOUTUBE_API_KEY="your_youtube_api_key"
TIKTOK_API_KEY="your_tiktok_api_key"

# Database (Prisma)
DATABASE_URL="postgresql://user:password@localhost:5432/content_trend_intelligence"
```

---

## 📋 Pengaturan Kustomisasi Subtitle & Style

Pengaturan subtitle dan layout video dapat disesuaikan melalui menu **Dashboard Settings** atau langsung di `data/settings.json`:
- **Subtitle Theme**: `hormozi_yellow`, `neon_green`, `pure_white`, `cyber_pink`
- **Hook Badge**: Aktifkan label judul "JANGAN DISKIP!" di bagian atas video
- **Target Duration**: Rentang durasi klip otomatis (misal: 30 - 50 detik)
- **Watermark**: Teks watermark channel pada video

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Silakan gunakan dan kembangkan sesuai kebutuhan Anda.
