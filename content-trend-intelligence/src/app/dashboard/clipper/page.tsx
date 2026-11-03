"use client";

import { useState, useEffect } from "react";
import {
  Scissors,
  Play,
  Download,
  Settings,
  Video,
  Clock,
  AlertCircle,
  Share2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Camera,
  Send,
  AtSign,
} from "lucide-react";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
      <polygon points="10 15 15 12 10 9 10 15"/>
    </svg>
  );
}

export default function ClipperPage() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [clipTitle, setClipTitle] = useState<string>("Momen Viral Hasil AI");
  const [clipBadge, setClipBadge] = useState<string>("");
  const [clipHook, setClipHook] = useState<string>("");
  const [clipTags, setClipTags] = useState<string[]>([]);
  const [clipHashtags, setClipHashtags] = useState<string[]>([]);
  const [processLogs, setProcessLogs] = useState<string>("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "youtube"]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [publishFeedback, setPublishFeedback] = useState<{
    success: boolean;
    message: string;
    links?: { platform: string; url: string }[];
  } | null>(null);

  // 1. Load Last Generated Clip saat refresh agar tidak hilang
  useEffect(() => {
    const fetchLastClip = async () => {
      try {
        const res = await fetch("/api/clip/last", {
          cache: "no-store",
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await res.json();
        if (data.success && data.clip) {
          setOutputFile(data.clip.outputFile);
          if (data.clip.title) setClipTitle(data.clip.title);
          if (data.clip.badge) setClipBadge(data.clip.badge);
          if (data.clip.hook) setClipHook(data.clip.hook);
          if (data.clip.tags) setClipTags(data.clip.tags);
          if (data.clip.hashtags) setClipHashtags(data.clip.hashtags);
          if (data.clip.sourceUrl) setUrl(data.clip.sourceUrl);
          setStatus("success");

          if (data.clip.publishedTo && data.clip.publishedTo.length > 0) {
            const successfulPubs = data.clip.publishedTo.filter((p: any) => p.success && p.permalink);
            if (successfulPubs.length > 0) {
              setPublishFeedback({
                success: true,
                message: `Video telah terpublikasi (${successfulPubs.map((p: any) => p.platform).join(", ")})!`,
                links: successfulPubs.map((p: any) => ({ platform: p.platform, url: p.permalink })),
              });
            }
          }
        }
      } catch (err) {
        console.warn("Gagal memuat clip terakhir:", err);
      }
    };

    fetchLastClip();
  }, []);

  // 2. Load Profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch("/api/profiles", {
          cache: "no-store",
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await response.json();
        if (data && data.success && data.profiles) {
          setProfiles(data.profiles);
          if (data.profiles.length > 0) {
            // Pilih profil yang punya akun terhubung atau profil pertama
            const connected =
              data.profiles.find(
                (p: any) =>
                  p.instagramConnected ||
                  p.youtubeConnected ||
                  p.facebookConnected ||
                  p.threadsConnected
              ) || data.profiles[0];
            setSelectedProfileId(connected.id);

            const activePlatforms: string[] = [];
            if (connected.instagramConnected) activePlatforms.push("instagram");
            if (connected.youtubeConnected) activePlatforms.push("youtube");
            if (connected.facebookConnected) activePlatforms.push("facebook");
            if (connected.threadsConnected) activePlatforms.push("threads");
            if (activePlatforms.length > 0) setSelectedPlatforms(activePlatforms);
          }
        }
      } catch (error) {
        console.warn("Gagal memuat profil:", error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // 3. Polling Real-time Logs saat video sedang diproses
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/logs", {
            cache: "no-store",
            headers: { "ngrok-skip-browser-warning": "true" },
          });
          const data = await res.json();
          if (data.logs) {
            setProcessLogs(data.logs);
            if (data.logs.includes("SEMUA FASE SELESAI")) {
              setStatus("success");
              setOutputFile("/clips/final_ready_to_upload.mp4");
              setIsProcessing(false);
            } else if (data.logs.includes("Terjadi kesalahan pada pipeline:")) {
              setStatus("error");
              setIsProcessing(false);
            }
          }
        } catch (e) {}
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Handler: Potong Video
  const handleClip = async () => {
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      alert("Error: Masukkan URL YouTube yang valid (contoh: https://www.youtube.com/watch?v=...)");
      return;
    }

    setIsProcessing(true);
    setStatus("processing");
    setProcessLogs("");
    setPublishFeedback(null);
    fetch("/api/logs", { method: "DELETE" }).catch(() => {});

    try {
      const response = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          profileId: selectedProfileId,
          autoPublish,
          platforms: selectedPlatforms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setOutputFile(data.outputFile);
        if (data.clip?.title) setClipTitle(data.clip.title);
        if (data.clip?.badge) setClipBadge(data.clip.badge);
        if (data.clip?.hook) setClipHook(data.clip.hook);
        if (data.clip?.tags) setClipTags(data.clip.tags);
        if (data.clip?.hashtags) setClipHashtags(data.clip.hashtags);
        setIsProcessing(false);

        // Jika auto-publish aktif
        if (autoPublish && data.publishResults && data.publishResults.length > 0) {
          const successfulPubs = data.publishResults.filter((r: any) => r.success && r.permalink);
          const hasError = data.publishResults.some((r: any) => !r.success);

          if (successfulPubs.length > 0) {
            setPublishFeedback({
              success: true,
              message: `Auto-Publish Berhasil ke ${successfulPubs.map((p: any) => p.platform).join(" & ")}!`,
              links: successfulPubs.map((p: any) => ({ platform: p.platform, url: p.permalink })),
            });
          } else if (hasError) {
            const errs = data.publishResults.map((r: any) => `${r.platform}: ${r.error}`).join(" | ");
            setPublishFeedback({
              success: false,
              message: "Auto-Publish Gagal: " + errs,
            });
          }
        }
      } else {
        setStatus((prev) => (prev === "success" ? "success" : "error"));
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error backend:", error);
    }
  };

  // Handler: Manual Publish
  const handleManualPublish = async () => {
    if (!selectedProfileId) {
      alert("Pilih akun publisher tujuan terlebih dahulu!");
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert("Pilih minimal satu platform untuk dipublish!");
      return;
    }

    setIsPublishing(true);
    setPublishFeedback(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedProfileId,
          platforms: selectedPlatforms,
          customTitle: clipTitle,
          tags: clipTags,
          hashtags: clipHashtags,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const successfulPubs = data.results?.filter((r: any) => r.success && r.permalink) || [];
        setPublishFeedback({
          success: true,
          message: `Berhasil dipublish ke akun ${data.profileName}!`,
          links: successfulPubs.map((p: any) => ({ platform: p.platform, url: p.permalink })),
        });
      } else {
        const failedMsg =
          data.results?.map((r: any) => `${r.platform}: ${r.error}`).join(" | ") ||
          data.error ||
          "Gagal mempublish video";
        setPublishFeedback({
          success: false,
          message: failedMsg,
        });
      }
    } catch (err: any) {
      setPublishFeedback({
        success: false,
        message: err.message || "Gagal menghubungi server saat publish",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900">AI Video Clipper & Publisher</h1>
            <p className="text-gray-500 text-xs sm:text-sm font-medium">Potong video YouTube dan publish otomatis ke Instagram Reels & Shorts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form & Pengaturan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" /> Sumber Video YouTube
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">URL Video</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              {/* Mode Pemilihan Momen */}
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-900">AI Viral Moment Detection (Whisper + Gemini)</h4>
                  <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                    AI otomatis mentranskrip audio, menemukan durasi terbaik (30-60 detik), dan memotong serta mem-blur background untuk rasio 9:16 vertikal.
                  </p>
                </div>
              </div>

              {/* PENGATURAN TARGET AKUN & AUTO-PUBLISH */}
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" /> Konfigurasi Target Akun & Mode Publish
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dropdown Akun */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Target Akun Publisher
                    </label>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                      {profiles.map((p) => {
                        const conns = [];
                        if (p.instagramConnected) conns.push(`IG: @${p.igUsername || "Terhubung"}`);
                        if (p.youtubeConnected) conns.push(`YT: @${p.youtubeChannelTitle || "Terhubung"}`);
                        if (p.facebookConnected) conns.push(`FB: ${p.facebookPageName || "Terhubung"}`);
                        if (p.threadsConnected) conns.push(`Threads: @${p.threadsUsername || "Terhubung"}`);
                        const suffix = conns.length > 0 ? ` (${conns.join(" | ")})` : "";
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name}{suffix}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Platform Checkbox */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Platform Tujuan Upload
                    </label>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => togglePlatform("instagram")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          selectedPlatforms.includes("instagram")
                            ? "bg-pink-600 text-white shadow-sm ring-2 ring-pink-400/50"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title={selectedProfile?.instagramConnected ? "Instagram terhubung" : "Instagram belum terhubung"}
                      >
                        <InstagramIcon className="w-3.5 h-3.5" /> Instagram Reels
                        {selectedProfile?.instagramConnected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Akun terhubung" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePlatform("youtube")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          selectedPlatforms.includes("youtube")
                            ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400/50"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title={selectedProfile?.youtubeConnected ? "YouTube terhubung" : "YouTube belum terhubung"}
                      >
                        <YoutubeIcon className="w-3.5 h-3.5" /> YouTube Shorts
                        {selectedProfile?.youtubeConnected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Akun terhubung" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePlatform("facebook")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          selectedPlatforms.includes("facebook")
                            ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title={selectedProfile?.facebookConnected ? "Facebook terhubung" : "Facebook belum terhubung"}
                      >
                        <span className="w-3.5 h-3.5 rounded bg-white/20 flex items-center justify-center font-black text-[10px]">f</span> Facebook Reels
                        {selectedProfile?.facebookConnected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Akun terhubung" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePlatform("threads")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          selectedPlatforms.includes("threads")
                            ? "bg-gray-900 text-white shadow-sm ring-2 ring-gray-400/50"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title={selectedProfile?.threadsConnected ? "Threads terhubung" : "Threads belum terhubung"}
                      >
                        <AtSign className="w-3.5 h-3.5" /> Threads
                        {selectedProfile?.threadsConnected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Akun terhubung" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checkbox: Auto-Publish vs Manual */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-bold text-gray-800">
                        ⚡ Auto-Publish langsung setelah video selesai
                      </span>
                      <p className="text-xs text-gray-500">
                        {autoPublish
                          ? "Video akan langsung diupload ke Instagram Reels begitu AI selesai memotong video."
                          : "Mode Manual aktif: Anda bisa mem-preview video terlebih dahulu sebelum mengklik tombol Publish."}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Tombol Mulai Potong Video */}
            <button
              onClick={handleClip}
              disabled={isProcessing || !url}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                isProcessing || !url
                  ? "bg-gray-300 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sedang Memproses Video dengan AI...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  <span>Mulai Potong Video</span>
                </>
              )}
            </button>

            {/* Terminal Logs Output */}
            {isProcessing && (
              <div className="mt-6 bg-gray-900 rounded-2xl p-4 overflow-hidden border border-gray-800 shadow-inner">
                <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-400 ml-2 font-mono">Terminal Output Pipeline</span>
                </div>
                <div className="h-44 overflow-y-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap flex flex-col-reverse">
                  {processLogs ? processLogs : "Menyiapkan AI Pipeline..."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Hasil Video & Tombol Publish Manual */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600" /> Hasil Klip Video
              </h3>
              {outputFile && (
                <span className="text-[11px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                  Tersimpan di Disk
                </span>
              )}
            </div>

            {outputFile ? (
              <div className="space-y-4">
                {/* Feedback Publish Message */}
                {publishFeedback && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-bold border flex flex-col gap-1.5 ${
                      publishFeedback.success
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-red-50 text-red-900 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{publishFeedback.message}</span>
                    </div>
                    {publishFeedback.links && publishFeedback.links.length > 0 && (
                      <div className="flex flex-col gap-1 pt-1">
                        {publishFeedback.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold"
                          >
                            <span>
                              Lihat di{" "}
                              {link.platform === "instagram"
                                ? "Instagram Reels"
                                : link.platform === "youtube"
                                ? "YouTube Shorts"
                                : link.platform === "facebook"
                                ? "Facebook Reels"
                                : link.platform === "threads"
                                ? "Threads"
                                : link.platform}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Video Player 9:16 */}
                <div className="bg-black rounded-2xl overflow-hidden aspect-[9/16] w-full max-w-[280px] mx-auto shadow-2xl relative border border-gray-800">
                  <video
                    src={`${outputFile}?v=${new Date().getTime()}`}
                    controls
                    className="w-full h-full object-cover"
                    loop
                    muted
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-white text-[11px] font-bold">9:16 Vertikal</span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  {clipBadge && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200 shadow-sm">
                      {clipBadge}
                    </span>
                  )}
                  {clipHook && (
                    <div className="bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-left">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Top Curiosity Hook (Anti-Skip)</p>
                      <p className="text-xs font-black text-amber-950 mt-0.5">&ldquo;{clipHook}&rdquo;</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Judul Momen (Caption)</p>
                    <p className="text-sm font-extrabold text-gray-900 mt-0.5">{clipTitle}</p>
                  </div>

                  {clipHashtags && clipHashtags.length > 0 && (
                    <div className="text-left bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Hashtags Konten (Instagram & Shorts)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {clipHashtags.map((ht, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold text-pink-600 bg-pink-50 border border-pink-200/80 px-2 py-0.5 rounded-md"
                          >
                            {ht}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {clipTags && clipTags.length > 0 && (
                    <div className="text-left bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <YoutubeIcon className="w-3.5 h-3.5 text-red-500" /> Tags SEO YouTube (Pencarian Algoritma)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {clipTags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-semibold text-gray-700 bg-gray-200/80 px-2 py-0.5 rounded-md"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* TOMBOL MANUAL PUBLISH */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <button
                    onClick={handleManualPublish}
                    disabled={isPublishing || isProcessing}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                      isPublishing
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 shadow-pink-200"
                    }`}
                  >
                    {isPublishing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Mempublish ke Meta API...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Publish Sekarang</span>
                      </>
                    )}
                  </button>

                  <a
                    href={outputFile}
                    download="final_clip.mp4"
                    className="w-full py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2 text-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File MP4
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-600">Belum Ada Video</p>
                <p className="text-xs text-gray-400 mt-1">
                  Masukkan link YouTube di samping lalu klik "Mulai Potong Video".
                </p>
              </div>
            )}
          </div>

          {/* Info Akun Terpilih */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-3xl p-5">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
              Akun Aktif Saat Ini
            </h4>
            {selectedProfile ? (
              <div className="space-y-3">
                <p className="text-base font-black text-gray-900">{selectedProfile.name}</p>
                <div className="space-y-2 pt-1 border-t border-indigo-100/60">
                  {/* Status Instagram */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-gray-700">
                      <InstagramIcon className="w-3.5 h-3.5 text-pink-600" /> Instagram Reels
                    </span>
                    {selectedProfile.instagramConnected ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> @{selectedProfile.igUsername || "Terhubung"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        Belum terhubung
                      </span>
                    )}
                  </div>

                  {/* Status YouTube */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-gray-700">
                      <YoutubeIcon className="w-3.5 h-3.5 text-red-600" /> YouTube Shorts
                    </span>
                    {selectedProfile.youtubeConnected ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> @{selectedProfile.youtubeChannelTitle || "Terhubung"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        Belum terhubung
                      </span>
                    )}
                  </div>

                  {/* Status Facebook */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-gray-700">
                      <span className="w-3.5 h-3.5 bg-blue-600 text-white rounded flex items-center justify-center font-black text-[9px]">f</span> Facebook Reels
                    </span>
                    {selectedProfile.facebookConnected ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {selectedProfile.facebookPageName || "Terhubung"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        Belum terhubung
                      </span>
                    )}
                  </div>

                  {/* Status Threads */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-gray-700">
                      <AtSign className="w-3.5 h-3.5 text-gray-900" /> Threads
                    </span>
                    {selectedProfile.threadsConnected ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> @{selectedProfile.threadsUsername || "Terhubung"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        Belum terhubung
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Memuat profil...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
