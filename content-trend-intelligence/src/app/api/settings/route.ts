import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { settingsStore } from "@/lib/settingsStore";
import { profileStore } from "@/lib/profileStore";
import { trendingJobScheduler } from "@/lib/trendingJobScheduler";

export const dynamic = "force-dynamic";

function getEnvPath() {
  return path.join(process.cwd(), ".env");
}

function parseEnv(): Record<string, string> {
  const envPath = getEnvPath();
  const envData: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // remove quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        envData[key] = val;
      }
    }
  }
  return envData;
}

function updateEnv(updates: Record<string, string>) {
  const envPath = getEnvPath();
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  for (const [key, rawVal] of Object.entries(updates)) {
    if (rawVal === undefined || rawVal === null) continue;
    const val = rawVal.trim();
    const regex = new RegExp(`^${key}=.*$`, "m");
    const formatted = val.includes(" ") || val.includes("/") || val.includes(":") ? `"${val}"` : val;
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${formatted}`);
    } else {
      content += `\n${key}=${formatted}`;
    }
  }

  content = content.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  fs.writeFileSync(envPath, content, "utf8");
}

function getStorageStats() {
  const clipsDir = path.join(process.cwd(), "public", "clips");
  let totalFiles = 0;
  let totalBytes = 0;

  if (fs.existsSync(clipsDir)) {
    const files = fs.readdirSync(clipsDir);
    for (const file of files) {
      try {
        const stat = fs.statSync(path.join(clipsDir, file));
        if (stat.isFile()) {
          totalFiles++;
          totalBytes += stat.size;
        }
      } catch (e) {}
    }
  }

  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
  return { totalFiles, sizeMb, totalBytes };
}

export async function GET() {
  try {
    const settings = settingsStore.get();
    const envData = parseEnv();
    const profiles = await profileStore.getProfiles();
    const storage = getStorageStats();

    // Map public env view
    const envKeys = {
      youtubeApiKey: envData.YOUTUBE_API_KEY || "",
      aiApiKey: envData.AI_API_KEY || "",
      groqApiKey: envData.GROQ_API_KEY || "",
      instagramClientId: envData.INSTAGRAM_CLIENT_ID || "",
      instagramClientSecret: envData.INSTAGRAM_CLIENT_SECRET || "",
      nextPublicBaseUrl: envData.NEXT_PUBLIC_BASE_URL || "",
      hasYoutubeKey: Boolean(envData.YOUTUBE_API_KEY && envData.YOUTUBE_API_KEY !== "your_youtube_api_key_here"),
      hasAiKey: Boolean(envData.AI_API_KEY),
      hasGroqKey: Boolean(envData.GROQ_API_KEY),
      hasInstagramConfig: Boolean(envData.INSTAGRAM_CLIENT_ID && envData.INSTAGRAM_CLIENT_SECRET),
    };

    const connectedProfiles = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      instagramConnected: Boolean(p.instagramConnected),
      igUsername: p.igUsername || null,
      youtubeConnected: Boolean(p.youtubeConnected),
      youtubeChannelTitle: p.youtubeChannelTitle || null,
    }));

    return NextResponse.json({
      success: true,
      settings,
      envKeys,
      profiles: connectedProfiles,
      storage,
      jobStatus: trendingJobScheduler.getStatus(),
    });
  } catch (error: any) {
    console.error("Gagal get settings:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Update Application Settings (Auto Scrape, Region, Interval)
    if (body.settings) {
      const updated = settingsStore.save(body.settings);
      const cache = trendingJobScheduler.getCache();
      const nextScheduledAt = updated.autoScrapeEnabled
        ? trendingJobScheduler.calculateNextScheduledAt(
            cache.lastScrapedAt || updated.lastScrapedAt,
            updated.scrapeIntervalHours
          )
        : null;
      trendingJobScheduler.saveCache({ nextScheduledAt });
      trendingJobScheduler.ensureSchedulerStarted();
    }

    // 2. Update .env Keys
    if (body.envUpdates) {
      const updates: Record<string, string> = {};
      if (body.envUpdates.youtubeApiKey !== undefined) updates.YOUTUBE_API_KEY = body.envUpdates.youtubeApiKey;
      if (body.envUpdates.aiApiKey !== undefined) updates.AI_API_KEY = body.envUpdates.aiApiKey;
      if (body.envUpdates.groqApiKey !== undefined) updates.GROQ_API_KEY = body.envUpdates.groqApiKey;
      if (body.envUpdates.instagramClientId !== undefined) updates.INSTAGRAM_CLIENT_ID = body.envUpdates.instagramClientId;
      if (body.envUpdates.instagramClientSecret !== undefined) updates.INSTAGRAM_CLIENT_SECRET = body.envUpdates.instagramClientSecret;
      if (body.envUpdates.nextPublicBaseUrl !== undefined) updates.NEXT_PUBLIC_BASE_URL = body.envUpdates.nextPublicBaseUrl;

      if (Object.keys(updates).length > 0) {
        updateEnv(updates);
      }
    }

    // 3. Clear Temp files
    if (body.clearTempFiles) {
      const rootDir = path.join(process.cwd(), "..");
      const tempPatterns = [
        path.join(rootDir, "temp_raw.mp4"),
        path.join(rootDir, "temp_full_video.mp4"),
        path.join(rootDir, "temp_full_audio.m4a"),
        path.join(rootDir, "full_audio.m4a"),
        path.join(rootDir, "temp_subtitles.ass"),
        path.join(process.cwd(), "temp_raw.mp4"),
        path.join(process.cwd(), "temp_full_video.mp4"),
      ];
      for (const p of tempPatterns) {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil disimpan!",
      settings: settingsStore.get(),
      storage: getStorageStats(),
      jobStatus: trendingJobScheduler.getStatus(),
    });
  } catch (error: any) {
    console.error("Gagal save settings:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

