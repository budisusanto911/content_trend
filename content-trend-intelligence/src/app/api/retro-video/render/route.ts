import { NextResponse } from "next/server";
import { RetroVideoService } from "@/services/RetroVideoService";
import { lastClipStore } from "@/lib/lastClipStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      seriesTag = "SERI JUMAT 3/3",
      title = "Tempat Berdoa di Hari Jumat",
      speaker = "Syaikh Prof. Dr. Badr bin Nashir al-Badr",
      footerBrand = "DzikirQu | MASJID BASHIRAH",
      theme = "navy_blue",
      bgStyle = "classic_cream",
      bgImagePath = "",
      borderStyle = "islamic_star",
      borderImagePath = "",
      voice = "id-ID-ArdiNeural",
      scenes = [],
    } = body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ success: false, error: "Minimal harus ada 1 scene." }, { status: 400 });
    }

    const result = await RetroVideoService.renderVideo({
      seriesTag,
      title,
      speaker,
      footerBrand,
      theme,
      bgStyle,
      bgImagePath,
      borderStyle,
      borderImagePath,
      voice,
      scenes,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, logs: result.logs }, { status: 500 });
    }

    try {
      lastClipStore.update({
        outputFile: result.videoUrl,
        title,
        hook: seriesTag ? `${seriesTag} - ${title}` : title,
        tags: ["#dzikir", "#renungan", "#doa", "#jumat", "#islamicreels"],
        hashtags: ["#dzikir", "#renungan", "#doa", "#doodlereels"],
      });
    } catch (e) {
      console.warn("Could not record to lastClipStore:", e);
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      title,
      logs: result.logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Render failed" }, { status: 500 });
  }
}
