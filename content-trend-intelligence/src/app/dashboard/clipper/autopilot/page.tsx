"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  SkipForward,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Search,
  Camera,
  Video,
  ExternalLink,
  ThumbsUp,
  Pencil,
  X,
} from "lucide-react";

type Profile = {
  id: string;
  name: string;
  targetKeyword?: string;
  instagramConnected: boolean;
  youtubeConnected: boolean;
  igUsername?: string | null;
  youtubeChannelTitle?: string | null;
};

type WatchlistItem = {
  id: string;
  title: string;
  keywords: string[];
  matchCreator?: string;
  profileId: string;
  platforms: ("instagram" | "youtube")[];
  enabled: boolean;
  publishTime: string;
  requireApproval: boolean;
  maxClipsPerDay: number;
  lastPublishedDate?: string | null;
  readyCount: number;
  queuedCount: number;
  publishedCount: number;
};

type PublishLog = { platform: string; success: boolean; permalink?: string; error?: string };

type ClipJob = {
  id: string;
  watchlistId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceCreator?: string;
  thumbnailUrl?: string;
  matchedKeyword?: string;
  status: "queued" | "clipping" | "ready" | "publishing" | "published" | "failed" | "skipped";
  approved: boolean;
  clip?: { outputFile: string; title: string; hook?: string };
  publishResults?: PublishLog[];
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

type AutoLog = { id: string; timestamp: string; type: string; status: "info" | "success" | "error"; message: string };

type Status = {
  autoClipEnabled: boolean;
  autoPublishEnabled: boolean;
  clipperBusy: boolean;
  counts: Record<string, number>;
  today: string;
};

type Match = {
  watchlistId: string;
  watchlistTitle: string;
  videoId: string;
  title: string;
  creator: string;
  originalUrl: string;
  thumbnailUrl?: string;
  views: number;
  matchedKeyword: string;
  alreadyQueued: boolean;
};

const EMPTY_FORM = {
  title: "",
  keywords: "",
  matchCreator: "",
  profileId: "",
  platforms: ["instagram", "youtube"] as ("instagram" | "youtube")[],
  publishTime: "19:00",
  requireApproval: false,
  maxClipsPerDay: 1,
};

const STATUS_STYLE: Record<ClipJob["status"], { label: string; cls: string }> = {
  queued: { label: "Antri", cls: "bg-gray-100 text-gray-600" },
  clipping: { label: "Clipping…", cls: "bg-blue-50 text-blue-600" },
  ready: { label: "Siap Publish", cls: "bg-amber-50 text-amber-700" },
  publishing: { label: "Publishing…", cls: "bg-indigo-50 text-indigo-600" },
  published: { label: "Published", cls: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Gagal", cls: "bg-red-50 text-red-600" },
  skipped: { label: "Dilewati", cls: "bg-gray-50 text-gray-400" },
};

export default function AutoPilotPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [jobs, setJobs] = useState<ClipJob[]>([]);
  const [logs, setLogs] = useState<AutoLog[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [jobFilter, setJobFilter] = useState<"all" | "active" | "ready" | "done">("all");

  const loadAll = useCallback(async () => {
    try {
      const [wRes, jRes] = await Promise.all([
        fetch("/api/watchlist", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/auto-jobs", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (wRes.success) setItems(wRes.items);
      if (jRes.success) {
        setJobs(jRes.jobs);
        setLogs(jRes.logs);
        setStatus(jRes.status);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetch("/api/profiles", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setProfiles(d.profiles || []))
      .catch(() => undefined);
    loadAll();
    const t = setInterval(loadAll, 8000);
    return () => clearInterval(t);
  }, [loadAll]);

  const flash = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // ─── Watchlist CRUD ───
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      };
      const res = await fetch(editingId ? `/api/watchlist/${editingId}` : "/api/watchlist", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      flash(editingId ? "Watchlist diperbarui" : "Judul ditambahkan ke watchlist");
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadAll();
    } catch (err: any) {
      flash(err.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (w: WatchlistItem) => {
    setEditingId(w.id);
    setForm({
      title: w.title,
      keywords: w.keywords.join(", "),
      matchCreator: w.matchCreator || "",
      profileId: w.profileId,
      platforms: w.platforms,
      publishTime: w.publishTime,
      requireApproval: w.requireApproval,
      maxClipsPerDay: w.maxClipsPerDay,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const patchItem = async (id: string, patch: Record<string, unknown>) => {
    await fetch(`/api/watchlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadAll();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Hapus judul ini dari watchlist? Klip yang belum dipublish juga dihapus dari antrian.")) return;
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    loadAll();
  };

  // ─── Switches & Matching ───
  const toggleSwitch = async (key: "autoClipEnabled" | "autoPublishEnabled") => {
    if (!status) return;
    await fetch("/api/auto-jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !status[key] }),
    });
    loadAll();
  };

  const previewMatches = async () => {
    setBusyAction("preview");
    try {
      const d = await fetch("/api/auto-jobs/run-match", { cache: "no-store" }).then((r) => r.json());
      setMatches(d.matches || []);
    } finally {
      setBusyAction(null);
    }
  };

  const runMatch = async () => {
    setBusyAction("run");
    try {
      const d = await fetch("/api/auto-jobs/run-match", { method: "POST" }).then((r) => r.json());
      flash(
        d.queued > 0
          ? `${d.queued} video masuk antrian clipper (${d.matched} match).`
          : d.matched > 0
          ? `${d.matched} match, tapi semua sudah diproses / kuota harian penuh.`
          : "Tidak ada video trending yang cocok."
      );
      setMatches(null);
      loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  // ─── Job actions ───
  const jobAction = async (id: string, action: string) => {
    if (action === "publish-now" && !confirm("Publish klip ini sekarang? Ini akan memakai jatah publish hari ini untuk judul tersebut.")) return;
    setBusyAction(`${id}:${action}`);
    try {
      const d = await fetch(`/api/auto-jobs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).then((r) => r.json());
      if (!d.success && d.error) flash(d.error, "error");
      else if (action === "publish-now") flash("Klip berhasil dipublish!");
      loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name || "— akun dihapus —";
  const itemTitle = (id: string) => items.find((w) => w.id === id)?.title || "— dihapus —";

  const filteredJobs = jobs.filter((j) => {
    if (jobFilter === "active") return j.status === "queued" || j.status === "clipping" || j.status === "publishing";
    if (jobFilter === "ready") return j.status === "ready";
    if (jobFilter === "done") return j.status === "published" || j.status === "failed" || j.status === "skipped";
    return true;
  });

  const selectedProfile = profiles.find((p) => p.id === form.profileId);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Auto Pilot</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Watchlist judul → auto clip dari hasil scraping trending → auto publish 1x sehari per judul
            </p>
          </div>
        </div>
        {status && (
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            <SwitchPill label="Auto Clip" on={status.autoClipEnabled} onClick={() => toggleSwitch("autoClipEnabled")} />
            <SwitchPill label="Auto Publish" on={status.autoPublishEnabled} onClick={() => toggleSwitch("autoPublishEnabled")} />
          </div>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold ${
            message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
          <Stat label="Antri" value={status.counts.queued} />
          <Stat label="Clipping" value={status.counts.clipping} highlight={status.clipperBusy} />
          <Stat label="Siap Publish" value={status.counts.ready} />
          <Stat label="Published" value={status.counts.published} />
          <Stat label="Gagal" value={status.counts.failed} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={submitForm} className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{editingId ? "Edit Judul" : "Tambah Judul"}</h2>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Batal edit"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <Field label="Judul / Label" htmlFor="wl-title">
            <input
              id="wl-title"
              className="input"
              placeholder="mis. Podcast Deddy Corbuzier"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>

          <Field
            label="Keywords (opsional, pisahkan koma)"
            htmlFor="wl-kw"
            hint="Jika dikosongkan otomatis memakai Judul / Target Keyword dari akun"
          >
            <input
              id="wl-kw"
              className="input"
              placeholder="close the door, deddy corbuzier"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </Field>

          <Field label="Filter Channel (opsional)" htmlFor="wl-creator">
            <input
              id="wl-creator"
              className="input"
              placeholder="mis. Deddy Corbuzier"
              value={form.matchCreator}
              onChange={(e) => setForm({ ...form, matchCreator: e.target.value })}
            />
          </Field>

          <Field label="Upload ke Akun" htmlFor="wl-profile">
            <select
              id="wl-profile"
              className="input"
              value={form.profileId}
              onChange={(e) => {
                const profileId = e.target.value;
                const picked = profiles.find((p) => p.id === profileId);
                const defKw = picked?.targetKeyword?.trim() || "";
                setForm({
                  ...form,
                  profileId,
                  keywords: form.keywords.trim() ? form.keywords : defKw,
                  title: form.title.trim() ? form.title : defKw || picked?.name || "",
                });
              }}
              required
            >
              <option value="">— Pilih akun —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.targetKeyword ? ` (${p.targetKeyword})` : ""}
                  {p.igUsername ? ` · IG @${p.igUsername}` : ""}
                  {p.youtubeChannelTitle ? ` · YT ${p.youtubeChannelTitle}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <fieldset>
            <legend className="text-xs font-bold text-gray-500 mb-2">Platform</legend>
            <div className="flex gap-2">
              {(["instagram", "youtube"] as const).map((p) => {
                const active = form.platforms.includes(p);
                const connected = selectedProfile
                  ? p === "instagram"
                    ? selectedProfile.instagramConnected
                    : selectedProfile.youtubeConnected
                  : true;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm({
                        ...form,
                        platforms: active ? form.platforms.filter((x) => x !== p) : [...form.platforms, p],
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                      active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {p === "instagram" ? <Camera size={16} /> : <Video size={16} />}
                    {p === "instagram" ? "Reels" : "Shorts"}
                    {!connected && <span className="text-[10px] text-red-500">(belum connect)</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Jam Publish Harian" htmlFor="wl-time">
              <input
                id="wl-time"
                type="time"
                className="input"
                value={form.publishTime}
                onChange={(e) => setForm({ ...form, publishTime: e.target.value })}
                required
              />
            </Field>
            <Field label="Maks Stok & Klip/Hari" htmlFor="wl-max" hint="Stok siap ≥ nilai ini = stop clip">
              <input
                id="wl-max"
                type="number"
                min={1}
                max={10}
                className="input"
                value={form.maxClipsPerDay}
                onChange={(e) => setForm({ ...form, maxClipsPerDay: Number(e.target.value) })}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requireApproval}
              onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            Wajib approve manual sebelum dipublish
          </label>

          <button
            type="submit"
            disabled={saving || form.platforms.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {editingId ? "Simpan Perubahan" : "Tambah ke Watchlist"}
          </button>
        </form>

        {/* Watchlist table */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-lg">Watchlist ({items.length})</h2>
            <div className="flex gap-2">
              <button onClick={previewMatches} disabled={!!busyAction} className="btn-secondary">
                {busyAction === "preview" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Cek Match
              </button>
              <button onClick={runMatch} disabled={!!busyAction} className="btn-primary">
                {busyAction === "run" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Jalankan Sekarang
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">
              Belum ada judul. Tambahkan judul & keyword di form sebelah kiri.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {items.map((w) => (
                <li key={w.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${w.enabled ? "" : "text-gray-400 line-through"}`}>{w.title}</span>
                      {w.platforms.includes("instagram") && <Camera size={14} className="text-pink-500" aria-label="Instagram" />}
                      {w.platforms.includes("youtube") && <Video size={14} className="text-red-500" aria-label="YouTube" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {w.keywords.join(", ")}
                      {w.matchCreator ? ` · channel: ${w.matchCreator}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      → {profileName(w.profileId)} · publish {w.publishTime} ·{" "}
                      {w.lastPublishedDate === status?.today ? (
                        <span className="text-emerald-600 font-semibold">sudah publish hari ini</span>
                      ) : (
                        <span>belum publish hari ini</span>
                      )}{" "}
                      · stok {w.readyCount} siap / {w.queuedCount} antri / {w.publishedCount} published
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SwitchPill small label={w.enabled ? "Aktif" : "Off"} on={w.enabled} onClick={() => patchItem(w.id, { enabled: !w.enabled })} />
                    <IconBtn label="Edit" onClick={() => startEdit(w)}>
                      <Pencil size={14} />
                    </IconBtn>
                    <IconBtn label="Hapus" danger onClick={() => deleteItem(w.id)}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {matches && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Preview Match dari Cache Trending ({matches.length})</h3>
                <button onClick={() => setMatches(null)} className="text-gray-400 hover:text-gray-700" aria-label="Tutup preview">
                  <X size={16} />
                </button>
              </div>
              {matches.length === 0 ? (
                <p className="text-xs text-gray-400">Tidak ada video trending saat ini yang cocok dengan watchlist.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-auto">
                  {matches.map((m) => (
                    <li key={`${m.watchlistId}-${m.videoId}`} className="flex items-center gap-3 text-xs">
                      {m.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumbnailUrl} alt="" className="w-16 h-9 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={m.originalUrl} target="_blank" rel="noreferrer" className="font-semibold truncate block hover:underline">
                          {m.title}
                        </a>
                        <span className="text-gray-400">
                          {m.creator} · {m.views.toLocaleString("id-ID")} views · [{m.watchlistTitle}] “{m.matchedKeyword}”
                        </span>
                      </div>
                      {m.alreadyQueued && <span className="text-[10px] text-gray-400">sudah diproses</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Jobs */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-lg">Job Queue</h2>
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl text-xs font-semibold" role="tablist">
            {([
              ["all", "Semua"],
              ["active", "Proses"],
              ["ready", "Siap"],
              ["done", "Selesai"],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={jobFilter === k}
                onClick={() => setJobFilter(k)}
                className={`px-3 py-1.5 rounded-lg ${jobFilter === k ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Belum ada job.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredJobs.map((j) => {
              const st = STATUS_STYLE[j.status];
              const wl = items.find((w) => w.id === j.watchlistId);
              const needsApproval = wl?.requireApproval && !j.approved && j.status === "ready";
              return (
                <li key={j.id} className="py-4 flex flex-col md:flex-row gap-4">
                  {j.clip?.outputFile ? (
                    <video src={j.clip.outputFile} controls preload="none" className="w-24 aspect-[9/16] rounded-xl bg-black shrink-0" />
                  ) : j.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.thumbnailUrl} alt="" className="w-24 aspect-video rounded-xl object-cover shrink-0" />
                  ) : null}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                        {j.status === "clipping" || j.status === "publishing" ? (
                          <Loader2 size={10} className="inline animate-spin mr-1" />
                        ) : null}
                        {st.label}
                      </span>
                      {needsApproval && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Butuh Approval</span>
                      )}
                      <span className="text-[11px] text-gray-400">[{itemTitle(j.watchlistId)}]</span>
                    </div>
                    <p className="font-semibold text-sm truncate">{j.clip?.title || j.sourceTitle}</p>
                    <a href={j.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:underline truncate block">
                      Sumber: {j.sourceTitle} {j.sourceCreator ? `· ${j.sourceCreator}` : ""}
                    </a>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(j.updatedAt).toLocaleString("id-ID")}
                      {j.attempts > 1 ? ` · percobaan ${j.attempts}` : ""}
                    </p>
                    {j.publishResults && j.publishResults.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {j.publishResults.map((r) =>
                          r.success && r.permalink ? (
                            <a
                              key={r.platform}
                              href={r.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
                            >
                              <CheckCircle2 size={10} /> {r.platform} <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span
                              key={r.platform}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                r.success ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                              }`}
                            >
                              {r.success ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {r.platform}
                            </span>
                          )
                        )}
                      </div>
                    )}
                    {j.error && <p className="text-[11px] text-red-500 break-words">{j.error}</p>}
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0">
                    {needsApproval && (
                      <ActionBtn busy={busyAction === `${j.id}:approve`} onClick={() => jobAction(j.id, "approve")} icon={<ThumbsUp size={12} />}>
                        Approve
                      </ActionBtn>
                    )}
                    {(j.status === "ready" || (j.status === "failed" && j.clip)) && (
                      <ActionBtn busy={busyAction === `${j.id}:publish-now`} onClick={() => jobAction(j.id, "publish-now")} icon={<Send size={12} />}>
                        Publish Now
                      </ActionBtn>
                    )}
                    {j.status === "failed" && (
                      <ActionBtn busy={busyAction === `${j.id}:retry`} onClick={() => jobAction(j.id, "retry")} icon={<RefreshCw size={12} />}>
                        Retry
                      </ActionBtn>
                    )}
                    {(j.status === "queued" || j.status === "ready") && (
                      <ActionBtn busy={busyAction === `${j.id}:skip`} onClick={() => jobAction(j.id, "skip")} icon={<SkipForward size={12} />}>
                        Skip
                      </ActionBtn>
                    )}
                    {(j.status === "skipped" || j.status === "failed" || j.status === "published") && (
                      <ActionBtn busy={busyAction === `${j.id}:delete`} onClick={() => jobAction(j.id, "delete")} icon={<Trash2 size={12} />}>
                        Hapus
                      </ActionBtn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6">
        <h2 className="font-bold text-lg mb-3">Log Aktivitas</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada aktivitas.</p>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-auto font-mono text-[11px]">
            {logs.map((l) => (
              <li key={l.id} className="flex gap-3">
                <span className="text-gray-400 shrink-0">{new Date(l.timestamp).toLocaleString("id-ID")}</span>
                <span
                  className={
                    l.status === "error" ? "text-red-600" : l.status === "success" ? "text-emerald-600" : "text-gray-600"
                  }
                >
                  [{l.type}] {l.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.6rem 0.85rem;
          font-size: 0.875rem;
          background: #fff;
          outline: none;
        }
        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .btn-primary,
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.5rem 0.9rem;
          border-radius: 0.75rem;
          transition: all 0.15s;
        }
        .btn-primary {
          background: #2563eb;
          color: #fff;
        }
        .btn-primary:hover {
          background: #1d4ed8;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-500 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 ${highlight ? "border-blue-200" : "border-gray-100"}`}>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black flex items-center gap-2">
        {value ?? 0}
        {highlight && <Loader2 size={16} className="animate-spin text-blue-500" />}
      </p>
    </div>
  );
}

function SwitchPill({ label, on, onClick, small }: { label: string; on: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full font-bold transition ${small ? "text-[11px] px-2.5 py-1" : "text-xs px-4 py-2"} ${
        on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${on ? "bg-emerald-500" : "bg-gray-400"}`} />
      {label}
    </button>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
        danger ? "text-gray-400 hover:bg-red-50 hover:text-red-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function ActionBtn({ busy, onClick, icon, children }: { busy: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-50"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

