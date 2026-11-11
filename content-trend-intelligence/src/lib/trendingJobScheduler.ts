import fs from "fs";
import path from "path";
import { settingsStore } from "@/lib/settingsStore";
import { YouTubeService } from "@/services/YouTubeService";
import { autoClipScheduler } from "@/lib/autoClipScheduler";

export interface TrendingJobLog {
  id: string;
  timestamp: string;
  trigger: "scheduled-job" | "manual" | "startup";
  region: string;
  videosCount: number;
  source: "youtube_api" | "mock_fallback";
  status: "success" | "error";
  message: string;
}

export interface TrendingCacheData {
  lastScrapedAt: string | null;
  nextScheduledAt: string | null;
  region: string;
  maxResults: number;
  dailyRunCount: number;
  lastRunDate: string; // YYYY-MM-DD (local date)
  videos: any[];
  logs: TrendingJobLog[];
}

const DEFAULT_CACHE: TrendingCacheData = {
  lastScrapedAt: null,
  nextScheduledAt: null,
  region: "ID",
  maxResults: 30,
  dailyRunCount: 0,
  lastRunDate: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD
  videos: [],
  logs: [],
};

// Global state for singleton scheduler across Next.js hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __trendingJobTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __trendingJobRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __trendingJobInitialized: boolean | undefined;
}

function getTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone
}

class TrendingJobScheduler {
  private filePath: string;
  private rootFilePath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {}
    }
    this.filePath = path.join(dataDir, "trending_cache.json");

    const rootDir = path.join(process.cwd(), "..", "data");
    if (!fs.existsSync(rootDir)) {
      try {
        fs.mkdirSync(rootDir, { recursive: true });
      } catch (e) {}
    }
    this.rootFilePath = path.join(rootDir, "trending_cache.json");
  }

  getCache(): TrendingCacheData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CACHE, ...parsed };
      }
    } catch (e) {
      console.warn("[TrendingJob] Gagal membaca trending_cache.json:", e);
    }
    return { ...DEFAULT_CACHE };
  }

  saveCache(update: Partial<TrendingCacheData>): TrendingCacheData {
    try {
      const current = this.getCache();
      const merged: TrendingCacheData = { ...current, ...update };
      const str = JSON.stringify(merged, null, 2);
      fs.writeFileSync(this.filePath, str, "utf8");
      try {
        fs.writeFileSync(this.rootFilePath, str, "utf8");
      } catch (e) {}
      return merged;
    } catch (e) {
      console.error("[TrendingJob] Gagal menyimpan trending_cache.json:", e);
      return { ...DEFAULT_CACHE, ...update };
    }
  }

  /**
   * Menghitung jadwal eksekusi berikutnya berdasarkan interval jam (default 8 jam = 3x sehari)
   */
  calculateNextScheduledAt(fromDateIso?: string | null, intervalHours?: number): string {
    const settings = settingsStore.get();
    const hours = intervalHours || settings.scrapeIntervalHours || 8;
    const baseMs = fromDateIso ? new Date(fromDateIso).getTime() : Date.now();
    const validBaseMs = Number.isNaN(baseMs) ? Date.now() : baseMs;
    const nextMs = validBaseMs + hours * 3600 * 1000;
    return new Date(nextMs).toISOString();
  }

  /**
   * Mengecek apakah job scraping sudah waktunya dijalankan
   */
  isJobDue(): boolean {
    const settings = settingsStore.get();
    if (!settings.autoScrapeEnabled) return false;

    const cache = this.getCache();
    if (!cache.videos || cache.videos.length === 0 || !cache.lastScrapedAt) {
      return true;
    }

    const intervalHours = settings.scrapeIntervalHours || 8;
    const intervalMs = intervalHours * 3600 * 1000;
    const lastMs = new Date(cache.lastScrapedAt).getTime();
    if (Number.isNaN(lastMs)) return true;

    const elapsedMs = Date.now() - lastMs;
    return elapsedMs >= intervalMs;
  }

  /**
   * Menjalankan job scraping data trending dan menyimpannya ke cache
   */
  async runScrapeJob(
    trigger: "scheduled-job" | "manual" | "startup" = "scheduled-job",
    overrideRegion?: string,
    overrideLimit?: number
  ): Promise<{
    success: boolean;
    videos: any[];
    lastScrapedAt: string;
    nextScheduledAt: string;
    region: string;
    dailyRunCount: number;
    log: TrendingJobLog;
  }> {
    if (globalThis.__trendingJobRunning && trigger === "scheduled-job") {
      const cache = this.getCache();
      const nowIso = cache.lastScrapedAt || new Date().toISOString();
      return {
        success: true,
        videos: cache.videos,
        lastScrapedAt: nowIso,
        nextScheduledAt: cache.nextScheduledAt || this.calculateNextScheduledAt(nowIso),
        region: cache.region,
        dailyRunCount: cache.dailyRunCount,
        log: cache.logs[0] || {
          id: String(Date.now()),
          timestamp: nowIso,
          trigger,
          region: cache.region,
          videosCount: cache.videos.length,
          source: "youtube_api",
          status: "success",
          message: "Job sedang berjalan, menggunakan cache aktif.",
        },
      };
    }

    globalThis.__trendingJobRunning = true;
    try {
      const settings = settingsStore.get();
      const region = overrideRegion || settings.defaultRegion || "ID";
      const maxResults = overrideLimit || settings.maxTrendingResults || 30;
      const intervalHours = settings.scrapeIntervalHours || 8;
      const dailyMax = Math.max(1, Math.round(24 / intervalHours));

      const cache = this.getCache();
      const today = getTodayDateString();
      let dailyRunCount = cache.lastRunDate === today ? cache.dailyRunCount : 0;

      // Jika dipicu oleh scheduled-job, batasi sesuai target harian (misal 3x sehari)
      if (trigger === "scheduled-job" && dailyRunCount >= dailyMax && cache.videos.length > 0) {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const nextIso = tomorrow.toISOString();
        this.saveCache({ nextScheduledAt: nextIso });
        return {
          success: true,
          videos: cache.videos,
          lastScrapedAt: cache.lastScrapedAt || new Date().toISOString(),
          nextScheduledAt: nextIso,
          region,
          dailyRunCount,
          log: cache.logs[0],
        };
      }

      console.log(
        `[TrendingJob] 🔄 Menjalankan scraping trending (${trigger}) | Region: ${region} | Limit: ${maxResults}`
      );

      const { videos: fetchedVideos, source } = await YouTubeService.fetchRawTrendingFromAPI(region, maxResults);
      const nowIso = new Date().toISOString();
      const nextScheduledAt = this.calculateNextScheduledAt(nowIso, intervalHours);

      // Jangan timpa cache video asli dengan mock_fallback jika sebelumnya sudah ada data asli
      const hasExistingRealVideos =
        cache.videos.length > 0 &&
        cache.region === region &&
        !String(cache.videos[0]?.id || "").startsWith("mock_");

      const finalVideos =
        source === "mock_fallback" && hasExistingRealVideos ? cache.videos : fetchedVideos;

      dailyRunCount += 1;

      const logEntry: TrendingJobLog = {
        id: `job_${Date.now()}`,
        timestamp: nowIso,
        trigger,
        region,
        videosCount: finalVideos.length,
        source,
        status: "success",
        message:
          trigger === "scheduled-job"
            ? `Auto-Job (${dailyRunCount}/${dailyMax} hari ini): Berhasil scrape ${finalVideos.length} video trending (${region}).`
            : trigger === "manual"
            ? `Manual Refresh: Berhasil memperbarui ${finalVideos.length} video trending (${region}).`
            : `Initial Sync: Berhasil memuat ${finalVideos.length} video trending (${region}).`,
      };

      const updatedLogs = [logEntry, ...(cache.logs || [])].slice(0, 15);

      this.saveCache({
        lastScrapedAt: nowIso,
        nextScheduledAt,
        region,
        maxResults,
        dailyRunCount,
        lastRunDate: today,
        videos: finalVideos,
        logs: updatedLogs,
      });

      // Sinkronkan juga lastScrapedAt di settings.json
      settingsStore.save({
        lastScrapedAt: nowIso,
      });

      // Auto Pilot: cocokkan hasil scrape dengan watchlist → antrian clipper (skip jika tidak ada match)
      if (source !== "mock_fallback") {
        try {
          autoClipScheduler.onTrendingScraped(finalVideos);
        } catch (e) {
          console.error("[TrendingJob] Gagal menjalankan matcher Auto Pilot:", e);
        }
      }

      console.log(
        `[TrendingJob] ✅ Selesai! ${finalVideos.length} video disimpan. Jadwal berikutnya: ${new Date(
          nextScheduledAt
        ).toLocaleString("id-ID")}`
      );

      return {
        success: true,
        videos: finalVideos,
        lastScrapedAt: nowIso,
        nextScheduledAt,
        region,
        dailyRunCount,
        log: logEntry,
      };
    } catch (error: any) {
      console.error("[TrendingJob] ❌ Gagal menjalankan job scraping:", error);
      const cache = this.getCache();
      const nowIso = new Date().toISOString();
      const logEntry: TrendingJobLog = {
        id: `job_err_${Date.now()}`,
        timestamp: nowIso,
        trigger,
        region: overrideRegion || "ID",
        videosCount: cache.videos.length,
        source: "mock_fallback",
        status: "error",
        message: `Gagal scrape: ${error.message || "Unknown error"}`,
      };
      this.saveCache({
        logs: [logEntry, ...(cache.logs || [])].slice(0, 15),
      });
      throw error;
    } finally {
      globalThis.__trendingJobRunning = false;
    }
  }

  /**
   * Mengambil video trending dari cache atau menjalankan job jika belum ada / sudah jadwalnya
   */
  async getOrScrapeVideos(regionCode = "ID", maxResults = 30, forceRefresh = false): Promise<any[]> {
    this.ensureSchedulerStarted();

    const cache = this.getCache();
    const hasValidCache =
      Array.isArray(cache.videos) &&
      cache.videos.length > 0 &&
      cache.region === regionCode;

    if (forceRefresh || !hasValidCache) {
      const result = await this.runScrapeJob(
        forceRefresh ? "manual" : "startup",
        regionCode,
        maxResults
      );
      return result.videos.slice(0, maxResults);
    }

    // Jika sudah waktunya job berkala (misal sudah lewat 8 jam), jalankan di background
    if (this.isJobDue()) {
      this.runScrapeJob("scheduled-job", regionCode, maxResults).catch((err) =>
        console.error("[TrendingJob] Background scrape error:", err)
      );
    }

    return cache.videos.slice(0, maxResults);
  }

  /**
   * Mengembalikan ringkasan status job untuk ditampilkan di UI
   */
  getStatus() {
    this.ensureSchedulerStarted();
    const settings = settingsStore.get();
    const cache = this.getCache();
    const intervalHours = settings.scrapeIntervalHours || 8;
    const dailyMaxRuns = Math.max(1, Math.round(24 / intervalHours));
    const today = getTodayDateString();
    const dailyRunCount = cache.lastRunDate === today ? cache.dailyRunCount : 0;

    const lastScrapedAt = cache.lastScrapedAt || settings.lastScrapedAt;
    const nextScheduledAt = settings.autoScrapeEnabled
      ? cache.nextScheduledAt || this.calculateNextScheduledAt(lastScrapedAt, intervalHours)
      : null;

    return {
      isSchedulerRunning: Boolean(globalThis.__trendingJobTimer),
      autoScrapeEnabled: settings.autoScrapeEnabled,
      scrapeIntervalHours: intervalHours,
      dailyMaxRuns,
      dailyRunCount,
      frequencyLabel: `${dailyMaxRuns}x Sehari (Setiap ${intervalHours} Jam)`,
      region: settings.defaultRegion || cache.region || "ID",
      maxResults: settings.maxTrendingResults || cache.maxResults || 30,
      lastScrapedAt,
      nextScheduledAt,
      cachedVideosCount: cache.videos?.length || 0,
      logs: (cache.logs || []).slice(0, 10),
    };
  }

  /**
   * Memulai background interval job (cek setiap 1 menit)
   */
  ensureSchedulerStarted() {
    if (globalThis.__trendingJobTimer) {
      return;
    }

    console.log("[TrendingJob] ⏰ Mengaktifkan Background Job Scheduler (Default: 3x Sehari / Setiap 8 Jam)");

    // Cek setiap 60 detik apakah jadwal scraping sudah jatuh tempo
    globalThis.__trendingJobTimer = setInterval(async () => {
      try {
        if (this.isJobDue()) {
          await this.runScrapeJob("scheduled-job");
        }
      } catch (e) {
        console.error("[TrendingJob] Error pada interval job:", e);
      }
    }, 60 * 1000);

    // Jangan menghalangi proses keluar jika dibutuhkan
    if (globalThis.__trendingJobTimer.unref) {
      globalThis.__trendingJobTimer.unref();
    }

    // Jika saat server baru nyala cache masih kosong atau sudah jatuh tempo, jalankan di background
    if (!globalThis.__trendingJobInitialized) {
      globalThis.__trendingJobInitialized = true;
      setTimeout(() => {
        if (this.isJobDue()) {
          this.runScrapeJob("scheduled-job").catch((e) =>
            console.error("[TrendingJob] Initial startup job error:", e)
          );
        }
      }, 2000);
    }
  }
}

export const trendingJobScheduler = new TrendingJobScheduler();
