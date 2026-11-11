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

  const redirectUri = stateRedirectUri || `${baseUrl}/api/auth/threads/callback`;

  if (error) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=NO_AUTH_CODE`);
  }

  const clientId = process.env.THREADS_APP_ID;
  const clientSecret = process.env.THREADS_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=THREADS_CONFIG_MISSING`);
  }

  try {
    // 1. Exchange code for short-lived token
    const cleanCode = code.replace(/#_$/, '');
    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: cleanCode,
    });
    const shortRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const shortData = await shortRes.json();
    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(shortData.error_message || shortData.error?.message || 'Gagal menukar code dengan token Threads');
    }

    // 2. Exchange for long-lived token (60 days)
    let accessToken = shortData.access_token;
    let expiresAt: string | null = null;
    const longRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(clientSecret)}&access_token=${encodeURIComponent(accessToken)}`
    );
    const longData = await longRes.json();
    if (longRes.ok && longData.access_token) {
      accessToken = longData.access_token;
      if (longData.expires_in) {
        expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
      }
    }

    // 3. Get Threads user info
    const meRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`
    );
    const me = await meRes.json();
    if (!meRes.ok) {
      throw new Error(me.error?.message || 'Gagal mengambil profil Threads');
    }

    // 4. Save to profile store
    const profiles = await profileStore.getProfiles();
    const existingProfile = profiles.find((p: PublisherProfileData) => p.id === profileId);
    if (existingProfile) {
      await profileStore.updateProfile(profileId, {
        threadsConnected: true,
        threadsToken: accessToken,
        threadsUserId: String(me.id || shortData.user_id || ''),
        threadsUsername: me.username || null,
        threadsTokenExpiresAt: expiresAt,
      });
    }

    return NextResponse.redirect(`${accountsUrl}?oauth_success=true&platform=threads`);
  } catch (e: any) {
    console.error('Threads OAuth gagal:', e);
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(e.message || 'Threads OAuth gagal')}`);
  }
}
