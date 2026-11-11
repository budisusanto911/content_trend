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

  const redirectUri = stateRedirectUri || `${baseUrl}/api/auth/facebook/callback`;

  if (error) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=NO_AUTH_CODE`);
  }

  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=FACEBOOK_CONFIG_MISSING`);
  }

  try {
    // 1. Exchange code for short-lived user token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}`;
    const shortRes = await fetch(tokenUrl);
    const shortData = await shortRes.json();
    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(shortData.error?.message || 'Gagal menukar code dengan token Facebook');
    }

    // 2. Exchange for long-lived token (60 days)
    let userToken = shortData.access_token;
    let expiresAt: string | null = null;
    const longUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&fb_exchange_token=${encodeURIComponent(userToken)}`;
    const longRes = await fetch(longUrl);
    const longData = await longRes.json();
    if (longRes.ok && longData.access_token) {
      userToken = longData.access_token;
      if (longData.expires_in) {
        expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
      }
    }

    // 3. Get Facebook Pages
    let pageId: string | null = null;
    let pageName: string | null = null;
    let pageToken: string = userToken;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`
    );
    const pagesData = await pagesRes.json();
    if (pagesRes.ok && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
      pageId = String(pagesData.data[0].id);
      pageName = pagesData.data[0].name || null;
      pageToken = pagesData.data[0].access_token || userToken;
    } else {
      const meRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(userToken)}`
      );
      const meData = await meRes.json();
      if (meRes.ok) {
        pageId = String(meData.id || '');
        pageName = meData.name || 'Facebook Account';
      }
    }

    // 4. Save to profile store
    const profiles = await profileStore.getProfiles();
    const existingProfile = profiles.find((p: PublisherProfileData) => p.id === profileId);
    if (existingProfile) {
      await profileStore.updateProfile(profileId, {
        facebookConnected: true,
        facebookToken: pageToken,
        facebookPageId: pageId,
        facebookPageName: pageName,
        facebookTokenExpiresAt: expiresAt,
      });
    }

    return NextResponse.redirect(`${accountsUrl}?oauth_success=true&platform=facebook`);
  } catch (e: any) {
    console.error('Facebook OAuth gagal:', e);
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(e.message || 'Facebook OAuth gagal')}`);
  }
}
