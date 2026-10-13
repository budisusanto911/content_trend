import { NextResponse } from "next/server";
import { profileStore } from "@/lib/profileStore";
import { lastClipStore } from "@/lib/lastClipStore";
import { NotificationService } from "@/services/NotificationService";
import { PublishService } from "@/services/PublishService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, platforms = ["instagram"], customTitle, tags: customTags, hashtags: customHashtags } = body;

    if (!profileId) {
      return NextResponse.json({ success: false, error: "profileId wajib diisi" }, { status: 400 });
    }

    const allProfiles = await profileStore.getProfiles();
    const profile = allProfiles.find((p) => p.id === profileId);

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profil tidak ditemukan" }, { status: 404 });
    }

    const lastClip = lastClipStore.get();
    const title = customTitle || lastClip?.title || "Video Klip Pilihan";
    const hook = lastClip?.hook || "";
    const clipPath = lastClip?.outputFile || "/clips/final_ready_to_upload.mp4";
    const tags = customTags || lastClip?.tags;
    const hashtags = customHashtags || lastClip?.hashtags;

    const publishResults = await PublishService.publishClip({
      profile,
      platforms,
      clipPath,
      title,
      hook,
      tags,
      hashtags,
    });

    // Update last clip store with merged results agar link platform sebelumnya tidak hilang
    const existingPubs = lastClip?.publishedTo || [];
    const mergedMap = new Map();
    for (const p of existingPubs) {
      if (p.platform) mergedMap.set(p.platform, p);
    }
    for (const p of publishResults) {
      if (p.platform) mergedMap.set(p.platform, p);
    }
    const finalPublishedTo = Array.from(mergedMap.values());

    const hasSuccess = finalPublishedTo.some((r: any) => r.success);
    lastClipStore.update({
      published: hasSuccess,
      publishedTo: finalPublishedTo,
    });

    // Kirim notifikasi webhook (Discord / Telegram) jika diaktifkan
    try {
      const validPermalinks = publishResults
        .filter((r) => r.success && r.permalink)
        .map((r) => ({ platform: r.platform, url: r.permalink }));

      await NotificationService.sendNotification({
        title,
        hook,
        videoPath: clipPath,
        sourceUrl: lastClip?.sourceUrl || "",
        permalinks: validPermalinks,
        status: validPermalinks.length > 0 ? "published" : "error",
      });
    } catch (notifErr) {
      console.error("Gagal mengirim webhook notifikasi publish:", notifErr);
    }

    return NextResponse.json({
      success: hasSuccess,
      results: publishResults,
      profileName: profile.name,
      igUsername: profile.igUsername,
    });
  } catch (error: any) {
    console.error("Error publishing clip:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mempublish video" },
      { status: 500 }
    );
  }
}

