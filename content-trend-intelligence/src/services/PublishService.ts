import type { PublisherProfileData } from "@/lib/profileStore";
import type { PublishLog } from "@/lib/lastClipStore";
import { settingsStore } from "@/lib/settingsStore";
import { InstagramPublishService } from "@/services/InstagramPublishService";
import { YouTubePublishService } from "@/services/YouTubePublishService";
import { AIService } from "@/services/AIService";

export function formatCaption(template: string, title: string, hook: string, hashtags: string): string {
  return (template || "{title}\n\n{hashtags}")
    .replace(/\{title\}/g, title || "")
    .replace(/\{hook\}/g, hook || "")
    .replace(/\{hashtags\}/g, hashtags || "");
}

export class PublishService {
  /**
   * Publish satu file klip ke platform yang dipilih memakai akun pada profile.
   * Dilengkapi optimasi SEO otomatis yang disesuaikan secara dinamis dengan topik konten.
   */
  static async publishClip(params: {
    profile: PublisherProfileData;
    platforms: string[];
    clipPath: string;
    title: string;
    hook?: string;
    tags?: string[];
    hashtags?: string[];
  }): Promise<PublishLog[]> {
    const { profile, platforms, clipPath, title, hook = "" } = params;
    const appSettings = settingsStore.get();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const results: PublishLog[] = [];

    // 1. Ekstrak / Generate SEO Spesifik Konten (Tags YouTube & Hashtags Reels/Shorts)
    let finalTags = params.tags && params.tags.length > 0 ? [...params.tags] : [];
    let dynamicHashtags = params.hashtags && params.hashtags.length > 0 ? [...params.hashtags] : [];

    if (finalTags.length === 0 || dynamicHashtags.length === 0) {
      try {
        console.log(`[PublishService] Menghasilkan SEO dinamis berbasis konten untuk: "${title}"`);
        const seoResult = await AIService.generateContentSEO({ title, hook });
        if (finalTags.length === 0 && seoResult.tags?.length) {
          finalTags = seoResult.tags;
        }
        if (dynamicHashtags.length === 0 && seoResult.hashtags?.length) {
          dynamicHashtags = seoResult.hashtags;
        }
      } catch (seoErr) {
        console.warn("[PublishService] Gagal generate dynamic SEO, memakai fallback:", seoErr);
      }
    }

    // Gabungkan hashtag spesifik konten dengan default hashtags di Settings (deduplicate)
    const defaultTagList = (appSettings.defaultHashtags || "").split(/\s+/).filter(Boolean);
    const combinedHashtagsList = Array.from(new Set([...dynamicHashtags, ...defaultTagList]));
    const combinedHashtagsStr = combinedHashtagsList.join(" ");

    // Susun caption akhir dengan hashtags yang sudah diperkaya
    const caption = formatCaption(appSettings.captionTemplate, title, hook, combinedHashtagsStr);

    console.log(`[PublishService] Dynamic SEO Tags (${finalTags.length}):`, finalTags.slice(0, 10).join(", "));
    console.log(`[PublishService] Dynamic SEO Hashtags (${combinedHashtagsList.length}):`, combinedHashtagsStr);

    // 1. Instagram Reels
    if (platforms.includes("instagram")) {
      if (!profile.instagramConnected || !profile.instagramToken || !profile.instagramUserId) {
        results.push({
          platform: "instagram",
          success: false,
          error: "Akun Instagram belum terhubung di profil ini",
          publishedAt: new Date().toISOString(),
        });
      } else {
        const igRes = await InstagramPublishService.publishReel({
          instagramUserId: profile.instagramUserId,
          accessToken: profile.instagramToken,
          videoUrl: `${baseUrl}${clipPath}`,
          caption,
        });
        results.push({
          platform: "instagram",
          success: igRes.success,
          permalink: igRes.permalink,
          error: igRes.error,
          publishedAt: new Date().toISOString(),
        });
      }
    }

    // 2. YouTube Shorts
    if (platforms.includes("youtube")) {
      if (!profile.youtubeConnected || !profile.youtubeToken) {
        results.push({
          platform: "youtube",
          success: false,
          error:
            "Akun YouTube belum terhubung di profil ini. Silakan hubungkan akun Google di menu Publisher Accounts.",
          publishedAt: new Date().toISOString(),
        });
      } else {
        const ytRes = await YouTubePublishService.uploadShort({
          accessToken: profile.youtubeToken,
          refreshToken: profile.youtubeRefreshToken,
          videoFilePath: clipPath,
          title,
          description: caption,
          tags: finalTags,
        });
        results.push({
          platform: "youtube",
          success: ytRes.success,
          permalink: ytRes.permalink,
          error: ytRes.error,
          publishedAt: new Date().toISOString(),
        });
      }
    }

    // 3. TikTok (placeholder, sama seperti perilaku sebelumnya)
    if (platforms.includes("tiktok")) {
      if (!profile.tiktokConnected) {
        results.push({
          platform: "tiktok",
          success: false,
          error: "Akun TikTok belum terhubung di profil ini",
          publishedAt: new Date().toISOString(),
        });
      } else {
        results.push({
          platform: "tiktok",
          success: true,
          permalink: "https://tiktok.com/@clip",
          publishedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}

