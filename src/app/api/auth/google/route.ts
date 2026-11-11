import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '/dashboard';

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`/login?error=GOOGLE_CLIENT_ID_NOT_SET`);
  }

  const requestUrl = new URL(req.url);
  const host = req.headers.get('host') || requestUrl.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const baseUrl = isLocal ? `http://${host}` : (process.env.NEXT_PUBLIC_BASE_URL || `https://${host}`);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const scope = encodeURIComponent(
    'openid email profile https://www.googleapis.com/auth/youtube.upload'
  );

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(from)}`;

  return NextResponse.json({ url: authUrl });
}
