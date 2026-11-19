import { NextResponse } from "next/server";
import { RetroVideoService } from "@/services/RetroVideoService";

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
      scenes = [],
      previewSceneIndex = 0,
    } = body;

    const result = await RetroVideoService.generatePreview({
      seriesTag,
      title,
      speaker,
      footerBrand,
      theme,
      bgStyle,
      bgImagePath,
      borderStyle,
      borderImagePath,
      scenes,
      previewSceneIndex,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, logs: result.logs }, { status: 500 });
    }

    return NextResponse.json({ success: true, previewUrl: result.previewUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to generate preview" }, { status: 500 });
  }
}
