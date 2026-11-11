import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { title, hook, transcript } = await req.json();
    if (!title || !hook) {
      return NextResponse.json({ success: false, error: "Title dan hook wajib diisi" }, { status: 400 });
    }

    const scriptCandidates = [
      path.join(process.cwd(), "toolkit", "repurposer.py"),
      path.join(process.cwd(), "..", "toolkit", "repurposer.py"),
    ];
    const scriptPath = scriptCandidates.find((p) => fs.existsSync(p));
    if (!scriptPath) {
      return NextResponse.json({ success: false, error: "Script repurposer.py tidak ditemukan" }, { status: 500 });
    }

    const scriptDir = path.dirname(path.dirname(scriptPath));
    const pythonCandidates = [
      path.join(scriptDir, "venv", "bin", "python"),
      path.join(process.cwd(), "venv", "bin", "python"),
      "python3",
    ];
    const pythonBin = pythonCandidates.find((p) => p === "python3" || fs.existsSync(p)) || "python3";

    return new Promise<NextResponse>((resolve) => {
      let output = "";
      const proc = spawn(pythonBin, [scriptPath, title, hook], { cwd: scriptDir });
      proc.stdout.on("data", (data) => (output += data.toString()));
      proc.stderr.on("data", (data) => console.error("[RepurposeAPI]", data.toString()));

      proc.on("close", (code) => {
        if (code !== 0) {
          resolve(NextResponse.json({ success: false, error: `Gagal memproses repurposer (code: ${code})` }, { status: 500 }));
          return;
        }
        try {
          const parsed = JSON.parse(output);
          resolve(NextResponse.json({ success: true, data: parsed }));
        } catch {
          resolve(NextResponse.json({ success: false, error: "Output JSON tidak valid" }, { status: 500 }));
        }
      });
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

