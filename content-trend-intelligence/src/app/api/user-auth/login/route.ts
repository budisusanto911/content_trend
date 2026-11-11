import { NextResponse } from "next/server";
import { authStore, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/authStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password, rememberMe = true } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Username/Email dan Password wajib diisi." },
        { status: 400 }
      );
    }

    const user = authStore.authenticate(String(identifier), String(password));
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Username/Email atau Password salah." },
        { status: 401 }
      );
    }

    const days = rememberMe ? 30 : 1;
    const token = createSessionToken(user, days);

    const res = NextResponse.json({
      success: true,
      user,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: days * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan pada server saat login." },
      { status: 500 }
    );
  }
}

