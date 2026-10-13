"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Activity,
  Share2,
  HardDrive,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Globe,
  Radio,
  Sliders,
  Palette,
  Video,
  MessageSquare,
  Bell,
  Send,
  Check,
  Hash,
  Sparkles,
  Clock,
  AtSign,
} from "lucide-react";
import Link from "next/link";
import { AppSettings } from "@/lib/settingsStore";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [webhookFeedback, setWebhookFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Visibility toggle for secret inputs
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    youtube: false,
    ai: false,
    groq: false,
    igSecret: false,
  });

  // Settings State with all features
  const [settings, setSettings] = useState<AppSettings>({
    autoScrapeEnabled: true,
    scrapeIntervalHours: 8,
    defaultRegion: "ID",
    maxTrendingResults: 30,
    lastScrapedAt: null,
    cacheDurationMinutes: 480,

    subtitleTheme: "hormozi_yellow",
    watermarkText: "",
    showProgressBar: true,
    showTopHook: true,
    showSubtitles: true,

    captionTemplate: "{title}\n\n🔥 {hook}\n\n👇 Tonton video lengkapnya di channel kami!\n\n{hashtags}",
    defaultHashtags: "#shorts #reels #viral #trending #podcastindonesia",

    targetDurationMin: 30,
    targetDurationMax: 50,

    webhookType: "none",
    webhookUrl: "",

    autoClipEnabled: true,
    autoPublishEnabled: true,
  });

  // Environment Keys State
  const [envKeys, setEnvKeys] = useState({
    youtubeApiKey: "",
    aiApiKey: "",
    groqApiKey: "",
    instagramClientId: "",
    instagramClientSecret: "",
    nextPublicBaseUrl: "",
    hasYoutubeKey: false,
    hasAiKey: false,
    hasGroqKey: false,
    hasInstagramConfig: false,
  });

  // Connected Profiles, Storage Stats & Background Job Status
  const [profiles, setProfiles] = useState<any[]>([]);
  const [storage, setStorage] = useState({
    totalFiles: 0,
    sizeMb: "0",
    totalBytes: 0,
  });
  const [jobStatus, setJobStatus] = useState<any>(null);

  // 1. Fetch Real Data from /api/settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/settings", {
        cache: "no-store",
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
        if (data.envKeys) setEnvKeys(data.envKeys);
        if (data.profiles) setProfiles(data.profiles);
        if (data.storage) setStorage(data.storage);
        if (data.jobStatus) setJobStatus(data.jobStatus);
      }
    } catch (e: any) {
      console.error("Gagal load settings:", e);
      setFeedback({ type: "error", message: "Gagal memuat pengaturan dari server." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggleVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 2. Save Settings Handler
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          envUpdates: {
            youtubeApiKey: envKeys.youtubeApiKey,
            aiApiKey: envKeys.aiApiKey,
            groqApiKey: envKeys.groqApiKey,
            instagramClientId: envKeys.instagramClientId,
            instagramClientSecret: envKeys.instagramClientSecret,
            nextPublicBaseUrl: envKeys.nextPublicBaseUrl,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "Semua pengaturan, jadwal job, branding, dan template berhasil disimpan ke server!" });
        if (data.storage) setStorage(data.storage);
        if (data.jobStatus) setJobStatus(data.jobStatus);
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: "error", message: data.error || "Gagal menyimpan pengaturan." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat menyimpan pengaturan." });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Trigger Manual Scrape & Cache Sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({ ...prev, lastScrapedAt: data.lastScrapedAt }));
        if (data.jobStatus) setJobStatus(data.jobStatus);
        setFeedback({
          type: "success",
          message: data.message || "Sinkronisasi tren terbaru berhasil dijalankan!",
        });
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: "error", message: data.error || "Gagal melakukan sinkronisasi." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: "Gagal menghubungkan ke server sinkronisasi." });
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Test Webhook Handler
  const handleTestWebhook = async () => {
    if (settings.webhookType === "none" || !settings.webhookUrl.trim()) {
      setWebhookFeedback({
        type: "error",
        message: "Pilih provider webhook dan masukkan URL / token terlebih dahulu.",
      });
      return;
    }

    setIsTestingWebhook(true);
    setWebhookFeedback(null);
    try {
      const res = await fetch("/api/settings/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookType: settings.webhookType,
          webhookUrl: settings.webhookUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookFeedback({
          type: "success",
          message: data.message || "Test notifikasi berhasil dikirim!",
        });
        setTimeout(() => setWebhookFeedback(null), 5000);
      } else {
        setWebhookFeedback({
          type: "error",
          message: data.error || "Gagal mengirim notifikasi webhook.",
        });
      }
    } catch (e: any) {
      setWebhookFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menghubungi endpoint webhook.",
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // 5. Clear Temporary Files
  const handleCleanTemp = async () => {
    if (!confirm("Hapus file video/audio sementara hasil pemotongan? (File klip final tidak akan dihapus)")) return;
    setIsCleaning(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearTempFiles: true }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.storage) setStorage(data.storage);
        setFeedback({ type: "success", message: "File cache sementara berhasil dibersihkan!" });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      setFeedback({ type: "error", message: "Gagal membersihkan cache." });
    } finally {
      setIsCleaning(false);
    }
  };

  // Helper Tag Insertion
  const insertTag = (tag: string) => {
    setSettings((prev) => ({
      ...prev,
      captionTemplate: prev.captionTemplate ? `${prev.captionTemplate} ${tag}` : tag,
    }));
  };

  // Live preview of caption
  const sampleCaption = (settings.captionTemplate || "")
    .replace(/\{title\}/g, "Reaksi Tak Terduga Dr. Tirta Saat Ditantang Peragakan Konten Viral!")
    .replace(/\{hook\}/g, "DITANTANG BEGINI, REAKSI DR. TIRTA BIKIN KAGET!")
    .replace(/\{hashtags\}/g, settings.defaultHashtags || "#shorts #reels");

  // Format Helper
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "Belum pernah disinkronkan";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto space-y-6 sm:space-y-8 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Settings & Konfigurasi Sistem
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Kelola branding video, template caption otomatis, target durasi AI, notifikasi webhook, dan API keys.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all shrink-0 ${
            isSaving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95"
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </>
          )}
        </button>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: VIDEO BRANDING & STYLING PRESETS */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Preset Branding & Video Styling (Viral Retention)</h2>
            <p className="text-xs text-gray-500">
              Kustomisasi tampilan subtitle bergaya Alex Hormozi, watermark akun, dan toggle elemen penahan retensi.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Subtitle Theme Chooser */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Warna & Tema Subtitle Dinamis
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Hormozi Yellow */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, subtitleTheme: "hormozi_yellow" })}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  settings.subtitleTheme === "hormozi_yellow"
                    ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-400 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-gray-900">Alex Hormozi Yellow</span>
                  {settings.subtitleTheme === "hormozi_yellow" && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="inline-block px-3 py-1.5 rounded-lg bg-black text-[#FFFF00] font-black text-xs tracking-wider shadow-inner w-fit">
                  🔥 CONTOH TEKS SUBTITLE
                </div>
                <p className="text-[11px] text-gray-500">Kuning kontras tinggi (#FFFF00), standar video viral #1.</p>
              </button>

              {/* Option 2: Neon Green */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, subtitleTheme: "neon_green" })}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  settings.subtitleTheme === "neon_green"
                    ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-400 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-gray-900">Cyber Neon Green</span>
                  {settings.subtitleTheme === "neon_green" && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="inline-block px-3 py-1.5 rounded-lg bg-black text-[#00FF00] font-black text-xs tracking-wider shadow-inner w-fit">
                  ⚡ CONTOH TEKS SUBTITLE
                </div>
                <p className="text-[11px] text-gray-500">Hijau neon futuristik (#00FF00), sangat menonjol di dark theme.</p>
              </button>

              {/* Option 3: Clean White */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, subtitleTheme: "clean_white" })}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  settings.subtitleTheme === "clean_white"
                    ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-400 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-gray-900">Clean Classic White</span>
                  {settings.subtitleTheme === "clean_white" && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="inline-block px-3 py-1.5 rounded-lg bg-black text-white font-black text-xs tracking-wider shadow-inner w-fit">
                  ✨ CONTOH TEKS SUBTITLE
                </div>
                <p className="text-[11px] text-gray-500">Putih bersih elegan (#FFFFFF) dengan outline hitam tebal.</p>
              </button>
            </div>
          </div>

          {/* Watermark / Brand Handle */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <AtSign className="w-3.5 h-3.5 text-blue-600" /> Watermark Akun / Handle Brand
              </label>
              <span className="text-[11px] font-bold text-gray-400">Pojok Kanan Atas Video</span>
            </div>
            <input
              type="text"
              value={settings.watermarkText}
              onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
              placeholder="@gosip_yuk atau @nama_channel"
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <p className="text-[11px] text-gray-400">
              Jika diisi, teks ini akan dirender secara transparan (semi-transparan) di pojok kanan atas video agar konten tidak dibajak.
            </p>
          </div>

          {/* Visual Element Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Toggle 1: Top Hook Banner */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-gray-900">Banner Curiosity Hook</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Badge merah & judul hook di atas video</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.showTopHook}
                  onChange={(e) => setSettings({ ...settings, showTopHook: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Toggle 2: Dynamic Subtitles */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-gray-900">Subtitle Otomatis</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Teks perkataan sinkron suara di tengah</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.showSubtitles}
                  onChange={(e) => setSettings({ ...settings, showSubtitles: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Toggle 3: Progress Bar */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-gray-900">Bottom Progress Bar</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Garis merah penahan retensi penonton</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.showProgressBar}
                  onChange={(e) => setSettings({ ...settings, showProgressBar: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI CLIPPER TARGET DURATION */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Target Rentang Durasi Klip AI</h2>
            <p className="text-xs text-gray-500">
              Instruksikan model Gemini AI untuk memilih momen podcast dengan rentang durasi ideal penonton Shorts & Reels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Preset 1: 30-45 Detik */}
          <button
            type="button"
            onClick={() => setSettings({ ...settings, targetDurationMin: 30, targetDurationMax: 45 })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              settings.targetDurationMin === 30 && settings.targetDurationMax === 45
                ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-sm text-gray-900">30 – 45 Detik</span>
              {settings.targetDurationMin === 30 && settings.targetDurationMax === 45 && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-indigo-600 font-bold mb-1">Direkomendasikan (Algoritma Shorts)</p>
            <p className="text-[11px] text-gray-500">
              Tingkat retensi tuntas &gt; 90%, peluang paling tinggi direkomendasikan berulang kali oleh YouTube Shorts & IG Reels.
            </p>
          </button>

          {/* Preset 2: 45-60 Detik */}
          <button
            type="button"
            onClick={() => setSettings({ ...settings, targetDurationMin: 45, targetDurationMax: 60 })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              settings.targetDurationMin === 45 && settings.targetDurationMax === 60
                ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-sm text-gray-900">45 – 60 Detik</span>
              {settings.targetDurationMin === 45 && settings.targetDurationMax === 60 && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-700 font-bold mb-1">Mendalam & Edukatif</p>
            <p className="text-[11px] text-gray-500">
              Cocok untuk pembahasan podcast medis atau bisnis yang butuh penjelasan poin lebih komprehensif.
            </p>
          </button>

          {/* Preset 3: 20-35 Detik */}
          <button
            type="button"
            onClick={() => setSettings({ ...settings, targetDurationMin: 20, targetDurationMax: 35 })}
            className={`p-4 rounded-2xl border text-left transition-all ${
              settings.targetDurationMin === 20 && settings.targetDurationMax === 35
                ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-sm text-gray-900">20 – 35 Detik</span>
              {settings.targetDurationMin === 20 && settings.targetDurationMax === 35 && (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-700 font-bold mb-1">Ultra-Bite Punchline</p>
            <p className="text-[11px] text-gray-500">
              Format klip super padat, cocok untuk lelucon atau kalimat punchline tajam yang langsung habis.
            </p>
          </button>
        </div>
      </div>

      {/* SECTION 3: AUTO-CAPTION & HASHTAG TEMPLATE */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Template Caption & Bank Hashtag Otomatis</h2>
            <p className="text-xs text-gray-500">
              Format baku caption saat video diposting ke Instagram Reels dan YouTube Shorts secara otomatis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Side */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Template Format Caption
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400">Sisipkan Tag:</span>
                  <button
                    type="button"
                    onClick={() => insertTag("{title}")}
                    className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px] font-bold hover:bg-blue-100"
                  >
                    +{"{title}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag("{hook}")}
                    className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono text-[11px] font-bold hover:bg-amber-100"
                  >
                    +{"{hook}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag("{hashtags}")}
                    className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold hover:bg-emerald-100"
                  >
                    +{"{hashtags}"}
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={settings.captionTemplate}
                onChange={(e) => setSettings({ ...settings, captionTemplate: e.target.value })}
                placeholder="{title}&#10;&#10;🔥 {hook}&#10;&#10;{hashtags}"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3.5 text-xs font-mono text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-600" /> Bank Hashtag Default
              </label>
              <input
                type="text"
                value={settings.defaultHashtags}
                onChange={(e) => setSettings({ ...settings, defaultHashtags: e.target.value })}
                placeholder="#shorts #reels #viral #trending #podcast"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              <p className="text-[11px] text-gray-400">
                Akan otomatis menggantikan tag <code>{"{hashtags}"}</code> di dalam template caption postingan.
              </p>
            </div>
          </div>

          {/* Live Preview Side */}
          <div className="p-5 rounded-2xl bg-gray-900 text-white flex flex-col justify-between shadow-inner">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-400" /> Preview Hasil Postingan Nyata
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-800">
                  Live Preview
                </span>
              </div>
              <div className="text-xs font-sans whitespace-pre-wrap text-gray-200 leading-relaxed bg-black/40 p-4 rounded-xl border border-gray-800 font-mono">
                {sampleCaption}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 italic">
              *Teks <code>{"{title}"}</code> dan <code>{"{hook}"}</code> di atas akan otomatis digantikan oleh judul & kalimat penasaran AI yang dihasilkan saat pemotongan video.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: WEBHOOK NOTIFICATIONS (DISCORD & TELEGRAM) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Notifikasi Auto-Pilot (Discord & Telegram Webhook)</h2>
            <p className="text-xs text-gray-500">
              Terima pemberitahuan instan begitu AI selesai memotong video atau saat klip berhasil dipublish ke sosmed.
            </p>
          </div>
        </div>

        {/* Webhook Feedback Notification */}
        {webhookFeedback && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all ${
              webhookFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            {webhookFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{webhookFeedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Provider Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Platform Provider
            </label>
            <select
              value={settings.webhookType}
              onChange={(e) => setSettings({ ...settings, webhookType: e.target.value as any })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="none">❌ Nonaktif</option>
              <option value="discord">🎮 Discord Webhook</option>
              <option value="telegram">✈️ Telegram Bot</option>
            </select>
            <p className="text-[11px] text-gray-400">Pilih channel tujuan pengiriman alert otomatis.</p>
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {settings.webhookType === "telegram"
                  ? "Telegram Bot Token & Chat ID (format: BOT_TOKEN|CHAT_ID)"
                  : "Discord Webhook URL"}
              </label>
              {settings.webhookType !== "none" && (
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook || !settings.webhookUrl}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className={`w-3 h-3 ${isTestingWebhook ? "animate-pulse" : ""}`} />
                  <span>{isTestingWebhook ? "Mengirim..." : "Kirim Test Notifikasi"}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              disabled={settings.webhookType === "none"}
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder={
                settings.webhookType === "telegram"
                  ? "712345678:AAH...|987654321 atau https://api.telegram.org/bot.../sendMessage"
                  : "https://discord.com/api/webhooks/1234567890/..."
              }
              className={`w-full border rounded-xl px-4 py-2.5 text-xs font-mono outline-none shadow-sm transition-all ${
                settings.webhookType === "none"
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-cyan-500"
              }`}
            />
            <p className="text-[11px] text-gray-400">
              {settings.webhookType === "discord"
                ? "Dapatkan Webhook URL dari Server Settings -> Integrations -> Webhooks di Discord."
                : settings.webhookType === "telegram"
                ? "Masukkan BOT_TOKEN dan CHAT_ID yang dipisahkan garis vertikal '|', atau URL langsung endpoint sendMessage."
                : "Aktifkan provider terlebih dahulu untuk memasukkan URL tujuan."}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5: AUTO SCRAPE & TREND ENGINE */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Auto Scrape & Trend Engine (Background)</h2>
              <p className="text-xs text-gray-500">
                Atur jadwal otomatis dan target wilayah untuk scraping tren video terpopuler.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.autoScrapeEnabled}
              onChange={(e) => setSettings({ ...settings, autoScrapeEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Target Region */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-purple-600" /> Target Wilayah (Region)
            </label>
            <select
              value={settings.defaultRegion}
              onChange={(e) => setSettings({ ...settings, defaultRegion: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ID">🇮🇩 Indonesia (ID)</option>
              <option value="US">🇺🇸 United States (US)</option>
              <option value="JP">🇯🇵 Jepang (JP)</option>
              <option value="GB">🇬🇧 United Kingdom (GB)</option>
              <option value="KR">🇰🇷 Korea Selatan (KR)</option>
            </select>
            <p className="text-[11px] text-gray-400">Menentukan negara asal trending video yang diambil.</p>
          </div>

          {/* Interval Scrape */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-purple-600" /> Jadwal Job Scraping
            </label>
            <select
              value={settings.scrapeIntervalHours}
              onChange={(e) => setSettings({ ...settings, scrapeIntervalHours: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={8}>3x Sehari — Setiap 8 Jam (Direkomendasikan)</option>
              <option value={12}>2x Sehari — Setiap 12 Jam</option>
              <option value={24}>1x Sehari — Setiap 24 Jam</option>
              <option value={6}>4x Sehari — Setiap 6 Jam</option>
              <option value={3}>8x Sehari — Setiap 3 Jam</option>
              <option value={1}>24x Sehari — Setiap 1 Jam (Aktif Tinggi)</option>
            </select>
            <p className="text-[11px] text-gray-400">Frekuensi job otomatis mengambil data trending di background.</p>
          </div>

          {/* Maksimal Video */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-purple-600" /> Jumlah Video Trending
            </label>
            <select
              value={settings.maxTrendingResults}
              onChange={(e) => setSettings({ ...settings, maxTrendingResults: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={20}>20 Video Teratas</option>
              <option value={30}>30 Video Teratas</option>
              <option value={50}>50 Video Teratas (Lengkap)</option>
            </select>
            <p className="text-[11px] text-gray-400">Batas jumlah data video per platform saat sync.</p>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div>
                <p className="text-xs text-gray-500">Status Background Job:</p>
                <p className="text-sm font-extrabold text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.autoScrapeEnabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  {settings.autoScrapeEnabled
                    ? `Aktif (${Math.max(1, Math.round(24 / (settings.scrapeIntervalHours || 8)))}x Sehari)`
                    : "Nonaktif"}
                  {jobStatus && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {jobStatus.dailyRunCount}/{jobStatus.dailyMaxRuns} hari ini
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Terakhir Disinkronkan:</p>
                <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                  {formatTime(jobStatus?.lastScrapedAt || settings.lastScrapedAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Jadwal Job Berikutnya:</p>
                <p className="text-sm font-extrabold text-purple-700 mt-0.5">
                  {settings.autoScrapeEnabled
                    ? formatTime(jobStatus?.nextScheduledAt || null)
                    : "Menunggu diaktifkan"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyinkronkan Data..." : "Jalankan Job Sekarang"}</span>
            </button>
          </div>

          {jobStatus?.logs && jobStatus.logs.length > 0 && (
            <div className="border-t border-gray-200/70 pt-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Riwayat Eksekusi Job Terakhir
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {jobStatus.logs.slice(0, 3).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-xl border border-gray-100"
                  >
                    <span className="font-semibold text-gray-700 truncate">{log.message}</span>
                    <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: API KEYS & PLATFORM INTEGRATIONS */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">API Keys & External Integrations</h2>
            <p className="text-xs text-gray-500">
              Kunci API tersimpan langsung di file konfigurasi server (`.env`) dan digunakan oleh pipeline AI.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* 1. YouTube Data API v3 */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                YouTube Data API v3 Key
              </label>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  envKeys.hasYoutubeKey
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${envKeys.hasYoutubeKey ? "bg-emerald-500" : "bg-amber-500"}`} />
                {envKeys.hasYoutubeKey ? "Aktif & Tersambung" : "Belum Dikonfigurasi"}
              </span>
            </div>
            <div className="relative">
              <input
                type={showKeys.youtube ? "text" : "password"}
                value={envKeys.youtubeApiKey}
                onChange={(e) => setEnvKeys({ ...envKeys, youtubeApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900 pr-10 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("youtube")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showKeys.youtube ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Digunakan untuk scraping trending videos, metrik penonton, dan pencarian video YouTube.
            </p>
          </div>

          {/* 2. Google Gemini AI API Key */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                Google Gemini AI Key (AI_API_KEY)
              </label>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  envKeys.hasAiKey
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${envKeys.hasAiKey ? "bg-emerald-500" : "bg-red-500"}`} />
                {envKeys.hasAiKey ? "Aktif (Gemini 3.6 Flash)" : "Kosong"}
              </span>
            </div>
            <div className="relative">
              <input
                type={showKeys.ai ? "text" : "password"}
                value={envKeys.aiApiKey}
                onChange={(e) => setEnvKeys({ ...envKeys, aiApiKey: e.target.value })}
                placeholder="AI key..."
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900 pr-10 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("ai")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showKeys.ai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Digunakan oleh AI Clipper Pipeline untuk analisis momen viral, pembuatan Curiosity Hook, dan SEO Caption.
            </p>
          </div>

          {/* 3. Groq Cloud AI API Key */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                Groq Cloud API Key (GROQ_API_KEY)
              </label>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  envKeys.hasGroqKey
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${envKeys.hasGroqKey ? "bg-emerald-500" : "bg-amber-500"}`} />
                {envKeys.hasGroqKey ? "Aktif (High Speed LLM)" : "Belum Diset"}
              </span>
            </div>
            <div className="relative">
              <input
                type={showKeys.groq ? "text" : "password"}
                value={envKeys.groqApiKey}
                onChange={(e) => setEnvKeys({ ...envKeys, groqApiKey: e.target.value })}
                placeholder="gsk_..."
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900 pr-10 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("groq")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showKeys.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Model inferensi cepat alternatif untuk perumusan ide konten dan analisis script kilat.
            </p>
          </div>

          {/* 4. Public Base URL (Ngrok / Domain) */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                Public Base URL (NEXT_PUBLIC_BASE_URL)
              </label>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" /> Wajib untuk Instagram Reels
              </span>
            </div>
            <input
              type="text"
              value={envKeys.nextPublicBaseUrl}
              onChange={(e) => setEnvKeys({ ...envKeys, nextPublicBaseUrl: e.target.value })}
              placeholder="https://your-domain.ngrok-free.dev"
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            <p className="text-[11px] text-gray-400">
              Domain publik aktif (Ngrok atau domain server). Meta Graph API membutuhkan URL publik ini untuk mengunduh video klip saat publish Reels.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 7: PUBLISHER ACCOUNTS OVERVIEW */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Akun Publisher Terhubung</h2>
              <p className="text-xs text-gray-500">Status akun media sosial yang aktif dan siap menerima auto-publish.</p>
            </div>
          </div>

          <Link
            href="/dashboard/clipper/accounts"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Kelola Akun</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.length > 0 ? (
            profiles.map((p) => (
              <div key={p.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-gray-900">{p.name}</span>
                  <span className="text-[10px] bg-gray-200 font-bold px-2 py-0.5 rounded-full text-gray-700">
                    ID: {p.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Instagram:</span>
                    <span className={`font-bold ${p.instagramConnected ? "text-pink-600" : "text-gray-400"}`}>
                      {p.instagramConnected ? `@${p.igUsername || "Terhubung"}` : "Belum Terhubung"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">YouTube:</span>
                    <span className={`font-bold ${p.youtubeConnected ? "text-red-600" : "text-gray-400"}`}>
                      {p.youtubeConnected ? `@${p.youtubeChannelTitle || "Terhubung"}` : "Belum Terhubung"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 text-center col-span-2">
              Belum ada akun publisher terdaftar. Buka halaman Publisher Accounts untuk menghubungkan akun.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 8: STORAGE & CACHE CLEANER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Penyimpanan & Cache Server</h2>
            <p className="text-xs text-gray-500">Pantau penggunaan disk untuk video klip dan bersihkan file sementara.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Video Tersimpan</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{storage.totalFiles} File Klip</p>
            <p className="text-xs text-gray-400 mt-0.5">Tersimpan di direktori `public/clips/`</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ukuran Disk Klip</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{storage.sizeMb} MB</p>
            <p className="text-xs text-gray-400 mt-0.5">Total ukuran file video hasil render</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleCleanTemp}
            disabled={isCleaning}
            className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-2 border border-red-200 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>{isCleaning ? "Membersihkan..." : "Bersihkan File Cache Sementara"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
