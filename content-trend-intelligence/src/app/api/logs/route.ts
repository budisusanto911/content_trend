export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), "clipper_debug.log");
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ logs: "" });
    }
    const logs = fs.readFileSync(logPath, "utf8");
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ logs: "" });
  }
}
export async function DELETE() {
  try {
    const logPath = path.join(process.cwd(), "clipper_debug.log");
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}
