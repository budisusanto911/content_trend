"use client";

import { useState } from "react";
import {
  Smile,
  Sparkles,
  Play,
  Download,
  Share2,
  Layers,
  Volume2,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  BookOpen,
  Upload,
  X,
  Music,
  Mic,
} from "lucide-react";
import Link from "next/link";

const STORY_TEMPLATES = [
  { id: "gundah_solusi", label: "Gundah → Solusi Simpel", badge: "Relate" },
  { id: "burnout_reset", label: "Burnout → Reset 3 Menit", badge: "Praktis" },
  { id: "bahagia_syukur", label: "Bahagia & Hal Kecil", badge: "Positif" },
  { id: "malam_overthinking", label: "Overthinking Jam 12 Malam", badge: "Dark Mode" },
  { id: "bandingkan_diri", label: "Capek Bandingin Diri di Sosmed", badge: "Self-Worth" },
  { id: "malas_mulai", label: "Susah Mulai & Prokrastinasi", badge: "Aturan 2 Menit" },
  { id: "people_pleaser", label: "Capek Nggak Enakan (People Pleaser)", badge: "Boundaries" },
  { id: "rejeki_seret", label: "Lagi Merasa Jalan Buntu / Stuck", badge: "Harapan" },
  { id: "kesepian_ramai", label: "Sepi di Tengah Keramaian", badge: "Healing" },
  { id: "pagi_semangat", label: "Mood Booster Pagi Hari", badge: "Semangat" },
  { id: "kecewa_ekspektasi", label: "Kecewa Karena Ekspektasi Tinggi", badge: "Refleksi" },
  { id: "kemenangan_kecil", label: "Rayakan Kemenangan Kecil", badge: "Happy" },
];

const THEME_OPTIONS = [
  { id: "calm_ink", name: "Tinta Klasik & Stabilo", bg: "#F9F6EE", ink: "#1E2026", hl: "#FDEA98" },
  { id: "warm_healing", name: "Warm Healing & Peach", bg: "#FAF3EB", ink: "#362620", hl: "#F8D4C4" },
  { id: "happy_pop", name: "Cerah & Positif (Mint)", bg: "#F8FAF7", ink: "#1A2A3A", hl: "#C2F0DE" },
  { id: "midnight_chalk", name: "Papan Malam (Dark)", bg: "#181B22", ink: "#F0F2F6", hl: "#30486C" },
];

const PAPER_OPTIONS = [
  { id: "notebook_grid", name: "Kertas Kotak-Kotak", desc: "Graph paper viral" },
  { id: "lined_journal", name: "Buku Diary Bergaris", desc: "Klasik catatan harian" },
  { id: "dot_journal", name: "Bullet Journal", desc: "Pola titik minimalis" },
  { id: "warm_sketchbook", name: "Sketchbook Polos", desc: "Bersih bertekstur halus" },
];

const POSE_GROUPS = [
  {
    group: "Gundah, Lelah & Relate",
    items: [
      { id: "overthinking", label: "Overthinking (Awan Kusut Berputar)" },
      { id: "rain_sad", label: "Di Bawah Awan Hujan (Gerimis Jatuh)" },
      { id: "carrying_burden", label: "Memikul Beban Berat" },
      { id: "working_tired", label: "Burnout / Lelah di Meja Laptop" },
      { id: "walking_alone", label: "Jalan Sendirian (Animasi Langkah)" },
    ],
  },
  {
    group: "Solusi, Proses & Kesadaran",
    items: [
      { id: "eureka_idea", label: "Dapat Solusi! (Bohlam Menyala)" },
      { id: "pointing_solution", label: "Menunjuk Papan Checklist Solusi" },
      { id: "deep_breath", label: "Tarik Napas Dalam / Meditasi" },
      { id: "climbing_up", label: "Mendaki Tangga Progres Kecil" },
      { id: "stargazing", label: "Menatap Langit Malam Damai" },
    ],
  },
  {
    group: "Tenang, Bahagia & Semangat",
    items: [
      { id: "coffee_chill", label: "Santai Pegang Kopi (Uap Naik)" },
      { id: "self_hug", label: "Peluk Diri Sendiri (Self-Compassion)" },
      { id: "happy_jump", label: "Melompat Gembira + Sparkles!" },
      { id: "high_five_cheer", label: "Melambaikan Tangan Semangat" },
    ],
  },
];

const VOICE_OPTIONS = [
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew Natural (Pria Hangat & Manusiawi — Recommended)" },
  { id: "en-US-AvaMultilingualNeural", name: "Ava Natural (Wanita Ramah & Ngobrol — Recommended)" },
  { id: "en-US-BrianMultilingualNeural", name: "Brian Natural (Pria Tenang & Dalam)" },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma Natural (Wanita Lembut & Empatik)" },
  { id: "id-ID-ArdiNeural", name: "Ardi ID (Pria Indonesia Klasik)" },
  { id: "id-ID-GadisNeural", name: "Gadis ID (Wanita Indonesia Klasik)" },
  { id: "ms-MY-OsmanNeural", name: "Osman (Pria Melayu Hangat)" },
  { id: "ms-MY-YasminNeural", name: "Yasmin (Wanita Melayu Lembut)" },
];

const BGM_OPTIONS = [
  { id: "auto", name: "Otomatis Sesuai Tema (Default)" },
  { id: "chill_ambient", name: "Lo-Fi Chill Santai" },
  { id: "healing_piano", name: "Warm Healing Piano Pad" },
  { id: "happy_morning", name: "Pagi Cerah & Ringan" },
  { id: "midnight_rain", name: "Hujan Malam & Tenang" },
];

const INTONATION_OPTIONS = [
  { id: "auto", name: "Otomatis Sesuai Tema & Pose (Recommended)" },
  { id: "syahdu", name: "Syahdu & Dalam (Pelan, Pitch Rendah — Malam/Haru)" },
  { id: "hangat", name: "Hangat & Menenangkan (Healing / Refleksi)" },
  { id: "santai", name: "Santai Ngobrol (Solusi & Cerita Harian)" },
  { id: "semangat", name: "Ceria & Semangat (Cepat, Pitch Cerah — Happy)" },
];

const FX_OPTIONS = [
  { id: "none", label: "Tanpa Efek Tambahan" },
  { id: "scribble", label: "Efek: Awan Kusut + ?" },
  { id: "question", label: "Efek: Tanda ? Goyang" },
  { id: "idea", label: "Efek: Bohlam Ide Menyala" },
  { id: "heart", label: "Efek: Hati Melayang" },
  { id: "sparkles", label: "Efek: Bintang Sparkles" },
  { id: "rain", label: "Efek: Awan Hujan" },
];

const CHAR_STYLE_OPTIONS = [
  { id: "chibi", name: "Chibi Marshmallow", badge: "Favorit", desc: "Kepala bulat putih ekspresif, kedip mata, properti meja/kopi" },
  { id: "cat_mochi", name: "Kucing Mochi (Chibi Cat)", badge: "Gemoy", desc: "Telinga kucing, kumis tipis & ekor bergoyang — cocok buat healing" },
  { id: "hoodie_kid", name: "Anak Hoodie (Introvert)", badge: "Relate", desc: "Karakter bertudung hoodie + tali — pas buat overthinking & begadang" },
  { id: "bear_cozy", name: "Beruang Cozy (Chibi Bear)", badge: "Hangat", desc: "Telinga bulat & warna cokelat hangat — pas buat self-love & santai" },
  { id: "cloud_spirit", name: "Awan Imut (Fluffy Cloud)", badge: "Estetik", desc: "Awan lembut melayang berwajah ekspresif — tenang & unik" },
  { id: "stickman", name: "Stickman Klasik", badge: "Minimalis", desc: "Garis tipis klasik, ringan & cepat" },
] as const;

interface StickmanSceneItem {
  pose: string;
  moodLabel: string;
  text: string;
  customImage?: string;
  customPreview?: string;
  fxOverlay?: string;
}

export default function StickmanStudioPage() {
  const [theme, setTheme] = useState("calm_ink");
  const [paperStyle, setPaperStyle] = useState("notebook_grid");
  const [charStyle, setCharStyle] = useState<string>("chibi");
  const [intonation, setIntonation] = useState("auto");
  const [channelTag, setChannelTag] = useState("@catatan.tenang");
  const [useVoice, setUseVoice] = useState(true);
  const [voice, setVoice] = useState("en-US-AndrewMultilingualNeural");
  const [customVoicePath, setCustomVoicePath] = useState("");
  const [customVoiceName, setCustomVoiceName] = useState("");
  const [useBgm, setUseBgm] = useState(true);
  const [bgmTrack, setBgmTrack] = useState("auto");
  const [customBgmPath, setCustomBgmPath] = useState("");
  const [customBgmName, setCustomBgmName] = useState("");
  const [bgmVolume, setBgmVolume] = useState(0.28);

  const [scenes, setScenes] = useState<StickmanSceneItem[]>([
    { pose: "overthinking", moodLabel: "POV: Lagi Gundah", text: "Kadang hati terasa penuh, bukan butuh curhat, tapi *butuh ruang sendiri.*" },
    { pose: "walking_alone", moodLabel: "Menepi Sebentar", text: "Coba matikan layar 15 menit, jalan pelan, dan *biarkan kepala bernapas.*" },
    { pose: "eureka_idea", moodLabel: "Solusi Simpel", text: "Tulis satu hal kecil yang bisa kamu bereskan *hari ini saja.* Sisanya titipkan dulu." },
    { pose: "coffee_chill", moodLabel: "Pelan-Pelan Aja", text: "Kamu gak harus selesai hari ini. *Bisa tenang sebentar* saja sudah hebat." },
  ]);

  const [isLoadingPreset, setIsLoadingPreset] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>("/clips/stickman_preview.png");
  const [videoUrl, setVideoUrl] = useState<string | null>("/clips/stickman_demo.mp4");
  const [activeView, setActiveView] = useState<"video" | "preview">("video");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateScene = (index: number, patch: Partial<StickmanSceneItem>) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addScene = () => {
    setScenes((prev) => [
      ...prev,
      { pose: "eureka_idea", moodLabel: "Insight Baru", text: "Tambahkan cerita atau solusi harianmu dengan *kata penting* di sini." },
    ]);
  };

  const removeScene = (index: number) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const loadPreset = async (category: string) => {
    setIsLoadingPreset(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stickman-video/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.theme) setTheme(data.theme);
        if (data.paperStyle) setPaperStyle(data.paperStyle);
        if (Array.isArray(data.scenes)) setScenes(data.scenes);
      }
    } catch {
      setErrorMsg("Gagal memuat template cerita");
    } finally {
      setIsLoadingPreset(false);
    }
  };

  const handleUploadSceneMascot = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/retro-video/upload-bg", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        updateScene(index, {
          customImage: data.bgImagePath,
          customPreview: data.bgPreviewUrl,
          fxOverlay: scenes[index]?.fxOverlay || "none",
        });
      } else {
        setErrorMsg(data.error || "Gagal upload pose karakter");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal upload pose karakter");
    }
  };

  const handlePreview = async (sceneIndex = 0) => {
    setIsPreviewing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stickman-video/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          paperStyle,
          charStyle,
          channelTag,
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

  const handleUploadAudio = async (kind: "voice" | "bgm", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/stickman-video/upload-audio", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        if (kind === "voice") {
          setCustomVoicePath(data.audioPath);
          setCustomVoiceName(data.fileName || file.name);
        } else {
          setCustomBgmPath(data.audioPath);
          setCustomBgmName(data.fileName || file.name);
          setUseBgm(true);
        }
      } else {
        setErrorMsg(data.error || "Gagal upload audio");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal upload audio");
    }
  };

  const handleRender = async () => {
    setIsRendering(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stickman-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          paperStyle,
          charStyle,
          intonation,
          channelTag,
          useVoice,
          voice,
          customVoiceAudio: customVoicePath,
          useBgm,
          bgmTrack,
          customBgmPath,
          bgmVolume,
          scenes,
        }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl + `?t=${Date.now()}`);
        setActiveView("video");
      } else {
        setErrorMsg(data.error || "Gagal render video");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Render gagal");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stickman Doodle Story Studio</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Animasi Stickman minimalis 9:16 untuk berbagi cerita harian, overthinking, solusi praktis, hingga momen bahagia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5" /> 0 Token Render
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            14 Pose Beranimasi
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
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Template Cerita Cepat */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">1. Pilih Template Mood Cerita (Opsional)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STORY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => loadPreset(tpl.id)}
                  disabled={isLoadingPreset}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition-all"
                >
                  <span className="text-xs font-bold text-gray-800">{tpl.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {tpl.badge}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Gaya Karakter Animasi ({CHAR_STYLE_OPTIONS.length} Karakter)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CHAR_STYLE_OPTIONS.map((cs) => (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => setCharStyle(cs.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      charStyle === cs.id
                        ? "border-amber-600 bg-amber-50/50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900">{cs.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {cs.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{cs.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Watermark Akun / Channel (Bawah)
              </label>
              <input
                type="text"
                value={channelTag}
                onChange={(e) => setChannelTag(e.target.value)}
                placeholder="@catatan.tenang"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Card 2: Multi-Scene Stickman Storyboard */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">2. Alur Cerita &amp; Animasi Stickman ({scenes.length} Scene)</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bungkus kata kunci dengan <code className="bg-amber-50 text-amber-800 px-1 rounded">*kata penting*</code> agar diberi efek stabilo.
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-700">Scene {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={sc.pose}
                        onChange={(e) => updateScene(idx, { pose: e.target.value })}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      >
                        {POSE_GROUPS.map((grp) => (
                          <optgroup key={grp.group} label={grp.group}>
                            {grp.items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handlePreview(idx)}
                        disabled={isPreviewing}
                        title="Preview Scene Ini"
                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-amber-700 hover:bg-amber-50"
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

                  <input
                    type="text"
                    value={sc.moodLabel}
                    onChange={(e) => updateScene(idx, { moodLabel: e.target.value })}
                    placeholder="Label pill atas (misal: POV: Lagi Gundah, Solusi Simpel, Hal Kecil...)"
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                  />

                  <textarea
                    rows={2}
                    value={sc.text}
                    onChange={(e) => updateScene(idx, { text: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />

                  {/* Hybrid Custom Mascot Pose Upload per Scene */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {sc.customPreview ? (
                      <div className="flex items-center gap-2.5 bg-white px-2.5 py-1.5 rounded-lg border border-amber-200">
                        <img src={sc.customPreview} alt="Custom pose" className="w-8 h-8 object-contain rounded" />
                        <span className="text-[11px] font-bold text-amber-900">Pose Custom Aktif</span>
                        <select
                          value={sc.fxOverlay || "none"}
                          onChange={(e) => updateScene(idx, { fxOverlay: e.target.value })}
                          className="px-2 py-0.5 rounded border border-gray-200 text-[11px] bg-gray-50"
                        >
                          {FX_OPTIONS.map((fx) => (
                            <option key={fx.id} value={fx.id}>
                              {fx.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => updateScene(idx, { customImage: "", customPreview: undefined, fxOverlay: "none" })}
                          className="text-gray-400 hover:text-red-500"
                          title="Pakai karakter bawaan"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-gray-200 hover:border-amber-400 text-gray-600 hover:text-amber-800 cursor-pointer transition-colors">
                        <Upload className="w-3 h-3" />
                        Upload Gambar Karakter Sendiri (Hybrid)
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => handleUploadSceneMascot(idx, e)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Tema Mood, Kertas & Suara */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">3. Gaya Kertas, Tema Mood &amp; Suara</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_OPTIONS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    theme === t.id
                      ? "border-amber-600 bg-amber-50/40 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-900">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full border border-black/15" style={{ backgroundColor: t.bg }} />
                    <span className="w-4 h-4 rounded-full border border-black/15" style={{ backgroundColor: t.hl }} />
                    <span className="w-4 h-4 rounded-full border border-black/15" style={{ backgroundColor: t.ink }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
              {PAPER_OPTIONS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPaperStyle(p.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    paperStyle === p.id
                      ? "border-blue-600 bg-blue-50/40 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p className="text-[11px] font-bold text-gray-900">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.desc}</p>
                </div>
              ))}
            </div>

            {/* Suara Narasi & Upload Suara Asli */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Suara Narasi (Natural / Manusia)
                </label>
                <div className="flex items-center gap-2">
                  {useVoice && (
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer transition-colors">
                      <Mic className="w-3.5 h-3.5" />
                      Upload Suara Asli
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleUploadAudio("voice", e)}
                        className="hidden"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => setUseVoice(!useVoice)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      useVoice
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {useVoice ? "Suara: AKTIF" : "Suara: MATI (Hanya Musik & Teks)"}
                  </button>
                </div>
              </div>

              {useVoice && (customVoicePath ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mic className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-900 truncate">
                      Suara Asli Aktif: {customVoiceName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomVoicePath("");
                      setCustomVoiceName("");
                    }}
                    className="p-1 text-gray-500 hover:text-red-600"
                    title="Ganti ke suara TTS"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      {VOICE_OPTIONS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={intonation}
                      onChange={(e) => setIntonation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      {INTONATION_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Musik Latar (BGM) Toggle + Picker */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-indigo-600" /> Musik Latar Tipis (BGM)
                </label>
                <button
                  type="button"
                  onClick={() => setUseBgm(!useBgm)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    useBgm
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {useBgm ? "Musik: AKTIF" : "Musik: MATI (Tanpa Musik)"}
                </button>
              </div>

              {useBgm && (
                <div className="space-y-2.5 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                  {customBgmPath ? (
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-indigo-200">
                      <span className="text-xs font-bold text-indigo-900 truncate">
                        BGM Custom: {customBgmName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomBgmPath("");
                          setCustomBgmName("");
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={bgmTrack}
                        onChange={(e) => setBgmTrack(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white"
                      >
                        {BGM_OPTIONS.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 hover:border-indigo-400 text-gray-700 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" /> Upload MP3
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleUploadAudio("bgm", e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                      Volume Musik: {Math.round(bgmVolume * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.10}
                      max={0.55}
                      step={0.02}
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handlePreview(0)}
              disabled={isPreviewing || isRendering}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
            >
              <Eye className={`w-4 h-4 ${isPreviewing ? "animate-pulse" : ""}`} />
              {isPreviewing ? "Memproses Preview..." : "Preview Slide 1"}
            </button>

            <button
              type="button"
              onClick={handleRender}
              disabled={isRendering || isPreviewing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isRendering ? "animate-spin" : ""}`} />
              {isRendering ? "Me-render Animasi Stickman..." : "Render Video Stickman 9:16"}
            </button>
          </div>
        </div>

        {/* Preview / Player Column */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView("preview")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    activeView === "preview" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Frame Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("video")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    activeView === "video" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Video MP4
                </button>
              </div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                9:16 Reels
              </span>
            </div>

            <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto rounded-xl overflow-hidden bg-[#F9F6EE] shadow-lg border border-black/10 flex items-center justify-center">
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
                  alt="Stickman Doodle Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <Smile className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-xs">Klik &quot;Preview Slide&quot; atau &quot;Render Video&quot;.</p>
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="space-y-2 pt-2">
                <a
                  href={videoUrl}
                  download="stickman_story_reel.mp4"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download Video MP4
                </a>

                <Link
                  href="/dashboard/clipper/accounts"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-600" /> Auto-Publish ke Instagram / TikTok
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
