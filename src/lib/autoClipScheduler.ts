import fs from "fs";
import path from "path";
import { settingsStore } from "@/lib/settingsStore";
import { watchlistStore, WatchlistItem } from "@/lib/watchlistStore";
import { clipJobStore, ClipJob } from "@/lib/clipJobStore";
import { profileStore } from "@/lib/profileStore";
import { ClipperService } from "@/services/ClipperService";
import { PublishService } from "@/services/PublishService";
import { NotificationService } from "@/services/NotificationService";

const MAX_CLIP_ATTEMPTS = 3;
const TICK_MS = 60 * 1000;

export interface AutoPilotLog {
  id: string;
  timestamp: string;
  type: "match" | "clip" | "publish" | "system";
  status: "info" | "success" | "error";
  message: string;
}

export interface TrendingMatch {
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
}

declare global {
  // eslint-disable-next-line no-var
  var __autoPilotTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __autoPilotClipRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __autoPilotPublishRunning: boolean | undefined;
}

function todayStr(d = new Date()): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD lokal
}

function nowHHmm(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function normalize(s: unknown): string {
  return String(s ?? "").toLowerCase().normalize("NFKD");
}

class AutoClipScheduler {
  private logPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {}
    }
    this.logPath = path.join(dataDir, "auto_pilot_log.json");
  }

  // ───────────────────────── Logs ─────────────────────────

  getLogs(): AutoPilotLog[] {
    try {
      if (fs.existsSync(this.logPath)) return JSON.parse(fs.readFileSync(this.logPath, "utf8") || "[]");
    } catch (e) {}
    return [];
  }

  private log(type: AutoPilotLog["type"], status: AutoPilotLog["status"], message: string) {
    const prefix = status === "error" ? "❌" : status === "success" ? "✅" : "ℹ️";
    console.log(`[AutoPilot] ${prefix} ${message}`);
    try {
      const entry: AutoPilotLog = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        status,
        message,
      };
      const logs = [entry, ...this.getLogs()].slice(0, 100);
      fs.writeFileSync(this.logPath, JSON.stringify(logs, null, 2), "utf8");
    } catch (e) {}
  }

  // ───────────────────────── Matching ─────────────────────────

  /** Cocokkan 1 video trending dengan 1 item watchlist (berdasarkan Niche / Kategori & Keywords). */
  private matchVideo(video: any, item: WatchlistItem): string | null {
    if (!video?.originalUrl || String(video.id || "").startsWith("mock_")) return null;

    const creator = normalize(video.creator);
    if (item.matchCreator && !creator.includes(normalize(item.matchCreator))) return null;

    const videoTitle = normalize(video.title);
    const videoCatRaw = String(video.category || "");
    const videoCategory = normalize(videoCatRaw);
    const videoTags = Array.isArray(video.hashtags) ? video.hashtags.map(normalize) : [];
    const haystack = [videoTitle, creator, videoCategory, ...videoTags].join(" \n ");

    // 1. Filter keywords spesifik (jika diisi oleh user)
    let matchedSpecificKw: string | null = null;
    if (item.keywords && item.keywords.length > 0) {
      for (const kw of item.keywords) {
        const k = normalize(kw).trim();
        if (k && haystack.includes(k)) {
          matchedSpecificKw = kw;
          break;
        }
      }
      // Jika user memberikan keywords spesifik dan TIDAK ADA yang cocok, jangan match video ini
      if (!matchedSpecificKw) return null;
    }

    // 2. Pencocokan berdasarkan Niche / Kategori
    if (item.niche) {
      const niche = normalize(item.niche);

      // Jika "Semua Kategori (All Trends)"
      if (niche.includes("semua") || niche === "all") {
        return matchedSpecificKw ? `${matchedSpecificKw} (All Trends)` : (videoCatRaw ? `Trend: ${videoCatRaw}` : "All Trends");
      }

      // Cocokkan langsung dengan video.category
      if (videoCategory && (videoCategory.includes(niche) || niche.includes(videoCategory))) {
        return matchedSpecificKw ? `${matchedSpecificKw} [${videoCatRaw}]` : `Kategori: ${videoCatRaw}`;
      }

      // Semantic / Sub-niche Matchers
      if (niche.includes("podcast") || niche.includes("talkshow")) {
        const podcastKeywords = [
          "podcast", "talkshow", "ngobrol", "interview", "bincang", "curhat",
          "obrolan", "close the door", "bocor alus", "dewa judika", "podkesmas"
        ];
        for (const pk of podcastKeywords) {
          if (haystack.includes(pk)) return matchedSpecificKw || `Podcast: ${pk}`;
        }
        if (videoCategory.includes("people & blogs") || videoCategory.includes("entertainment")) {
          return matchedSpecificKw || `Podcast (Kategori: ${videoCatRaw})`;
        }
      }

      if (niche.includes("gaming") || niche.includes("game")) {
        if (videoCategory.includes("gaming")) return matchedSpecificKw || "Gaming";
        const gameKeywords = ["gameplay", "stream", "mobile legends", "roblox", "free fire", "minecraft", "gta", "gamer", "esports"];
        for (const gk of gameKeywords) {
          if (haystack.includes(gk)) return matchedSpecificKw || `Gaming: ${gk}`;
        }
      }

      if (niche.includes("bisnis") || niche.includes("finansial") || niche.includes("keuangan") || niche.includes("investasi")) {
        const financeKeywords = [
          "bisnis", "finansial", "investasi", "saham", "crypto", "kripto",
          "uang", "cuan", "kaya", "ekonomi", "omset", "modal", "passive income"
        ];
        for (const fk of financeKeywords) {
          if (haystack.includes(fk)) return matchedSpecificKw || `Bisnis/Finansial: ${fk}`;
        }
      }

      if (niche.includes("kesehatan") || niche.includes("olahraga") || niche.includes("health") || niche.includes("sports")) {
        if (videoCategory.includes("sports")) return matchedSpecificKw || "Sports";
        const healthKeywords = [
          "kesehatan", "dokter", "sehat", "diet", "workout", "fitness", "gym",
          "medis", "olahraga", "nutrisi", "penyakit", "gejala", "tips sehat"
        ];
        for (const hk of healthKeywords) {
          if (haystack.includes(hk)) return matchedSpecificKw || `Kesehatan/Olahraga: ${hk}`;
        }
      }

      if (niche.includes("edukasi") || niche.includes("education") || niche.includes("belajar") || niche.includes("sains")) {
        if (videoCategory.includes("education") || videoCategory.includes("science")) return matchedSpecificKw || `Education: ${videoCatRaw}`;
        const eduKeywords = ["edukasi", "belajar", "fakta", "sejarah", "pengetahuan", "tips", "tutorial", "sains", "dunia"];
        for (const ek of eduKeywords) {
          if (haystack.includes(ek)) return matchedSpecificKw || `Edukasi: ${ek}`;
        }
      }

      if (niche.includes("teknologi") || niche.includes("tech") || niche.includes("ai")) {
        if (videoCategory.includes("science & tech")) return matchedSpecificKw || "Science & Tech";
        const techKeywords = ["teknologi", "tech", "gadget", "ai", "artificial intelligence", "robot", "software", "hp", "laptop", "coding"];
        for (const tk of techKeywords) {
          if (haystack.includes(tk)) return matchedSpecificKw || `Tech/AI: ${tk}`;
        }
      }

      if (niche.includes("komedi") || niche.includes("comedy") || niche.includes("humor") || niche.includes("lucu")) {
        if (videoCategory.includes("comedy")) return matchedSpecificKw || "Comedy";
        const comedyKeywords = ["lucu", "ngakak", "stand up", "komedi", "humor", "prank", "sketsa"];
        for (const ck of comedyKeywords) {
          if (haystack.includes(ck)) return matchedSpecificKw || `Komedi: ${ck}`;
        }
      }

      if (niche.includes("musik") || niche.includes("music") || niche.includes("lagu")) {
        if (videoCategory.includes("music")) return matchedSpecificKw || "Music";
        const musicKeywords = ["musik", "music", "lagu", "dangdut", "koplo", "cover", "konser", "lirik", "pop", "singing"];
        for (const mk of musicKeywords) {
          if (haystack.includes(mk)) return matchedSpecificKw || `Musik: ${mk}`;
        }
      }

      if (niche.includes("kuliner") || niche.includes("food") || niche.includes("masak")) {
        const foodKeywords = ["kuliner", "resep", "masak", "makanan", "mukbang", "makan", "street food", "jajanan", "resto", "baking"];
        for (const fk of foodKeywords) {
          if (haystack.includes(fk)) return matchedSpecificKw || `Kuliner: ${fk}`;
        }
      }

      if (niche.includes("horor") || niche.includes("misteri") || niche.includes("horror")) {
        const horrorKeywords = ["horor", "horror", "misteri", "serem", "hantu", "mistis", "indigo", "konspirasi", "creepy", "angker"];
        for (const hk of horrorKeywords) {
          if (haystack.includes(hk)) return matchedSpecificKw || `Horor: ${hk}`;
        }
      }

      if (niche.includes("entertainment") || niche.includes("hiburan")) {
        if (videoCategory.includes("entertainment") || videoCategory.includes("film")) {
          return matchedSpecificKw || `Entertainment: ${videoCatRaw}`;
        }
      }

      if (niche.includes("berita") || niche.includes("politik") || niche.includes("news")) {
        if (videoCategory.includes("news")) return matchedSpecificKw || "News & Politics";
        const newsKeywords = ["berita", "politik", "presiden", "menteri", "dpr", "kpk", "pilkada", "pemilu", "debat"];
        for (const nk of newsKeywords) {
          if (haystack.includes(nk)) return matchedSpecificKw || `Berita/Politik: ${nk}`;
        }
      }

      // Cek apakah kata dalam niche muncul di teks video
      if (haystack.includes(niche)) {
        return matchedSpecificKw || `Niche: ${item.niche}`;
      }
      return matchedSpecificKw || null;
      return null;
    }

    // 3. Fallback jika tidak ada niche: cek keywords yang cocok atau item.title
    if (matchedSpecificKw) return matchedSpecificKw;
    if (item.title) {
      const t = normalize(item.title).trim();
      if (t && haystack.includes(t)) return item.title;
    }

    return null;
  }

  /** Daftar semua match antara video trending & watchlist (untuk preview UI & antrian). */
  findMatches(videos: any[], onlyEnabled = true): TrendingMatch[] {
    const items = watchlistStore.list().filter((w) => !onlyEnabled || w.enabled);
    const matches: TrendingMatch[] = [];
    for (const item of items) {
      for (const v of videos || []) {
        const kw = this.matchVideo(v, item);
        if (!kw) continue;
        matches.push({
          watchlistId: item.id,
          watchlistTitle: item.title,
          videoId: String(v.id),
          title: v.title,
          creator: v.creator,
          originalUrl: v.originalUrl,
          thumbnailUrl: v.thumbnailUrl,
          views: Number(v.metrics?.views || 0),
          matchedKeyword: kw,
          alreadyQueued: clipJobStore.exists(item.id, String(v.id)),
        });
      }
    }
    return matches.sort((a, b) => b.views - a.views);
  }

  /**
   * Dipanggil setelah job scraping trending selesai. Video yang cocok dengan watchlist
   * dan belum pernah diproses akan dimasukkan ke antrian clipper.
   */
  onTrendingScraped(videos: any[], force = false): { queued: number; matched: number } {
    const settings = settingsStore.get();
    if (!settings.autoClipEnabled && !force) {
      return { queued: 0, matched: 0 };
    }

    const matches = this.findMatches(videos);
    const today = todayStr();
    let queued = 0;

    for (const m of matches) {
      if (m.alreadyQueued) continue;
      const item = watchlistStore.get(m.watchlistId);
      if (!item) continue;

      const limit = item.maxClipsPerDay || 1;
      const allJobsForItem = clipJobStore.list().filter((j) => j.watchlistId === item.id);

      // Proteksi 1 (Anti-Numpuk Stok): jika masih ada klip ready/queued/clipping >= limit, jangan clip lagi
      const activeStock = allJobsForItem.filter(
        (j) => j.status === "ready" || j.status === "queued" || j.status === "clipping" || j.status === "publishing"
      ).length;
      if (activeStock >= limit) continue;

      // Proteksi 2 (Kuota Harian): batasi jumlah job baru yang dibuat hari ini per judul
      const createdToday = allJobsForItem.filter(
        (j) => j.status !== "skipped" && todayStr(new Date(j.createdAt)) === today
      ).length;
      if (createdToday >= limit) continue;

      clipJobStore.create({
        watchlistId: item.id,
        videoId: m.videoId,
        sourceUrl: m.originalUrl,
        sourceTitle: m.title,
        sourceCreator: m.creator,
        thumbnailUrl: m.thumbnailUrl,
        matchedKeyword: m.matchedKeyword,
        approved: !item.requireApproval,
      });
      queued++;
      this.log("match", "info", `[${item.title}] Match "${m.matchedKeyword}" → antri clip: ${m.title}`);
    }

    if (matches.length === 0) {
      this.log("match", "info", "Tidak ada video trending yang cocok dengan watchlist. Skip.");
    } else if (queued === 0) {
      this.log("match", "info", `${matches.length} match ditemukan, tapi semua sudah diproses / kuota harian penuh.`);
    }

    if (queued > 0) {
      // Langsung proses tanpa menunggu tick berikutnya
      setTimeout(() => this.processClipQueue().catch(() => undefined), 500);
    }

    return { queued, matched: matches.length };
  }

  // ───────────────────────── Clip Worker ─────────────────────────

  async processClipQueue(): Promise<void> {
    if (globalThis.__autoPilotClipRunning) return;
    globalThis.__autoPilotClipRunning = true;
    try {
      // Proses semua antrian satu per satu (yang paling lama dulu)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = clipJobStore
          .list()
          .filter((j) => j.status === "queued")
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        if (!next) break;

        const item = watchlistStore.get(next.watchlistId);
        if (!item) {
          clipJobStore.update(next.id, { status: "skipped", error: "Watchlist sudah dihapus" });
          continue;
        }

        await this.runClipJob(next, item);
      }
    } finally {
      globalThis.__autoPilotClipRunning = false;
    }
  }

  private async runClipJob(job: ClipJob, item: WatchlistItem) {
    const attempts = (job.attempts || 0) + 1;
    clipJobStore.update(job.id, { status: "clipping", attempts, error: undefined });
    this.log("clip", "info", `[${item.title}] Mulai clipping (percobaan ${attempts}): ${job.sourceTitle}`);

    try {
      const run = await ClipperService.runClip(job.sourceUrl);
      if (!run.success || !run.clip?.outputFile) {
        throw new Error(run.error || "Pipeline selesai tanpa metadata klip");
      }

      clipJobStore.update(job.id, {
        status: "ready",
        clip: {
          outputFile: run.clip.outputFile,
          title: run.clip.title,
          hook: run.clip.hook,
          badge: run.clip.badge,
          tags: run.clip.tags,
          hashtags: run.clip.hashtags,
          startTime: run.clip.startTime,
          endTime: run.clip.endTime,
        },
      });
      this.log("clip", "success", `[${item.title}] Klip siap: ${run.clip.title}`);

      NotificationService.sendNotification({
        title: `[Auto Pilot] ${run.clip.title}`,
        hook: run.clip.hook,
        videoPath: run.clip.outputFile,
        sourceUrl: job.sourceUrl,
        status: "clipped",
      }).catch(() => undefined);
    } catch (err: any) {
      const message = err?.message || "Unknown error";
      const giveUp = attempts >= MAX_CLIP_ATTEMPTS;
      clipJobStore.update(job.id, { status: giveUp ? "failed" : "queued", error: message });
      this.log(
        "clip",
        "error",
        `[${item.title}] Clip gagal (${attempts}/${MAX_CLIP_ATTEMPTS}): ${message}${giveUp ? " — menyerah." : " — akan dicoba lagi."}`
      );
      if (giveUp) {
        NotificationService.sendNotification({
          title: `[Auto Pilot] Clip gagal: ${job.sourceTitle}`,
          sourceUrl: job.sourceUrl,
          status: "error",
          error: message,
        }).catch(() => undefined);
      }
    }
  }

  // ───────────────────────── Publish Worker ─────────────────────────

  /** Klip ready tertua milik watchlist yang boleh dipublish */
  private nextPublishable(item: WatchlistItem): ClipJob | undefined {
    return clipJobStore
      .list()
      .filter((j) => j.watchlistId === item.id && j.status === "ready" && (!item.requireApproval || j.approved))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  }

  async processPublishQueue(): Promise<void> {
    const settings = settingsStore.get();
    if (!settings.autoPublishEnabled) return;
    if (globalThis.__autoPilotPublishRunning) return;
    globalThis.__autoPilotPublishRunning = true;

    try {
      const today = todayStr();
      const now = nowHHmm();
      for (const item of watchlistStore.list()) {
        if (!item.enabled) continue;
        if (item.lastPublishedDate === today) continue; // Sudah berhasil publish 1x hari ini
        const publishTimes = item.publishTimes || ["19:00"];
        if (publishTimes.every((t) => now < t)) continue;

        // Jika hari ini sudah ada percobaan publish yang gagal (belum di-Retry), tahan agar tidak menghabiskan stok lain
        const hasUnresolvedPublishFailureToday = clipJobStore
          .list()
          .some(
            (j) =>
              j.watchlistId === item.id &&
              j.status === "failed" &&
              Array.isArray(j.publishResults) &&
              j.publishResults.length > 0 &&
              todayStr(new Date(j.updatedAt)) === today
          );
        if (hasUnresolvedPublishFailureToday) continue;

        const job = this.nextPublishable(item);
        if (!job) continue;

        await this.publishJob(job, item);
      }
    } finally {
      globalThis.__autoPilotPublishRunning = false;
    }
  }

  /**
   * Publish 1 job ke semua platform yang dipilih (IG + YT sekaligus).
   * lastPublishedDate hanya dikunci ke hari ini jika minimal 1 platform berhasil (ok === true),
   * sehingga jika gagal karena kendala token/jaringan, user bisa klik Retry di hari yang sama tanpa nyangkut.
   */
  async publishJob(job: ClipJob, item: WatchlistItem): Promise<ClipJob | null> {
    if (!job.clip?.outputFile) {
      return clipJobStore.update(job.id, { status: "failed", error: "Klip belum tersedia" });
    }

    const profile = (await profileStore.getProfiles()).find((p) => p.id === item.profileId);
    if (!profile) {
      this.log("publish", "error", `[${item.title}] Akun tujuan tidak ditemukan. Edit watchlist & pilih akun lagi.`);
      return clipJobStore.update(job.id, {
        status: "failed",
        publishResults: [{ platform: "account", success: false, error: "Akun tujuan tidak ditemukan", publishedAt: new Date().toISOString() }],
        error: "Akun tujuan tidak ditemukan",
      });
    }

    clipJobStore.update(job.id, { status: "publishing", error: undefined });
    this.log("publish", "info", `[${item.title}] Publish ke ${item.platforms.join(", ")} (${profile.name}): ${job.clip.title}`);

    try {
      const results = await PublishService.publishClip({
        profile,
        platforms: item.platforms,
        clipPath: job.clip.outputFile,
        title: job.clip.title,
        hook: job.clip.hook,
        tags: job.clip.tags,
        hashtags: job.clip.hashtags,
      });
      const ok = results.some((r) => r.success);
      const errors = results.filter((r) => !r.success).map((r) => `${r.platform}: ${r.error}`);

      if (ok) {
        watchlistStore.update(item.id, { lastPublishedDate: todayStr() });
      }
      const updated = clipJobStore.update(job.id, {
        status: ok ? "published" : "failed",
        publishResults: results,
        error: errors.length ? errors.join(" | ") : undefined,
      });

      this.log(
        "publish",
        ok ? "success" : "error",
        ok
          ? `[${item.title}] Berhasil publish${errors.length ? ` (sebagian gagal: ${errors.join(" | ")})` : ""}`
          : `[${item.title}] Publish gagal: ${errors.join(" | ")}`
      );

      const validPermalinks = results
        .filter((r) => r.success && r.permalink)
        .map((r) => ({ platform: r.platform, url: r.permalink }));
      NotificationService.sendNotification({
        title: `[Auto Pilot] ${job.clip.title}`,
        hook: job.clip.hook,
        videoPath: job.clip.outputFile,
        sourceUrl: job.sourceUrl,
        permalinks: validPermalinks,
        status: ok ? "published" : "error",
        error: ok ? undefined : errors.join(" | "),
      }).catch(() => undefined);

      return updated;
    } catch (err: any) {
      this.log("publish", "error", `[${item.title}] Publish error: ${err?.message}`);
      return clipJobStore.update(job.id, {
        status: "failed",
        publishResults: [{ platform: "system", success: false, error: err?.message || "Publish error", publishedAt: new Date().toISOString() }],
        error: err?.message || "Publish error",
      });
    }
  }

  // ───────────────────────── Status & Lifecycle ─────────────────────────

  getStatus() {
    this.ensureStarted();
    const settings = settingsStore.get();
    const jobs = clipJobStore.list();
    const count = (s: string) => jobs.filter((j) => j.status === s).length;
    return {
      schedulerRunning: Boolean(globalThis.__autoPilotTimer),
      autoClipEnabled: settings.autoClipEnabled,
      autoPublishEnabled: settings.autoPublishEnabled,
      clipperBusy: ClipperService.isBusy(),
      counts: {
        queued: count("queued"),
        clipping: count("clipping"),
        ready: count("ready"),
        published: count("published"),
        failed: count("failed"),
      },
      today: todayStr(),
    };
  }

  /**
   * Hapus file fisik .mp4 dari job yang sudah selesai (published / skipped / failed)
   * dan berusia > maxAgeHours (default 48 jam) agar disk tidak pernah penuh.
   */
  cleanupOldClipFiles(maxAgeHours = 48): number {
    let cleaned = 0;
    const cutoffMs = Date.now() - maxAgeHours * 3600 * 1000;
    for (const j of clipJobStore.list()) {
      if (j.status !== "published" && j.status !== "skipped" && j.status !== "failed") continue;
      if (!j.clip?.outputFile || j.clip.outputFile.includes("final_ready_to_upload.mp4")) continue;
      const updatedMs = new Date(j.updatedAt).getTime();
      if (Number.isNaN(updatedMs) || updatedMs > cutoffMs) continue;

      const absPath = path.join(process.cwd(), "public", j.clip.outputFile.replace(/^\//, ""));
      try {
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
          cleaned++;
        }
      } catch (e) {}
    }
    if (cleaned > 0) {
      this.log("system", "info", `Auto-Cleanup Disk: menghapus ${cleaned} file video lama (> ${maxAgeHours} jam).`);
    }
    return cleaned;
  }

  /**
   * Satu siklus pengecekan (bisa dipanggil oleh internal timer maupun OS crontab via /api/cron/autopilot)
   */
  async runTick(): Promise<{ cleanedFiles: number }> {
    this.recoverStuckJobs();
    await this.processClipQueue();
    await this.processPublishQueue();
    const cleanedFiles = this.cleanupOldClipFiles(48);
    return { cleanedFiles };
  }

  /** Reset job yang "nyangkut" karena server restart di tengah proses */
  private recoverStuckJobs() {
    for (const j of clipJobStore.list()) {
      if (j.status === "clipping") clipJobStore.update(j.id, { status: "queued" });
      if (j.status === "publishing") clipJobStore.update(j.id, { status: "ready" });
    }
  }

  ensureStarted() {
    if (globalThis.__autoPilotTimer) return;

    console.log("[AutoPilot] ⏰ Mengaktifkan Auto Clip & Auto Publish scheduler (cek tiap 1 menit)");
    this.recoverStuckJobs();

    globalThis.__autoPilotTimer = setInterval(() => {
      this.processClipQueue().catch((e) => console.error("[AutoPilot] Clip worker error:", e));
      this.processPublishQueue().catch((e) => console.error("[AutoPilot] Publish worker error:", e));
      this.cleanupOldClipFiles(48);
    }, TICK_MS);
    if (globalThis.__autoPilotTimer.unref) globalThis.__autoPilotTimer.unref();

    setTimeout(() => {
      this.processClipQueue().catch(() => undefined);
      this.processPublishQueue().catch(() => undefined);
      this.cleanupOldClipFiles(48);
    }, 5000);
  }
}

export const autoClipScheduler = new AutoClipScheduler();

