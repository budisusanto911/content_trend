#!/usr/bin/env python3
"""
OAuth Setup Script untuk Content Trend Intelligence
Generate access token untuk YouTube dan Instagram agar auto-publish bisa jalan.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, '/opt/content-trend')
os.environ.setdefault('PATH', '/usr/bin:/usr/local/bin:/home/ubuntu/.local/bin')

from dotenv import load_dotenv
load_dotenv('/opt/content-trend/.env')

DATA_DIR = Path("/opt/content-trend/data")
DATA_DIR.mkdir(exist_ok=True)

YOUTUBE_CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET", "")

INSTAGRAM_CLIENT_ID = os.environ.get("INSTAGRAM_CLIENT_ID", "")
INSTAGRAM_CLIENT_SECRET = os.environ.get("INSTAGRAM_CLIENT_SECRET", "")
FACEBOOK_APP_ID = os.environ.get("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET", "")


def print_youtube_setup():
    print("\n" + "=" * 60)
    print("📺 YOUTUBE OAUTH2 SETUP")
    print("=" * 60)
    print(f"Client ID: {YOUTUBE_CLIENT_ID}")
    print(f"Client Secret: {YOUTUBE_CLIENT_SECRET}")
    print()
    print("LANGKAH SETUP:")
    print("1. Buka Google Cloud Console: https://console.cloud.google.com/")
    print("2. Pastikan YouTube Data API v3 sudah diaktifkan")
    print("3. Buat OAuth 2.0 Client ID (tipe: Desktop app)")
    print("4. Download file JSON credentials")
    print("5. Simpan sebagai: /opt/content-trend/data/youtube_client_secret.json")
    print()
    print("6. Jalankan perintah berikut di PC-mu (bukan VPS, karena butuh browser):")
    print()
    print("   python3 -c \"")
    print("   from google_auth_oauthlib.flow import InstalledAppFlow")
    print("   import json")
    print()
    print("   flow = InstalledAppFlow.from_client_secrets_file(")
    print("       '/path/to/youtube_client_secret.json',")
    print("       scopes=['https://www.googleapis.com/auth/youtube.upload',")
    print("               'https://www.googleapis.com/auth/youtube.force-ssl']")
    print("   )")
    print("   creds = flow.run_local_server(port=0)")
    print()
    print("   token_data = {")
    print("       'token': creds.token,")
    print("       'refresh_token': creds.refresh_token,")
    print("       'token_uri': creds.token_uri,")
    print("       'client_id': creds.client_id,")
    print("       'client_secret': creds.client_secret,")
    print("       'scopes': creds.scopes")
    print("   }")
    print("   with open('youtube_token.json', 'w') as f:")
    print("       json.dump(token_data, f)")
    print("   print('Token saved!')")
    print("   \"")
    print()
    print("7. Upload file youtube_token.json ke VPS di:")
    print("   /opt/content-trend/data/youtube_token.json")
    print()
    print("8. Restart service:")
    print("   sudo systemctl restart content-trend")


def print_instagram_setup():
    print("\n" + "=" * 60)
    print("📸 INSTAGRAM OAUTH SETUP")
    print("=" * 60)
    print(f"Instagram App ID: {INSTAGRAM_CLIENT_ID}")
    print(f"Instagram App Secret: {INSTAGRAM_CLIENT_SECRET}")
    print(f"Facebook App ID: {FACEBOOK_APP_ID}")
    print(f"Facebook App Secret: {FACEBOOK_APP_SECRET}")
    print()
    print("LANGKAH SETUP:")
    print("1. Buka Facebook Developer: https://developers.facebook.com/")
    print("2. Pilih app Anda (atau buat baru)")
    print("3. Tambahkan produk: Instagram Graph API")
    print("4. Buat App Access Token atau User Access Token dengan scope:")
    print("   - instagram_basic")
    print("   - instagram_manage_comments")
    print("   - instagram_content_publish")
    print("   - pages_read_engagement")
    print("   - pages_manage_posts")
    print()
    print("5. Dapatkan Long-Lived Access Token:")
    print("   https://developers.facebook.com/docs/instagram/basic-display-api/getting-tokens")
    print()
    print("6. Simpan token ke file:")
    print("   /opt/content-trend/data/instagram_token.json")
    print()
    print("   Format:")
    print("   {")
    print('     "access_token": "EAAxxxxxxxxx",')
    print('     "instagram_user_id": "17841400000000000"')
    print("   }")
    print()
    print("7. Restart service:")
    print("   sudo systemctl restart content-trend")


def check_token_status():
    print("\n" + "=" * 60)
    print("📋 STATUS TOKEN")
    print("=" * 60)

    # Check YouTube token
    yt_token_file = DATA_DIR / "youtube_token.json"
    if yt_token_file.exists():
        print("✅ youtube_token.json sudah ada!")
        try:
            with open(yt_token_file, "r") as f:
                token_data = json.load(f)
            print(f"   - has access_token: {bool(token_data.get('token'))}")
            print(f"   - has refresh_token: {bool(token_data.get('refresh_token'))}")
        except Exception as e:
            print(f"   ⚠️  File rusak: {e}")
    else:
        print("❌ youtube_token.json belum ada - perlu setup OAuth")

    # Check Instagram token
    ig_token_file = DATA_DIR / "instagram_token.json"
    if ig_token_file.exists():
        print("✅ instagram_token.json sudah ada!")
        try:
            with open(ig_token_file, "r") as f:
                token_data = json.load(f)
            print(f"   - has access_token: {bool(token_data.get('access_token'))}")
            print(f"   - instagram_user_id: {token_data.get('instagram_user_id', 'N/A')}")
        except Exception as e:
            print(f"   ⚠️  File rusak: {e}")
    else:
        print("❌ instagram_token.json belum ada - perlu setup OAuth")


def main():
    print("🔧 OAuth Setup Tool - Content Trend Intelligence")
    print()
    print("Pilih setup yang ingin dilakukan:")
    print("1. YouTube OAuth2")
    print("2. Instagram OAuth")
    print("3. Cek status keduanya")
    print()

    try:
        choice = input("Pilihan (1-3): ").strip()
    except EOFError:
        choice = "3"

    if choice == "1":
        print_youtube_setup()
    elif choice == "2":
        print_instagram_setup()
    else:
        print_youtube_setup()
        print_instagram_setup()

    print("\n" + "=" * 60)
    print("📝 SETUP COMPLETE")
    print("=" * 60)
    print("Setelah token tersimpan, restart service:")
    print("  sudo systemctl restart content-trend")
    print()


if __name__ == "__main__":
    main()
