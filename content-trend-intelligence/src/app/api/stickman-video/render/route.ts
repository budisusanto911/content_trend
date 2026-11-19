import { NextResponse } from "next/server";
import { StickmanVideoService } from "@/services/StickmanVideoService";
import { lastClipStore } from "@/lib/lastClipStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      theme = "calm_ink",
      paperStyle = "notebook_grid",
      charStyle = "chibi",
      intonation = "auto",
      channelTag = "@catatan.tenang",
      useVoice = true,
      voice = "en-US-AndrewMultilingualNeural",
      customVoiceAudio = "",
      useBgm = true,
      bgmTrack = "auto",
      customBgmPath = "",
      bgmVolume = 0.28,
      scenes = [],
    } = body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ success: false, error: "Minimal harus ada 1 scene." }, { status: 400 });
    }

    const result = await StickmanVideoService.renderVideo({
      theme,
      paperStyle,
      charStyle,
      intonation,
      channelTag,
      useVoice,
      voice,
      customVoiceAudio,
      useBgm,
      bgmTrack,
      customBgmPath,
      bgmVolume,
      scenes,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, logs: result.logs }, { status: 500 });
    }

    try {
      const firstLabel = scenes[0]?.moodLabel || "Stickman Story";
      lastClipStore.update({
        outputFile: result.videoUrl,
        title: firstLabel,
        hook: scenes[0]?.text?.replace(/\*/g, "") || firstLabel,
        tags: ["#stickman", "#relatable", "#selfhealing", "#solusihidup", "#doodle"],
        hashtags: ["#stickman", "#relatable", "#selfimprovement", "#dailyreminder"],
      });
    } catch {}

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      logs: result.logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Render failed" }, { status: 500 });
  }
}
