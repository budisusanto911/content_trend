import { NextResponse } from "next/server";
import { authStore, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/authStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, email, password } = body;

    const result = authStore.register({
      name: String(name || ""),
      username: String(username || ""),
      email: String(email || ""),
      password: String(password || ""),
    });

    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const token = createSessionToken(result, 30);
    const res = NextResponse.json({
      success: true,
      user: result,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan akun baru." },
      { status: 500 }
    );
  }
}

