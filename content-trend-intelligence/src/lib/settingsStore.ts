import fs from "fs";
import path from "path";

export interface AppSettings {
  // 1. Scraping & Region
  autoScrapeEnabled: boolean;
  scrapeIntervalHours: number;
  defaultRegion: string;
  maxTrendingResults: number;
  lastScrapedAt: string | null;
  cacheDurationMinutes: number;

  // 2. Video Styling & Branding Preset
  subtitleTheme: "hormozi_yellow" | "neon_green" | "clean_white";
  watermarkText: string;
  showProgressBar: boolean;
  showTopHook: boolean;
  showSubtitles: boolean;

  // 3. Caption & Hashtag Template
  captionTemplate: string;
  defaultHashtags: string;

  // 4. AI Clipper Target Duration
  targetDurationMin: number;
  targetDurationMax: number;

  // 5. Notifications
  webhookType: "none" | "discord" | "telegram";
  webhookUrl: string;

  // 6. Auto Pilot (Watchlist → Auto Clip → Auto Publish)
  autoClipEnabled: boolean;
  autoPublishEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoScrapeEnabled: true,
  scrapeIntervalHours: 8,
  defaultRegion: "ID",
  maxTrendingResults: 30,
  lastScrapedAt: new Date().toISOString(),
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
};

class SettingsStore {
  private filePath: string;
  private rootFilePath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.error("Gagal membuat folder data:", e);
      }
    }
    this.filePath = path.join(dataDir, "settings.json");

    const rootDir = path.join(process.cwd(), "..", "data");
    if (!fs.existsSync(rootDir)) {
      try {
        fs.mkdirSync(rootDir, { recursive: true });
      } catch (e) {}
    }
    this.rootFilePath = path.join(rootDir, "settings.json");
  }

  get(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(content);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn("Gagal membaca settings.json, menggunakan default:", e);
    }
    this.save(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  save(settings: Partial<AppSettings>): AppSettings {
    try {
      const current = this.get();
      const updated: AppSettings = { ...current, ...settings };
      const str = JSON.stringify(updated, null, 2);
      fs.writeFileSync(this.filePath, str, "utf8");
      try {
        fs.writeFileSync(this.rootFilePath, str, "utf8");
      } catch (e) {}
      return updated;
    } catch (e) {
      console.error("Gagal menyimpan settings.json:", e);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  }
}

export const settingsStore = new SettingsStore();

