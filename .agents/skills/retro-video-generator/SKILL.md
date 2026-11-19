---
name: retro-video-generator
description: Guidelines, recipes, and token-saving architectural patterns for generating DzikirQu-style multi-scene animated doodle motion reels (hand-drawn stroke icons, Islamic geometric borders, pastel highlight subtitles).
---

# DzikirQu Doodle Motion Video Generator

Standar arsitektur dan resep teknis untuk memproduksi video vertikal 9:16 bergaya **DzikirQu** (referensi: `instagram.com/dzikirquapp/reel/Df5qhIAIQXg/`) secara lokal dengan **0 token AI untuk render visual & animasi**.

---

## 1. Anatomi Visual DzikirQu Reel

1. **Kanvas Kertas & Border Geometris Islami:**
   - Background kertas krem hangat (`#F2EDE0`) dengan grain organik halus.
   - Strip border pola bintang 8 sudut Islami (*Rub el Hizb*) + garis solid di bagian atas dan bawah.
2. **Header Editorial Statis:**
   - Series tag uppercase berjarak huruf lebar (contoh: `SERI JUMAT 3/3`).
   - Judul utama Serif Bold 2 baris (`LiberationSerif-Bold`).
   - Kredit pembicara / sumber di bawah judul.
3. **Ilustrasi Doodle Multi-Scene Beranimasi (Tengah):**
   - Setiap slide/kalimat memiliki ikon doodle hand-drawn tebal (`mimbar`, `speech`, `stairs`, `tasbih`, `scrolls`, `mosque`, `hands`, `book`, `heart`, `crescent`, `clock`).
   - **Animasi Draw-On:** Garis tergambar bertahap dari stroke pertama hingga selesai (~1.25 detik), disertai *hand-drawn boil* (~4 fps).
   - **Watercolor Splash & Accents:** Bercak warna pastel organik di belakang doodle + aksen bintang (`✦`), garis gerak (`///`), dan `+`.
4. **Subtitle Condensed dengan Highlight Kata Kunci:**
   - Font `LiberationSansNarrow-Bold` rata tengah.
   - Kata yang dibungkus `*...*` otomatis berwarna aksen dengan blok highlighter pastel di belakangnya yang menyapu dari kiri ke kanan.
5. **Footer Branding Statis:**
   - Nama akun/lembaga di bagian bawah (mendukung format `Brand Kiri | Brand Kanan`).

---

## 2. Efisiensi Token (Token-Saving Protocol)

- **0 Token untuk Visual & Video:** Seluruh border, doodle, animasi draw-on, highlight bar, dan encoding MP4 dirender deterministik via `toolkit/retro_video_engine.py` (Pillow + FFmpeg rawvideo pipe).
- **Audio Narasi Per Scene:** Menggunakan `edge-tts` lokal (gratis, sinkron per slide) + fallback timing offline otomatis.
- **Preset Multi-Scene Siap Pakai:** `RetroVideoService.generateScriptConcept()` menyediakan preset siap pakai tanpa memanggil LLM.

---

## 3. Kontrak Data Multi-Scene

```typescript
export interface DoodleScene {
  icon: "mimbar" | "scrolls" | "speech" | "stairs" | "tasbih" | "mosque" | "heart" | "crescent" | "book" | "hands" | "clock";
  text: string; // Bungkus frasa penting dengan *...* untuk highlight pastel
}
```
