import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_EXTS = new Set([".mp3", ".wav", ".m4a", ".ogg", ".aac"]);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "audio";

    if (!file) {
      return NextResponse.json({ success: false, error: "File audio tidak ditemukan." }, { status: 400 });
    }

    const origExt = path.extname(file.name || ".mp3").toLowerCase();
    const ext = ALLOWED_EXTS.has(origExt) ? origExt : ".mp3";
    const filename = `${kind}_${Date.now()}${ext}`;

    const candidates = [
      path.join(process.cwd(), "public", "clips", "audio"),
      path.join(process.cwd(), "content-trend-intelligence", "public", "clips", "audio"),
    ];
    const targetDir = candidates.find((p) => fs.existsSync(path.dirname(p))) || candidates[0];
    fs.mkdirSync(targetDir, { recursive: true });

    const fullPath = path.join(targetDir, filename);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(fullPath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      audioPath: fullPath,
      audioUrl: `/clips/audio/${filename}`,
      fileName: file.name,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Gagal upload audio" }, { status: 500 });
  }
}
