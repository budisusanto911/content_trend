# SETUP GUIDE — Auto Reply Comment Bot

## YouTube OAuth2 Setup

Untuk balas komentar YouTube, butuh OAuth2 access token (API Key cuma read-only).

### Langkah 1: Aktifkan YouTube Data API v3
1. Buka https://console.cloud.google.com/
2. Pilih project yang sama dengan YOUTUBE_CLIENT_ID
3. Aktifkan "YouTube Data API v3"
4. Buat OAuth 2.0 Client ID (Desktop app)
5. Download file JSON credentials

### Langkah 2: Generate OAuth Token
Jalankan di VPS:
```bash
cd /opt/content-trend
sudo -u ubuntu python3 -c "
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
import json, os

# Ganti dengan path file credentials yang kamu download dari Google Cloud Console
creds_file = '/path/to/your/client_secret.json'

flow = InstalledAppFlow.from_client_secrets_file(
    creds_file,
    scopes=['https://www.googleapis.com/auth/youtube.force-ssl']
)
creds = flow.run_local_server(port=0)

# Simpan token
token_data = {
    'token': creds.token,
    'refresh_token': creds.refresh_token,
    'token_uri': creds.token_uri,
    'client_id': creds.client_id,
    'client_secret': creds.client_secret,
    'scopes': creds.scopes
}
with open('/opt/content-trend/data/youtube_token.json', 'w') as f:
    json.dump(token_data, f)
print('✅ YouTube OAuth token tersimpan!')
"
```

**Catatan:** `run_local_server` butuh browser. Jalankan dari PC-mu, bukan VPS, atau pakai `run_console()` untuk copy-paste URL.

### Langkah 3: Instagram Access Token
1. Buka https://developers.facebook.com/
2. Buat App dan dapatkan App ID + App Secret
3. Generate User Access Token dengan scope `instagram_basic`, `instagram_manage_comments`
4. Simpan ke `/opt/content-trend/data/instagram_token.json`:
```json
{
  "access_token": "EAA...",
  "user_id": "17841400000000000"
}
```

### Langkah 4: IG Media ID Mapping
Bot butuh IG Media ID untuk setiap video. Tambahkan mapping di `clip_jobs.json`:
```json
{
  "instagram_media_id": "17895678901234567"
}
```

## Cron Job (sudah terpasang)
```
*/15 * * * * /opt/content-trend/auto_reply_comments_cron.sh
```

## Log
- `/opt/content-trend/data/comment_reply_log.json` — log semua reply
- `/opt/content-trend/data/replied_comments.json` — komentar yang sudah dibalas (anti-duplicate)
