"use client";

import { useState } from "react";
import {
  Film,
  Sparkles,
  Play,
  Download,
  Share2,
  Layers,
  FileText,
  Volume2,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

const THEME_OPTIONS = [
  { id: "navy_blue", name: "DzikirQu Navy Blue", primary: "#182B44", accent: "#4A77B5", blob: "#9BC0E8", paper: "#F2EDE0" },
  { id: "emerald_sage", name: "Emerald Sage", primary: "#1C342B", accent: "#3E7C64", blob: "#A5D1BE", paper: "#F2EFE6" },
  { id: "terracotta_warm", name: "Warm Terracotta", primary: "#3A221A", accent: "#B25438", blob: "#E4A893", paper: "#F5EFE6" },
  { id: "charcoal_gold", name: "Charcoal & Gold", primary: "#222222", accent: "#A67C37", blob: "#E3CE9B", paper: "#F4EFE2" },
];

const BG_OPTIONS = [
  { id: "classic_cream", name: "Kertas Krem Halus", color: "#F2EDE0", desc: "Default ala DzikirQu" },
  { id: "cream_paper", name: "Kertas Serat Alami", color: "#F6F0E7", desc: "Tekstur serat organik" },
  { id: "kraft_paper", name: "Recycled Kraft", color: "#E5DAC8", desc: "Kertas daur ulang klasik" },
  { id: "parchment_paper", name: "Antique Parchment", color: "#EFE6D2", desc: "Lembaran kitab tua" },
  { id: "dot_grid", name: "Notebook Dotted", color: "#F2EDE0", desc: "Pola titik buku catatan" },
  { id: "lined_notebook", name: "Kertas Bergaris", color: "#F2EDE0", desc: "Garis tipis stationery" },
  { id: "soft_gradient", name: "Gradasi Pastel", color: "#E6ECF5", desc: "Gradasi lembut senada tema" },
];

const ICON_OPTIONS = [
  { id: "mimbar", label: "Mimbar Khutbah" },
  { id: "speech", label: "Balon Doa / Ucapan" },
  { id: "stairs", label: "Tangga Turun" },
  { id: "tasbih", label: "Untaian Tasbih" },
  { id: "scrolls", label: "Gulungan Kitab" },
  { id: "mosque", label: "Masjid & Kubah" },
  { id: "hands", label: "Tangan Berdoa" },
  { id: "book", label: "Al-Qur'an & Rehal" },
  { id: "heart", label: "Hati / Qalb" },
  { id: "crescent", label: "Bulan Sabit Malam" },
  { id: "clock", label: "Jam Waktu Mustajab" },
];

const VOICE_OPTIONS = [
  { id: "id-ID-ArdiNeural", name: "Ardi (Pria Tenang & Dalam)" },
  { id: "id-ID-GadisNeural", name: "Gadis (Wanita Lembut)" },
];

interface SceneItem {
  icon: string;
  text: string;
}

export default function RetroStudioPage() {
  const [topic, setTopic] = useState("");
  const [seriesTag, setSeriesTag] = useState("SERI JUMAT 3/3");
  const [title, setTitle] = useState("Tempat Berdoa di Hari Jumat");
  const [speaker, setSpeaker] = useState("Syaikh Prof. Dr. Badr bin Nashir al-Badr");
  const [footerBrand, setFooterBrand] = useState("DzikirQu | MASJID BASHIRAH");
  const [theme, setTheme] = useState<string>("navy_blue");
  const [bgStyle, setBgStyle] = useState<string>("classic_cream");
  const [bgImagePath, setBgImagePath] = useState<string>("");
  const [bgPreviewThumb, setBgPreviewThumb] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [voice, setVoice] = useState("id-ID-ArdiNeural");

  const [scenes, setScenes] = useState<SceneItem[]>([
    { icon: "mimbar", text: "Bila khatib naik mimbar, ia menghadap jamaah dan *memberi salam.*" },
    { icon: "speech", text: "Jawab muadzin, lalu berdoa. Berdoalah *di antara dua khutbah.*" },
    { icon: "stairs", text: "Berdoalah juga saat ia *turun dari mimbar,* selesai khutbah kedua, sampai shalat dimulai." },
    { icon: "tasbih", text: "dan di *akhir tasyahud terakhir.* Semua ini adalah *tempat dikabulkannya doa.*" },
  ]);

  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>("/clips/retro_preview.png");
  const [videoUrl, setVideoUrl] = useState<string | null>("/clips/retro_dzikirqu_demo.mp4");
  const [activeView, setActiveView] = useState<"video" | "preview">("preview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateScene = (index: number, patch: Partial<SceneItem>) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addScene = () => {
    setScenes((prev) => [
      ...prev,
      { icon: "hands", text: "Tambahkan kalimat renungan dan beri tanda *bintang* untuk highlight." },
    ]);
  };

  const removeScene = (index: number) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((_, i) => i !== index));
  };

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
        if (data.seriesTag) setSeriesTag(data.seriesTag);
        if (data.title) setTitle(data.title);
        if (data.speaker) setSpeaker(data.speaker);
        if (data.theme) setTheme(data.theme);
        if (Array.isArray(data.scenes) && data.scenes.length > 0) setScenes(data.scenes);
      }
    } catch {
      setErrorMsg("Gagal memuat konsep multi-scene");
    } finally {
      setIsLoadingScript(false);
    }
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/retro-video/upload-bg", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setBgImagePath(data.bgImagePath);
        setBgPreviewThumb(data.bgPreviewUrl);
        setBgStyle("custom");
      } else {
        setErrorMsg(data.error || "Gagal upload background");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal upload background");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const clearCustomBg = () => {
    setBgImagePath("");
    setBgPreviewThumb(null);
    setBgStyle("classic_cream");
  };

  const handleGeneratePreview = async (sceneIndex = 0) => {
    setIsPreviewing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/retro-video/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesTag,
          title,
          speaker,
          footerBrand,
          theme,
          bgStyle,
          bgImagePath,
          scenes,
          previewSceneIndex: sceneIndex,
        }),
      });
      const data = await res.json();
      if (data.success && data.previewUrl) {
        setPreviewUrl(data.previewUrl + `?t=${Date.now()}`);
        setActiveView("preview");
      } else {
        setErrorMsg(data.error || "Gagal membuat preview");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Preview error");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleRenderVideo = async () => {
    setIsRendering(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/retro-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesTag,
          title,
          speaker,
          footerBrand,
          theme,
          bgStyle,
          bgImagePath,
          voice,
          scenes,
        }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl + `?t=${Date.now()}`);
        setActiveView("video");
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Retro Doodle Story Studio</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Video 9:16 bergaya DzikirQu — animasi doodle hand-drawn, border geometris Islami, dan highlight kata kunci
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5" /> 0 Token Render
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            Multi-Scene Doodle Motion
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
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Header Editorial & Branding */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">1. Header Editorial & Branding</h3>
              </div>
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={isLoadingScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoadingScript ? "animate-spin" : ""}`} />
                {isLoadingScript ? "Memuat..." : "Inspirasi Multi-Scene"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Topik Cepat (Opsional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Misal: Adab Berdoa, Keutamaan Subuh..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Series Tag (Atas)
                </label>
                <input
                  type="text"
                  value={seriesTag}
                  onChange={(e) => setSeriesTag(e.target.value)}
                  placeholder="SERI JUMAT 3/3"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Judul Utama (Serif)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tempat Berdoa di Hari Jumat"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Sumber / Pembicara
                </label>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="Syaikh Prof. Dr. Badr bin Nashir al-Badr"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Footer Watermark (Gunakan &quot;|&quot; untuk pemisah 2 logo/teks)
              </label>
              <input
                type="text"
                value={footerBrand}
                onChange={(e) => setFooterBrand(e.target.value)}
                placeholder="DzikirQu | MASJID BASHIRAH"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Card 2: Multi-Scene Storyboard */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">2. Storyboard Multi-Scene ({scenes.length} Slide)</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bungkus kata penting dengan tanda <code className="bg-blue-50 text-blue-700 px-1 rounded">*kata penting*</code> agar otomatis diberi highlight biru pastel.
                </p>
              </div>
              <button
                type="button"
                onClick={addScene}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-black transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Scene
              </button>
            </div>

            <div className="space-y-3">
              {scenes.map((sc, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-700">Scene {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={sc.icon}
                        onChange={(e) => updateScene(idx, { icon: e.target.value })}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      >
                        {ICON_OPTIONS.map((ic) => (
                          <option key={ic.id} value={ic.id}>
                            Ilustrasi: {ic.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleGeneratePreview(idx)}
                        disabled={isPreviewing}
                        title="Preview Scene Ini"
                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {scenes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScene(idx)}
                          title="Hapus Scene"
                          className="p-1.5 rounded-lg border border-gray-200 bg-white text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={sc.text}
                    onChange={(e) => updateScene(idx, { text: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Tema Warna & Suara */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">3. Tema Warna & Suara Narasi</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_OPTIONS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    theme === t.id
                      ? "border-blue-600 bg-blue-50/40 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-900">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.paper }} />
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.blob }} />
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.accent }} />
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.primary }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Background Kanvas Selector */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Background Kanvas
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingBg ? "Mengupload..." : "Upload Gambar Sendiri"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadBg}
                    disabled={isUploadingBg}
                    className="hidden"
                  />
                </label>
              </div>

              {bgPreviewThumb && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/40">
                  <div className="flex items-center gap-3">
                    <img
                      src={bgPreviewThumb}
                      alt="Custom background"
                      className="w-10 h-14 object-cover rounded-lg border border-black/10"
                    />
                    <div>
                      <p className="text-xs font-bold text-blue-900">Background Custom Aktif</p>
                      <p className="text-[11px] text-blue-700/80">Otomatis di-crop 9:16 + tint kertas lembut</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearCustomBg}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-white transition-colors"
                    title="Hapus background custom"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BG_OPTIONS.map((b) => {
                  const isActive = !bgImagePath && bgStyle === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setBgImagePath("");
                        setBgPreviewThumb(null);
                        setBgStyle(b.id);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isActive
                          ? "border-blue-600 bg-blue-50/40 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div
                        className="w-full h-7 rounded-md mb-1.5 border border-black/10"
                        style={{
                          backgroundColor: b.color,
                          backgroundImage:
                            b.id === "dot_grid"
                              ? "radial-gradient(#b8b0a0 1px, transparent 1px)"
                              : b.id === "lined_notebook"
                              ? "repeating-linear-gradient(transparent, transparent 6px, #d0c8b8 7px)"
                              : b.id === "soft_gradient"
                              ? "linear-gradient(180deg, #F2EDE0 0%, #D9E6F5 100%)"
                              : undefined,
                          backgroundSize: b.id === "dot_grid" ? "8px 8px" : undefined,
                        }}
                      />
                      <p className="text-[11px] font-bold text-gray-900 truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{b.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Pilihan Suara Voiceover (Edge-TTS)
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
              onClick={() => handleGeneratePreview(0)}
              disabled={isPreviewing || isRendering}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
            >
              <Eye className={`w-4 h-4 ${isPreviewing ? "animate-pulse" : ""}`} />
              {isPreviewing ? "Memproses Preview..." : "Preview Slide 1 (Instan)"}
            </button>

            <button
              type="button"
              onClick={handleRenderVideo}
              disabled={isRendering || isPreviewing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isRendering ? "animate-spin" : ""}`} />
              {isRendering ? "Me-render Video Multi-Scene..." : "Render Video Reel 9:16"}
            </button>
          </div>
        </div>

        {/* Preview / Output Column */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView("preview")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    activeView === "preview" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Frame Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("video")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    activeView === "video" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Video MP4
                </button>
              </div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                9:16 Reels
              </span>
            </div>

            <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto rounded-xl overflow-hidden bg-[#F2EDE0] shadow-lg border border-black/10 flex items-center justify-center">
              {activeView === "video" && videoUrl ? (
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
                  alt="DzikirQu Doodle Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <Film className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-xs">Klik &quot;Preview Slide&quot; atau &quot;Render Video&quot;.</p>
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="space-y-2 pt-2">
                <a
                  href={videoUrl}
                  download="dzikirqu_doodle_reel.mp4"
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
