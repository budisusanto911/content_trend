import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "File gambar tidak ditemukan." }, { status: 400 });
    }

    const origExt = path.extname(file.name || ".png").toLowerCase();
    const ext = ALLOWED_EXTS.has(origExt) ? origExt : ".png";
    const filename = `custom_bg_${Date.now()}${ext}`;

    // Resolve public/clips directory safely
    const candidates = [
      path.join(process.cwd(), "public", "clips", "backgrounds"),
      path.join(process.cwd(), "content-trend-intelligence", "public", "clips", "backgrounds"),
    ];
    const targetDir = candidates.find((p) => fs.existsSync(path.dirname(p))) || candidates[0];
    fs.mkdirSync(targetDir, { recursive: true });

    const fullPath = path.join(targetDir, filename);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(fullPath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      bgImagePath: fullPath,
      bgPreviewUrl: `/clips/backgrounds/${filename}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Gagal upload background" }, { status: 500 });
  }
}
