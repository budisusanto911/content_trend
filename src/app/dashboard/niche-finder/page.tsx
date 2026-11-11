"use client";

import { useEffect, useState } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  Compass, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Mail, 
  Target, 
  Flame, 
  Zap, 
  DollarSign, 
  ShieldCheck,
  ChevronRight,
  Bookmark
} from "lucide-react";
import Link from "next/link";

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

interface NicheAnalysisResult {
  nicheName: string;
  category: string;
  opportunityScore: number;
  momentum: "Explosive" | "High" | "Moderate";
  competitionLevel: "Low" | "Medium" | "High";
  videoCount: number;
  totalViews: number;
  avgEngagementRate: string;
  sampleTopics: string[];
  brandingKit: {
    suggestedGoogleAccount: {
      accountName: string;
      emailIdea: string;
      channelName: string;
    };
    suggestedInstagramAccount: {
      username: string;
      displayName: string;
      bio: string;
      nicheKeywords: string[];
      contentPillars: string[];
    };
  };
  whyItWorks: string;
  monetizationIdea: string;
}

export default function NicheFinderPage() {
  const [niches, setNiches] = useState<NicheAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<NicheAnalysisResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchNiches = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/niche-finder${force ? "?refresh=true" : ""}`);
      const data = await res.json();
      if (data.success && data.niches && data.niches.length > 0) {
        setNiches(data.niches);
        setSelectedNiche(data.niches[0]);
      } else {
        setErrorMsg(data.error || "Tidak ada data niche yang dapat dimuat.");
      }
    } catch (err: any) {
      console.error("Failed to load niches", err);
      setErrorMsg(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNiches();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6">
        <div className="h-10 bg-gray-200/60 rounded-xl w-72 animate-pulse" />
        <div className="h-4 bg-gray-200/60 rounded-lg w-96 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200/50 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-2 h-[500px] bg-gray-200/50 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 mb-2">
            <Sparkles size={13} />
            <span>AI Niche Matcher & Account Setup</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Niche Naik Daun & Setup Akun
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Temukan ceruk pasar (*niche*) dengan persaingan rendah & pertumbuhan eksplosif, lengkap dengan rekomendasi akun Google & Instagram siap pakai.
          </p>
        </div>

        <button
          onClick={() => fetchNiches(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin text-blue-600" : ""} />
          <span>{refreshing ? "Menganalisis..." : "Scan Ulang Niche"}</span>
        </button>
      </div>

      {/* Error / Alert Notice */}
      {errorMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => fetchNiches(true)}
            className="text-xs font-bold text-amber-900 underline hover:no-underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      {niches.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Compass size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Belum Ada Data Niche</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Klik tombol di bawah untuk memindai tren YouTube dan merumuskan niche serta kit akun Google & Instagram.
          </p>
          <button
            onClick={() => fetchNiches(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all inline-flex items-center gap-2"
          >
            <RefreshCw size={15} />
            <span>Mulai Scan Sekarang</span>
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Niche Cards List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            <span>Daftar Niche Teratas</span>
            <span>Skor Potensi</span>
          </div>

          {niches.map((niche, idx) => {
            const isSelected = selectedNiche?.nicheName === niche.nicheName;
            return (
              <div
                key={idx}
                onClick={() => setSelectedNiche(niche)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-white border-blue-600 shadow-md shadow-blue-50/50 ring-2 ring-blue-500/10"
                    : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {niche.category}
                    </span>
                    <h3 className="font-bold text-gray-900 mt-2 text-base leading-snug">
                      {niche.nicheName}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-green-50 text-green-700 font-black text-xs">
                      <Zap size={11} fill="currentColor" />
                      {niche.opportunityScore}/100
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs text-gray-500">
                  <span className="flex items-center gap-1 font-semibold">
                    <Flame size={13} className="text-orange-500" />
                    {niche.momentum}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium">
                    Persaingan: <b className="text-gray-700">{niche.competitionLevel}</b>
                  </span>
                  <ChevronRight size={16} className={`ml-auto ${isSelected ? "text-blue-600" : "text-gray-300"}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Blueprint & Setup Kit */}
        {selectedNiche && (
          <div className="lg:col-span-7 space-y-6">
            {/* Overview Banner */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-300 border border-white/10">
                  {selectedNiche.category}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                  <TrendingUp size={12} /> Momentum: {selectedNiche.momentum}
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight">{selectedNiche.nicheName}</h2>
              <p className="text-gray-300 text-sm mt-2 leading-relaxed">{selectedNiche.whyItWorks}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
                <div>
                  <p className="text-gray-400 font-medium">Tingkat Persaingan</p>
                  <p className="text-base font-bold text-white mt-0.5">{selectedNiche.competitionLevel}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Ide Monetisasi</p>
                  <p className="text-xs font-semibold text-emerald-300 mt-1 line-clamp-2">
                    {selectedNiche.monetizationIdea}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-gray-400 font-medium">Contoh Topik Hangat</p>
                  <p className="text-xs text-gray-200 mt-1 font-mono truncate">
                    {selectedNiche.sampleTopics[0] || "Topik Populer"}
                  </p>
                </div>
              </div>
            </div>

            {/* Google Account Blueprint */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm hover:border-gray-200 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Setup Akun Google & YouTube</h3>
                    <p className="text-xs text-gray-500">Gunakan untuk membuat Gmail, YouTube Channel, & Google Drive khusus niche</p>
                  </div>
                </div>
                <Link
                  href="https://accounts.google.com/signup"
                  target="_blank"
                  className="inline-flex items-center justify-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-xl transition-all w-fit"
                >
                  <span>Buka Google</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Akun / Profil</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-sm text-gray-900 truncate">
                      {selectedNiche.brandingKit.suggestedGoogleAccount.accountName}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedNiche.brandingKit.suggestedGoogleAccount.accountName, "g_name")}
                      className="text-gray-400 hover:text-gray-700 p-1"
                    >
                      {copiedKey === "g_name" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saran Alamat Gmail</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-xs text-blue-600 font-mono truncate">
                      {selectedNiche.brandingKit.suggestedGoogleAccount.emailIdea}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedNiche.brandingKit.suggestedGoogleAccount.emailIdea, "g_email")}
                      className="text-gray-400 hover:text-gray-700 p-1"
                    >
                      {copiedKey === "g_email" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Channel YouTube</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-sm text-red-600 truncate flex items-center gap-1.5">
                      <YoutubeIcon className="w-4 h-4 text-red-600" /> {selectedNiche.brandingKit.suggestedGoogleAccount.channelName}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedNiche.brandingKit.suggestedGoogleAccount.channelName, "g_yt")}
                      className="text-gray-400 hover:text-gray-700 p-1"
                    >
                      {copiedKey === "g_yt" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instagram Account Blueprint */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-7 shadow-sm hover:border-gray-200 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-100 shrink-0">
                    <InstagramIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Setup Akun Instagram</h3>
                    <p className="text-xs text-gray-500">Handle, Display Name, Bio yang menarik, & Hashtags pilar</p>
                  </div>
                </div>
                <Link
                  href="https://www.instagram.com/accounts/emailsignup/"
                  target="_blank"
                  className="inline-flex items-center justify-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-700 bg-pink-50 px-3 py-1.5 rounded-xl transition-all w-fit"
                >
                  <span>Buka IG</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              <div className="space-y-4 mt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Username (@Handle)</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-sm text-gray-900 font-mono">
                        {selectedNiche.brandingKit.suggestedInstagramAccount.username}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedNiche.brandingKit.suggestedInstagramAccount.username, "ig_user")}
                        className="text-gray-400 hover:text-gray-700 p-1"
                      >
                        {copiedKey === "ig_user" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Tampilan (Display Name)</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-sm text-gray-900 truncate">
                        {selectedNiche.brandingKit.suggestedInstagramAccount.displayName}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedNiche.brandingKit.suggestedInstagramAccount.displayName, "ig_name")}
                        className="text-gray-400 hover:text-gray-700 p-1"
                      >
                        {copiedKey === "ig_name" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bio Box */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Formula Bio Instagram</span>
                    <button
                      onClick={() => handleCopy(selectedNiche.brandingKit.suggestedInstagramAccount.bio, "ig_bio")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      {copiedKey === "ig_bio" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                      <span>{copiedKey === "ig_bio" ? "Tersalin!" : "Salin Bio"}</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed font-sans bg-white p-3 rounded-xl border border-gray-200/60 shadow-inner">
                    {selectedNiche.brandingKit.suggestedInstagramAccount.bio}
                  </p>
                </div>

                {/* Content Pillars & Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Target size={13} /> 3 Pilar Konten Utama
                    </p>
                    <div className="space-y-1.5">
                      {selectedNiche.brandingKit.suggestedInstagramAccount.contentPillars.map((pillar, i) => (
                        <div key={i} className="text-xs bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-medium">{pillar}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Bookmark size={13} /> Keywords & Hashtags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNiche.brandingKit.suggestedInstagramAccount.nicheKeywords.map((kw, i) => (
                        <span key={i} className="text-xs bg-blue-50/70 text-blue-700 font-semibold px-2.5 py-1 rounded-md">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action to Clipper / Analyzer */}
            <div className="p-5 bg-blue-50/80 border border-blue-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Mau langsung bikin konten untuk niche ini?</h4>
                  <p className="text-xs text-gray-600">Gunakan AI Analyzer atau Auto Clipper untuk memproduksi konten otomatis.</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href="/dashboard/analyzer"
                  className="px-4 py-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 text-xs font-bold rounded-xl transition-all"
                >
                  Ke Analyzer
                </Link>
                <Link
                  href="/dashboard/clipper"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-xl shadow-md shadow-blue-200 transition-all"
                >
                  AI Clipper
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
