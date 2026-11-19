---
name: retro-video-generator
description: Guidelines, recipes, and token-saving architectural patterns for generating DzikirQu-style retro halftone/risograph animated videos.
---

# Retro Video Generator (DzikirQu Halftone & Risograph Style)

Panduan teknis dan standar arsitektur untuk memproduksi video bergaya **DzikirQu** (Halftone Stippling + Risograph Duo-Tone + Vintage Paper Texture + Motion Subtitle) dengan konsumsi token seminimal mungkin.

---

## 1. Aturan Efisiensi Token (Token-Saving Protocol)

Untuk menjaga efisiensi token AI hingga 90%+:
1. **Gunakan Python & FFmpeg untuk Render (Zero LLM Tokens):**
   - Efek Halftone/Dither, Paper Texture Overlay, Ken Burns Motion, dan Subtitle ASS di-render secara lokal menggunakan PIL dan FFmpeg tanpa memanggil API AI eksternal.
2. **Minimalist JSON untuk AI Narasi:**
   - Gunakan AI (Gemini / Nemotron / Groq) **hanya** untuk membuat narasi, hook, dan metadata singkat dengan struktur JSON yang ringkas.
3. **Preset Aset Lokal:**
   - Simpan tekstur kertas (`assets/textures/kraft_paper.png`), noise loop (`assets/textures/film_grain.mp4`), dan ambient audio di direktori lokal untuk menghindari fetch berulang.

---

## 2. Pipeline Teknis Visual (Deterministic Engine)

### A. Algoritma Halftone & Dithering (Pillow)
Konversi gambar atau ilustrasi dasar menjadi pola bintik halftone:
- Ubah image ke Grayscale (`L`).
- Terapkan kontras tinggi (Levels / Curve).
- Konversi ke 1-bit Dither menggunakan Floyd-Steinberg (`image.convert('1', dither=Image.Dither.FLOYDSTEINBERG)`) atau Bayer Matrix Halftone Screen.
- Tinting warna: Ganti warna hitam dengan Ink Color (misal Charcoal `#222222` atau Dark Terracotta `#6A2E20`), dan putih dengan transparan.

### B. Komposisi FFmpeg (Video Render + Motion)
- **Background Layer:** Gambar tekstur kertas cream (`#F6F0E7`).
- **Illustration Layer:** Ilustrasi halftone dengan filter Ken Burns halus:
  `zoompan=z='min(zoom+0.0005,1.1)':d=750:s=1080x1920:fps=30`
- **Grain Overlay:** Loop video noise/grain dengan blend mode `screen` atau `overlay` pada opacity 15%.
- **Audio Mix:** Voiceover audio + Ambient BGM (-18dB ducking).
- **Subtitles:** Render subtitle ASS/SRT dengan font Serif klasik (*Playfair Display* / *EB Garamond*).

---

## 3. Format Kontrak Data (Script & Context)

Ketika memanggil LLM untuk menghasilkan ide video DzikirQu, batasi output hanya pada schema ini:

```typescript
export interface RetroVideoConcept {
  theme: string;           // e.g. "Ketenangan Jiwa & Dzikir Petang"
  titleHook: string;       // 1 kalimat hook pembuka
  arabicText?: string;     // Ayat / Hadits / Dzikir (opsional)
  translation: string;     // Terjemahan / hikmah singkat
  voiceoverScript: string; // Teks narasi untuk dibaca TTS (maks 3-5 kalimat)
  visualPrompt: string;    // Prompt gambar dasar untuk AI Image Generator
  recommendedTone: "peaceful" | "melancholic" | "reflective";
}
```

---

## 4. Checklist Kualitas Video
- [ ] Rasio Video: `9:16` (1080x1920) untuk Reels/Shorts/TikTok.
- [ ] Frame Rate: 24 atau 30 FPS untuk nuansa sinematik klasik.
- [ ] Durasi Optimal: 15–35 detik (ritme lambat & kontemplatif).
- [ ] Readability: Teks memiliki kontras cukup terhadap tekstur kertas.
