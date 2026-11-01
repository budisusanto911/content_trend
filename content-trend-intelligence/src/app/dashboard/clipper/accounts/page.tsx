"use client";

import { useState, useEffect } from "react";
import { Users, Video, Camera, Plus, Key, CheckCircle2, Trash2, Tag } from "lucide-react";
import { NICHE_OPTIONS } from "@/lib/nicheConstants";

type Profile = {
  id: string;
  name: string;
  targetKeyword: string;
  category?: string | null;
  youtubeConnected: boolean;
  tiktokConnected: boolean;
  instagramConnected: boolean;
  igUsername?: string | null;
  youtubeChannelTitle?: string | null;
};

export default function PublisherAccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileKeyword, setNewProfileKeyword] = useState("");
  const [newProfileCategory, setNewProfileCategory] = useState<string>(NICHE_OPTIONS[0]);

  // Login Modal State (Removed for OAuth)
  
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
    
    // Cek jika baru kembali dari OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success')) {
      setStatusMessage({ text: "Autentikasi Meta/Instagram berhasil! Akun sudah terhubung.", type: 'success' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('oauth_error')) {
      setStatusMessage({ text: "Login gagal: " + params.get('oauth_error'), type: 'error' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("/api/profiles", {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Accept": "application/json",
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server merespon dengan status ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles || []);
      } else {
        throw new Error(data.error || "Gagal mengambil data profil");
      }
    } catch (e: any) {
      console.error("Gagal memuat profil:", e);
      setFetchError(e.name === 'AbortError' ? 'Koneksi timeout (server belum merespon dalam 8 detik)' : (e.message || "Gagal menghubungi server"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus profil ini?")) return;
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProfiles(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Gagal menghapus profil: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (e) {
      console.error("Gagal menghapus:", e);
      alert("Gagal menghubungi server untuk menghapus profil.");
    }
  };

  const handleAdd = async () => {
    if (!newProfileName.trim()) {
      alert("Nama profil wajib diisi.");
      return;
    }
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProfileName.trim(),
          targetKeyword: newProfileKeyword.trim() || newProfileCategory,
          category: newProfileCategory,
        })
      });
      
      const data = await res.json();

      if (data.success && data.profile) {
        setProfiles(prev => [data.profile, ...prev]);
        setNewProfileName("");
        setNewProfileKeyword("");
        setNewProfileCategory(NICHE_OPTIONS[0]);
        setIsAdding(false);
      } else {
        alert("Gagal menyimpan profil: " + (data.error || "Terjadi kesalahan."));
      }
    } catch (e) {
      console.error("API Error:", e);
      alert("Gagal menghubungi server untuk menyimpan profil.");
    }
  };

  const toggleConnection = async (id: string, platform: 'youtube' | 'tiktok' | 'instagram', currentStatus: boolean) => {
    const key = `${platform}Connected`;
    const newStatus = !currentStatus;
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, [key]: newStatus } : p));
      } else {
        alert("Gagal mengubah status koneksi: " + (data.error || ""));
      }
    } catch (e) {
      console.error("Gagal toggle koneksi:", e);
      alert("Gagal menghubungi server");
    }
  };

  const openLoginModal = (id: string, platform: 'youtube' | 'tiktok' | 'instagram') => {
    // Redirect ke sistem OAuth API resmi
    window.location.href = `/api/auth/${platform}?profile_id=${id}`;
  };


  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900">Publisher Accounts</h1>
            <p className="text-gray-500 text-xs sm:text-sm font-medium">Kelola akun tujuan upload untuk masing-masing tokoh</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" /> {isAdding ? "Batal" : "Tambah Profil"}
        </button>
      </div>

      {statusMessage && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-sm font-bold ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{statusMessage.text}</span>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 ml-4 underline"
          >
            Tutup
          </button>
        </div>
      )}

      {isAdding && (
        <div className="mb-8 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4 text-base text-gray-900">Tambah Profil Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Nama Profil *</label>
              <input 
                type="text" 
                placeholder="misal: Klip dr. Tirta" 
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Kategori / Niche *</label>
              <select
                value={newProfileCategory}
                onChange={e => setNewProfileCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
              >
                {NICHE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Target Keyword (Opsional)</label>
              <input 
                type="text" 
                placeholder="misal: podcast dr tirta" 
                value={newProfileKeyword}
                onChange={e => setNewProfileKeyword(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Batal
            </button>
            <button 
              onClick={handleAdd} 
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-sm transition"
            >
              Simpan Profil
            </button>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span>⚠️ {fetchError}</span>
          </div>
          <button 
            onClick={fetchProfiles}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Muat Ulang
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-3 text-gray-500 font-medium py-6">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data akun publisher...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.length === 0 && !isAdding && !fetchError && (
             <div className="text-gray-400 font-medium col-span-3 py-6">Belum ada profil. Silakan klik Tambah Profil.</div>
          )}
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{profile.name}</h3>
                  {profile.category && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200/60">
                      🎯 Niche: {profile.category}
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(profile.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6 flex-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Video (Keywords)</label>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-700 font-medium">
                  {profile.targetKeyword}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Tujuan Upload (Connected APIs)</label>
                <div className="space-y-3">
                  
                  {/* YouTube */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-bold text-gray-700">YouTube Shorts</span>
                    </div>
                    {profile.youtubeConnected ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {profile.youtubeChannelTitle ? `@${profile.youtubeChannelTitle}` : "Terhubung"}
                        </span>
                        <button 
                          onClick={() => toggleConnection(profile.id, 'youtube', true)}
                          className="text-[11px] text-gray-400 hover:text-red-500 font-semibold"
                          title="Putuskan koneksi"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleConnection(profile.id, 'youtube', false)}
                          className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-md transition-colors"
                          title="Hubungkan langsung"
                        >
                          ✓ Hubungkan
                        </button>
                        <button 
                          onClick={() => openLoginModal(profile.id, 'youtube')} 
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                          title="Login Google OAuth"
                        >
                          <Key className="w-3.5 h-3.5" /> OAuth
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TikTok */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-black rounded flex items-center justify-center text-white text-[10px] font-black">TT</div>
                      <span className="text-sm font-bold text-gray-700">TikTok</span>
                    </div>
                    {profile.tiktokConnected ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
                        </span>
                        <button 
                          onClick={() => toggleConnection(profile.id, 'tiktok', true)}
                          className="text-[11px] text-gray-400 hover:text-red-500 font-semibold"
                          title="Putuskan koneksi"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleConnection(profile.id, 'tiktok', false)}
                          className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-md transition-colors"
                          title="Hubungkan langsung"
                        >
                          ✓ Hubungkan
                        </button>
                        <button 
                          onClick={() => openLoginModal(profile.id, 'tiktok')} 
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                          title="Login TikTok OAuth"
                        >
                          <Key className="w-3.5 h-3.5" /> OAuth
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Instagram */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-pink-600" />
                      <span className="text-sm font-bold text-gray-700">Instagram Reels</span>
                    </div>
                    {profile.instagramConnected ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {profile.igUsername ? `@${profile.igUsername}` : "Terhubung"}
                        </span>
                        <button 
                          onClick={() => toggleConnection(profile.id, 'instagram', true)}
                          className="text-[11px] text-gray-400 hover:text-red-500 font-semibold"
                          title="Putuskan koneksi"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">

                        <button 
                          onClick={() => openLoginModal(profile.id, 'instagram')} 
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                          title="Login Meta OAuth"
                        >
                          <Key className="w-3.5 h-3.5" /> OAuth
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Login Modal Dihapus - Digantikan oleh Redirect OAuth Resmi */}
    </div>
  );
}

