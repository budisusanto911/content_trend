import { NextResponse } from 'next/server';

export async function GET(req: Request, context: { params: Promise<{ platform: string }> }) {
  const params = await context.params;
  const { platform } = params;
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profile_id') || 'unknown';

  const requestUrl = new URL(req.url);
  const host = req.headers.get('host') || requestUrl.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  // Jika diakses lokal, prioritaskan localhost agar terbebas dari intersep ngrok-free interstitial
  const baseUrl = isLocal ? `http://${host}` : (process.env.NEXT_PUBLIC_BASE_URL || `https://${host}`);
  const redirectUri = `${baseUrl}/api/auth/callback`;

  // Encode platform, profileId, dan redirectUri ke state
  const state = Buffer.from(JSON.stringify({ platform, profileId, redirectUri })).toString('base64');

  const encodedRedirectUri = encodeURIComponent(redirectUri);

  if (platform === 'youtube') {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "YOUTUBE_CLIENT_ID belum di-set di .env" }, { status: 400 });
    
    const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
    
    return NextResponse.redirect(authUrl);
  } 
  
  else if (platform === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) return NextResponse.json({ error: "TIKTOK_CLIENT_KEY belum di-set di .env" }, { status: 400 });

    const scope = encodeURIComponent('user.info.basic,video.upload');
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${encodedRedirectUri}&state=${state}`;
    
    return NextResponse.redirect(authUrl);
  }
  
  else if (platform === 'instagram') {
    // "Instagram API with Instagram Login" (use case: Manage messaging & content on Instagram).
    // client_id di sini adalah *Instagram app ID* (bukan Meta App ID), lihat di:
    // Use cases > Customize > API setup with Instagram login.
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "INSTAGRAM_CLIENT_ID belum di-set di .env" }, { status: 400 });

    const scope = encodeURIComponent('instagram_business_basic,instagram_business_content_publish');
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}`;
    
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.json({ error: "Platform tidak dikenali" }, { status: 400 });
}
