import { NextResponse } from "next/server";
import { lastClipStore, PublishLog } from "@/lib/lastClipStore";
import { profileStore } from "@/lib/profileStore";
import { NotificationService } from "@/services/NotificationService";
import { ClipperService } from "@/services/ClipperService";
import { PublishService } from "@/services/PublishService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { url, profileId, autoPublish = false, platforms = ["instagram", "youtube"] } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Diserialisasi dengan job otomatis (hanya 1 pipeline python berjalan sekaligus)
    const run = await ClipperService.runClip(url);

    if (!run.success) {
      return NextResponse.json(
        { success: false, error: run.error || "Python script gagal", logs: run.logs },
        { status: 500 }
      );
    }

    // Pastikan metadata tersimpan
    let currentClip = lastClipStore.get();
    if (!currentClip) {
      currentClip = lastClipStore.update({
        outputFile: "/clips/final_ready_to_upload.mp4",
        title: "Klip Hasil Generate AI",
        sourceUrl: url,
      });
    }

    const clipPath = currentClip?.outputFile || "/clips/final_ready_to_upload.mp4";
    const title = currentClip?.title || "Video Klip Pilihan";
    const hook = currentClip?.hook || "";

    let publishResults: PublishLog[] = [];

    // Jika Auto-Publish diaktifkan dan ada profile yang dipilih
    if (autoPublish && profileId) {
      try {
        const allProfiles = await profileStore.getProfiles();
        const profile = allProfiles.find((p) => p.id === profileId);

        if (profile) {
          // Perilaku lama: platform yang belum terhubung dilewati diam-diam
          const connectedPlatforms = (platforms as string[]).filter(
            (p) =>
              (p === "instagram" && profile.instagramConnected && profile.instagramToken && profile.instagramUserId) ||
              (p === "youtube" && profile.youtubeConnected && profile.youtubeToken) ||
              (p === "facebook" && profile.facebookConnected) ||
              (p === "threads" && profile.threadsConnected) ||
              (p === "tiktok" && profile.tiktokConnected)
          );

          publishResults = await PublishService.publishClip({
            profile,
            platforms: connectedPlatforms,
            clipPath,
            title,
            hook,
            tags: currentClip?.tags,
            hashtags: currentClip?.hashtags,
          });

          const hasSuccess = publishResults.some((r) => r.success);
          lastClipStore.update({
            published: hasSuccess,
            publishedTo: publishResults,
          });
        }
      } catch (pubErr) {
        console.error("Gagal auto-publish:", pubErr);
      }
    }

    // Kirim notifikasi webhook (Discord / Telegram) jika diaktifkan
    try {
      const validPermalinks = publishResults
        .filter((r) => r.success && r.permalink)
        .map((r) => ({ platform: r.platform, url: r.permalink }));

      await NotificationService.sendNotification({
        title,
        hook,
        videoPath: clipPath,
        sourceUrl: url,
        permalinks: validPermalinks,
        status: validPermalinks.length > 0 ? "published" : "clipped",
      });
    } catch (notifErr) {
      console.error("Gagal mengirim webhook notifikasi:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Video berhasil dipotong!",
      outputFile: "/clips/final_ready_to_upload.mp4",
      clip: lastClipStore.get(),
      publishResults,
      logs: run.logs,
    });
  } catch (error: any) {
    console.error("Error clipping video:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process video",
      },
      { status: 500 }
    );
  }
}
