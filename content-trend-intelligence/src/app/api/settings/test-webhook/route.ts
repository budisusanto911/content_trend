import { NextResponse } from "next/server";
import { NotificationService } from "@/services/NotificationService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { webhookType, webhookUrl } = body;

    if (!webhookType || webhookType === "none") {
      return NextResponse.json(
        { success: false, error: "Pilih provider webhook terlebih dahulu (Discord atau Telegram)." },
        { status: 400 }
      );
    }

    if (!webhookUrl || !webhookUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "URL Webhook atau Token belum diisi." },
        { status: 400 }
      );
    }

    const testPayload = {
      title: "🧪 Test Notifikasi AI Video Clipper",
      hook: "Sistem Webhook Berhasil Terhubung!",
      videoPath: "/clips/final_ready_to_upload.mp4",
      sourceUrl: "https://www.youtube.com",
      permalinks: [
        { platform: "Test Platform", url: "https://youtube.com" }
      ],
      status: "clipped" as const,
    };

    const result = await NotificationService.sendNotification(testPayload, {
      webhookType,
      webhookUrl: webhookUrl.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Gagal mengirim notifikasi test." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengirim test notifikasi ke ${webhookType === "discord" ? "Discord" : "Telegram"}!`,
    });
  } catch (error: any) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menguji webhook" },
      { status: 500 }
    );
  }
}

