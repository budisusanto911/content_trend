"use client";

import { useState } from "react";
import {
  Film,
  Sparkles,
  Play,
  Download,
  Share2,
  RefreshCw,
  Layers,
  FileText,
  Volume2,
  Eye,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const INK_OPTIONS = [
  { id: "charcoal", name: "Charcoal Black", color: "#222222", desc: "Klasik cetakan koran editorial" },
  { id: "terracotta", name: "Warm Terracotta", color: "#8E3C2A", desc: "Hangat bernuansa tanah liat & senja" },
  { id: "sage_olive", name: "Sage Olive", color: "#344638", desc: "Tenang, sejuk bernuansa alam" },
  { id: "vintage_navy", name: "Vintage Navy", color: "#1C2C48", desc: "Deep indigo cyanotype malam" },
  { id: "sepia_brown", name: "Sepia Brown", color: "#5A3C28", desc: "Buku tua lawas 1970-an" },
];

const PAPER_OPTIONS = [
  { id: "cream", name: "Cream Unbleached", color: "#F6F0E7", desc: "Kertas koran/buku berserat halus" },
  { id: "kraft", name: "Recycled Kraft", color: "#E5DAC8", desc: "Tekstur karton daur ulang organik" },
  { id: "parchment", name: "Antique Parchment", color: "#EFE6D2", desc: "Lembaran perkamen klasik" },
];

const VOICE_OPTIONS = [
  { id: "id-ID-ArdiNeural", name: "Ardi (Pria Tenang & Dalam)" },
  { id: "id-ID-GadisNeural", name: "Gadis (Wanita Lembut)" },
];

export default function RetroStudioPage() {
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("Ketika Hatimu Merasa Lelah");
  const [script, setScript] = useState(
    "Ingatlah, tidak ada lelah yang sia-sia bagi hati yang selalu bersandar pada ketetapan-Nya. Tenangkan dirimu, perbanyaklah istighfar."
  );
  const [ink, setInk] = useState<any>("charcoal");
  const [paper, setPaper] = useState<any>("cream");
  const [voice, setVoice] = useState("id-ID-ArdiNeural");

  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>("/clips/retro_preview.png");
  const [videoUrl, setVideoUrl] = useState<string | null>("/clips/retro_dzikirqu_demo.mp4");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate AI Script Concept (Token-saving / built-in presets)
  const handleGenerateScript = async () => {
    setIsLoadingScript(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/retro-video/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.success) {
        setHook(data.hook);
        setScript(data.script);
        if (data.recommendedInk) setInk(data.recommendedInk);
        if (data.recommendedPaper) setPaper(data.recommendedPaper);
      }
    } catch (e: any) {
      setErrorMsg("Gagal memuat konsep naskah");
    } finally {
      setIsLoadingScript(false);
    }
  };

  // Generate 1-Frame Fast Preview
  const handleGeneratePreview = async () => {
    setIsPreviewing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/retro-video/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inkName: ink, paperType: paper }),
      });
      const data = await res.json();
      if (data.success && data.previewUrl) {
        setPreviewUrl(data.previewUrl + `?t=${Date.now()}`);
      } else {
        setErrorMsg(data.error || "Gagal membuat preview");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Preview error");
    } finally {
      setIsPreviewing(false);
    }
  };

  // Render Full Video
  const handleRenderVideo = async () => {
    setIsRendering(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/retro-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook,
          script,
          inkName: ink,
          paperType: paper,
          voice,
        }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl + `?t=${Date.now()}`);
      } else {
        setErrorMsg(data.error || "Gagal me-render video");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Render video gagal");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Retro Video Studio</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Produksi video 9:16 estetika DzikirQu (Halftone Dithering + Risograph Print + Retro Paper)
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5" /> Token Saving Engine
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            Pillow & FFmpeg
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Topik & Naskah */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">1. Konsep & Naskah Renungan</h3>
              </div>
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={isLoadingScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoadingScript ? "animate-spin" : ""}`} />
                {isLoadingScript ? "Membuat..." : "Inspirasi Cepat AI"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Topik / Kata Kunci (Opsional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Ketenangan Hati, Ikhlas, Doa Sepertiga Malam..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Hook Title (Judul Pembuka Video)
                </label>
                <input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="Contoh: Ketika Hatimu Merasa Lelah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Naskah Narasi Voiceover & Subtitle
                </label>
                <textarea
                  rows={3}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Masukkan 2-4 kalimat renungan yang menenangkan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Palet Warna Tinta Risograph */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">2. Tinta Risograph (Duotone Halftone)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INK_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setInk(opt.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    ink === opt.id
                      ? "border-blue-600 bg-blue-50/40 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full shadow-inner flex-shrink-0 border border-black/10"
                    style={{ backgroundColor: opt.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{opt.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Tekstur Kertas & Suara */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-gray-900">3. Kertas & Suara Narasi</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PAPER_OPTIONS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPaper(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    paper === p.id
                      ? "border-amber-600 bg-amber-50/40 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div
                    className="w-full h-8 rounded-lg mb-2 border border-black/5"
                    style={{ backgroundColor: p.color }}
                  />
                  <p className="text-xs font-bold text-gray-800">{p.name}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Pilihan Suara Voiceover (TTS)
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isPreviewing || isRendering}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
            >
              <Eye className={`w-4 h-4 ${isPreviewing ? "animate-pulse" : ""}`} />
              {isPreviewing ? "Memproses Preview..." : "Test 1 Frame (Cepat)"}
            </button>

            <button
              type="button"
              onClick={handleRenderVideo}
              disabled={isRendering || isPreviewing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isRendering ? "animate-spin" : ""}`} />
              {isRendering ? "Me-render Video FFmpeg..." : "Render Video 9:16"}
            </button>
          </div>
        </div>

        {/* Preview / Output Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600" />
                Live Preview & Player
              </h3>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                9:16 Vertical
              </span>
            </div>

            {/* Video or Image Preview Container */}
            <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto rounded-xl overflow-hidden bg-[#222] shadow-lg border border-black/10 flex items-center justify-center">
              {videoUrl ? (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Retro Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <Film className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-xs">Klik "Test 1 Frame" atau "Render Video" untuk melihat hasil.</p>
                </div>
              )}

              {/* Watermark Label */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white tracking-widest uppercase">
                {videoUrl ? "MP4 Render" : "Frame Preview"}
              </div>
            </div>

            {/* Action Buttons for Result */}
            {videoUrl && (
              <div className="space-y-2 pt-2">
                <a
                  href={videoUrl}
                  download="retro_story.mp4"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download Video MP4
                </a>

                <Link
                  href="/dashboard/clipper/accounts"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" /> Auto-Publish ke Instagram / TikTok
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
