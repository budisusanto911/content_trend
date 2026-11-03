"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function LoginFormClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/user-auth/login" : "/api/user-auth/register";
      const payload =
        mode === "login"
          ? { identifier, password, rememberMe }
          : { name, username, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Gagal memproses autentikasi.");
        setIsLoading(false);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError("Gagal menghubungi server. Coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-[#1A1D27]">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-4">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            Trend Intel Studio
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            AI Content Creator, Video Clipper & Social Auto-Pilot
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                mode === "login"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                mode === "register"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Misal: Budi Susanto"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Misal: budi911"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Username atau Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username atau email"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                  <span>Ingat sesi login saya (30 hari)</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Masuk ke Dashboard" : "Buat Akun & Masuk"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

