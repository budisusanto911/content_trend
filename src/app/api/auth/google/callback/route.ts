import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authStore, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/authStore';
import { randomUUID } from 'crypto';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') || '/dashboard';

  const requestUrl = new URL(req.url);
  const host = req.headers.get('host') || requestUrl.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (isLocal ? `http://${host}` : `https://${host}`);

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=NO_AUTH_CODE`);
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/login?error=GOOGLE_CONFIG_MISSING`);
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Gagal menukar code dengan token');
    }

    // 2. Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    if (!userRes.ok) {
      throw new Error(userData.error?.message || 'Gagal mengambil info pengguna Google');
    }

    const googleId = userData.id;
    const email = userData.email;
    const name = userData.name || email;
    const picture = userData.picture || null;

    if (!email) {
      throw new Error('Email tidak tersedia dari akun Google');
    }

    // 3. Find or create user in authStore
    const users = authStore.readAll();
    let existingUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.googleId === googleId
    );

    if (!existingUser) {
      // Create new user from Google account
      const username = email.split('@')[0];
      existingUser = {
        id: randomUUID(),
        username,
        email,
        name,
        role: users.length === 0 ? 'admin' : 'user',
        passwordHash: '',
        googleId,
        googlePicture: picture,
        createdAt: new Date().toISOString(),
      };
      users.push(existingUser);
      authStore.writeAll(users);
    } else {
      // Update Google ID if not set
      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
        existingUser.googlePicture = picture;
        authStore.writeAll(users);
      }
    }

    // 4. Create session
    const sessionUser = {
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role || 'user',
    };

    const token = createSessionToken(sessionUser, 30);

    const redirectTarget = state.startsWith('http') ? state : `${baseUrl}${state}?google_login=success`;
    const res = NextResponse.redirect(redirectTarget);
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (e: any) {
    console.error('Google OAuth login error:', e);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(e.message || 'Google login gagal')}`);
  }
}
