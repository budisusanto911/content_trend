#!/usr/bin/env python3
"""
Exchange YouTube OAuth authorization code for access token + refresh token
Using requests directly to token endpoint
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, '/opt/content-trend')
os.environ.setdefault('PATH', '/usr/bin:/usr/local/bin:/home/ubuntu/.local/bin')

from dotenv import load_dotenv
load_dotenv('/opt/content-trend/.env')

import requests

CLIENT_SECRET_FILE = '/opt/content-trend/data/youtube_client_secret.json'
TOKEN_FILE = '/opt/content-trend/data/youtube_token.json'

# Authorization code dari user
AUTH_CODE = "4/0AUn6Hd_bYpqnUiTlCv7S0Vm1fZPpI7xbHF5x6QDKJO84zzuDQCkHI81RfO89x3aEsAb9tg"

# Load client secret
with open(CLIENT_SECRET_FILE, 'r') as f:
    client_data = json.load(f)

client_info = client_data.get('web') or client_data.get('installed')
CLIENT_ID = client_info['client_id']
CLIENT_SECRET = client_info['client_secret']
TOKEN_URI = client_info['token_uri']
REDIRECT_URI = client_info['redirect_uris'][0]  # http://localhost


def exchange_code():
    """Exchange authorization code for access token + refresh token."""
    try:
        data = {
            'code': AUTH_CODE,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'redirect_uri': REDIRECT_URI,
            'grant_type': 'authorization_code',
        }

        print(f"🔄 Exchange code untuk token...")
        print(f"   Client ID: {CLIENT_ID}")
        print(f"   Redirect URI: {REDIRECT_URI}")
        print(f"   Token URI: {TOKEN_URI}")

        resp = requests.post(TOKEN_URI, data=data, timeout=30)

        print(f"   Status: {resp.status_code}")
        print(f"   Response: {resp.text[:500]}")

        if resp.status_code == 200:
            token_data = resp.json()

            # Add client info
            token_data['client_id'] = CLIENT_ID
            token_data['client_secret'] = CLIENT_SECRET
            token_data['token_uri'] = TOKEN_URI

            with open(TOKEN_FILE, 'w') as f:
                json.dump(token_data, f, indent=2)

            print("=" * 70)
            print("✅ YOUTUBE OAuth TOKEN BERHASIL DISIMPAN!")
            print("=" * 70)
            print(f"   File: {TOKEN_FILE}")
            print(f"   Access token: {'✅ Ada' if token_data.get('access_token') else '❌ Kosong'}")
            print(f"   Refresh token: {'✅ Ada' if token_data.get('refresh_token') else '❌ Kosong'}")
            print(f"   Expires in: {token_data.get('expires_in', 'N/A')} detik")
            print()
            print("🔄 Sekarang restart service:")
            print("   sudo systemctl restart content-trend")
            print("=" * 70)

            return True
        else:
            print(f"❌ Gagal exchange token: HTTP {resp.status_code}")
            print(f"   Response: {resp.text}")
            return False

    except Exception as e:
        print(f"❌ Gagal exchange token: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    exchange_code()
