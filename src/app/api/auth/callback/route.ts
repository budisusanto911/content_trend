import { NextResponse } from 'next/server';
import { profileStore } from '@/lib/profileStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateStr = searchParams.get('state');

  let platform = 'unknown';
  let profileId = 'unknown';
  let stateRedirectUri: string | null = null;

  if (stateStr) {
    try {
      const decoded = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
      platform = decoded.platform;
      profileId = decoded.profileId;
      stateRedirectUri = decoded.redirectUri || null;
    } catch (e) {
      console.error("Gagal parse state", e);
    }
  }

  const requestUrl = new URL(req.url);
  const host = req.headers.get('host') || requestUrl.host;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const baseUrl = isLocal ? `http://${host}` : (process.env.NEXT_PUBLIC_BASE_URL || `https://${host}`);
  const accountsUrl = `${baseUrl}/dashboard/clipper/accounts`;
  const redirectUri = stateRedirectUri || `${baseUrl}/api/auth/callback`;

  const errorMessage = searchParams.get('error_message') || error;

  if (errorMessage) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(errorMessage)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent('Tidak ada authorization code')}`);
  }

  if (platform === 'instagram') {
    try {
      const clientId = process.env.INSTAGRAM_CLIENT_ID;
      const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET belum di-set di .env');
      }

      // Instagram menambahkan "#_" di akhir code; harus dibuang.
      const cleanCode = code.replace(/#_$/, '');

      // 1. code -> short-lived token
      const form = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: cleanCode,
      });
      const shortRes = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
      const shortData = await shortRes.json();
      if (!shortRes.ok || !shortData.access_token) {
        throw new Error(shortData.error_message || shortData.error?.message || 'Gagal menukar code dengan token');
      }

      // 2. short-lived -> long-lived token (60 hari)
      let accessToken: string = shortData.access_token;
      let expiresAt: string | null = null;
      const longRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${accessToken}`
      );
      const longData = await longRes.json();
      if (longRes.ok && longData.access_token) {
        accessToken = longData.access_token;
        expiresAt = new Date(Date.now() + (longData.expires_in || 0) * 1000).toISOString();
      }

      // 3. Ambil username akun
      const meRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${accessToken}`
      );
      const me = await meRes.json();
      if (!meRes.ok) {
        throw new Error(me.error?.message || 'Gagal mengambil profil Instagram');
      }

      if (profileId !== 'unknown') {
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

  if (platform === 'youtube') {
    try {
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET belum di-set di .env');
      }

      // 1. Tukar auth code dengan access token & refresh token
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
        throw new Error(tokenData.error_description || tokenData.error || 'Gagal menukar code dengan token Google');
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || null;

      // 2. Ambil informasi nama Channel YouTube
      let channelTitle = null;
      try {
        const channelRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const channelData = await channelRes.json();
        if (channelData.items && channelData.items.length > 0) {
          channelTitle = channelData.items[0].snippet.title;
        }
      } catch (chErr) {
        console.warn('Gagal mengambil nama channel YouTube:', chErr);
      }

      if (profileId !== 'unknown') {
        const patch: any = {
          youtubeConnected: true,
          youtubeToken: accessToken,
          youtubeChannelTitle: channelTitle || 'YouTube Channel',
        };
        if (refreshToken) {
          patch.youtubeRefreshToken = refreshToken;
        }
        await profileStore.updateProfile(profileId, patch);
      }

      return NextResponse.redirect(`${accountsUrl}?oauth_success=true&platform=youtube`);
    } catch (e: any) {
      console.error('YouTube OAuth gagal:', e);
      return NextResponse.redirect(`${accountsUrl}?oauth_error=${encodeURIComponent(e.message || 'YouTube OAuth gagal')}`);
    }
  }

  if (platform === 'facebook') {
    try {
      const clientId = process.env.FACEBOOK_APP_ID;
      const clientSecret = process.env.FACEBOOK_APP_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('FACEBOOK_APP_ID / FACEBOOK_APP_SECRET belum di-set di .env');
      }

      // 1. Tukar code dengan short-lived user access token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}`;
      const shortRes = await fetch(tokenUrl);
      const shortData = await shortRes.json();
      if (!shortRes.ok || !shortData.access_token) {
        throw new Error(shortData.error?.message || 'Gagal menukar code dengan token Facebook');
      }

      // 2. Tukar ke long-lived user access token (60 hari)
      let userToken: string = shortData.access_token;
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

      // 3. Ambil daftar Facebook Pages milik user (/me/accounts)
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
        // Fallback ke profil user jika belum ada Facebook Page
        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(userToken)}`
        );
        const meData = await meRes.json();
        if (meRes.ok) {
          pageId = String(meData.id || '');
          pageName = meData.name || 'Facebook Account';
        }
      }

      if (profileId !== 'unknown') {
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

  if (platform === 'threads') {
    try {
      const clientId = process.env.THREADS_APP_ID;
      const clientSecret = process.env.THREADS_APP_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('THREADS_APP_ID / THREADS_APP_SECRET belum di-set di .env');
      }

      const cleanCode = code.replace(/#_$/, '');

      // 1. Tukar code dengan short-lived Threads access token
      const form = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: cleanCode,
      });
      const shortRes = await fetch('https://graph.threads.net/oauth/access_token', { method: 'POST', body: form });
      const shortData = await shortRes.json();
      if (!shortRes.ok || !shortData.access_token) {
        throw new Error(shortData.error_message || shortData.error?.message || 'Gagal menukar code dengan token Threads');
      }

      // 2. Tukar ke long-lived token (60 hari)
      let accessToken: string = shortData.access_token;
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

      // 3. Ambil username akun Threads
      const meRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`
      );
      const me = await meRes.json();
      if (!meRes.ok) {
        throw new Error(me.error?.message || 'Gagal mengambil profil Threads');
      }

      if (profileId !== 'unknown') {
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

  // Fallback untuk platform lain (misal: TikTok)
  if (profileId !== 'unknown') {
    try {
      const updateData: any = {};
      if (platform === 'tiktok') updateData.tiktokConnected = true;

      await profileStore.updateProfile(profileId, updateData);
    } catch (e) {
      console.error("Gagal update profile di storage", e);
    }
  }
  
  return NextResponse.redirect(`${accountsUrl}?oauth_success=true&platform=${platform}`);
}
