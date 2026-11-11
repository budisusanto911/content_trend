import { NextResponse } from 'next/server';
import { profileStore, PublisherProfileData } from '@/lib/profileStore';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  const requestUrl = new URL(req.url);
  const host = requestUrl.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (isLocal ? `http://${host}` : `https://${host}`);
  const accountsUrl = `${baseUrl}/dashboard/clipper/accounts`;

  let profileId = 'unknown';
  let stateRedirectUri: string | null = null;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      profileId = decoded.profileId || 'unknown';
      stateRedirectUri = decoded.redirectUri || null;
    } catch (e) {
      console.error('Gagal parse state', e);
    }
  }

  const redirectUri = stateRedirectUri || `${baseUrl}/api/auth/tiktok/callback`;

  if (error) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=NO_AUTH_CODE`);
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=TIKTOK_CONFIG_MISSING`);
  }

  try {
    const form = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.error?.message || data.error_description || 'Gagal menukar code dengan token TikTok');
    }

    const profiles = await profileStore.getProfiles();
    const existingProfile = profiles.find((p: PublisherProfileData) => p.id === profileId);
    if (existingProfile) {
      await profileStore.updateProfile(profileId, {
        tiktokConnected: true,
      });
    }

    return NextResponse.redirect(`${accountsUrl}?oauth_success=true&platform=tiktok`);
  } catch (e: any) {
    console.error('TikTok OAuth gagal:', e);
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(e.message || 'TikTok OAuth gagal')}`);
  }
}
