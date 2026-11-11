import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authStore, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/authStore';
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

  // Parse state to get profile_id and original redirectUri
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

  const redirectUri = stateRedirectUri || `${baseUrl}/api/auth/instagram/callback`;

  if (error) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=NO_AUTH_CODE`);
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=INSTAGRAM_CONFIG_MISSING`);
  }

  try {
    // 1. Exchange code for short-lived token
    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code.replace(/#_$/, ''),
    });
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const shortData = await shortRes.json();
    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(shortData.error_message || shortData.error?.message || 'Gagal menukar code dengan token');
    }

    // 2. Exchange short-lived for long-lived token (60 days)
    let accessToken = shortData.access_token;
    let expiresAt: string | null = null;
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${accessToken}`
    );
    const longData = await longRes.json();
    if (longRes.ok && longData.access_token) {
      accessToken = longData.access_token;
      if (longData.expires_in) {
        expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
      }
    }

    // 3. Get Instagram user info
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${accessToken}`
    );
    const me = await meRes.json();
    if (!meRes.ok) {
      throw new Error(me.error?.message || 'Gagal mengambil profil Instagram');
    }

    // 4. Save to profile store
    const profiles = await profileStore.getProfiles();
    const existingProfile = profiles.find((p: PublisherProfileData) => p.id === profileId);
    if (existingProfile) {
      await profileStore.updateProfile(profileId, {
        instagramConnected: true,
        instagramToken: accessToken,
        instagramUserId: String(me.user_id || shortData.user_id || ''),
        igUsername: me.username || null,
        instagramTokenExpiresAt: expiresAt,
      });
    }

    return NextResponse.redirect(`${accountsUrl}?oauth_success=true&platform=instagram`);
  } catch (e: any) {
    console.error('Instagram OAuth gagal:', e);
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(e.message || 'Instagram OAuth gagal')}`);
  }
}
