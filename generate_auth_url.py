#!/usr/bin/env python3
"""
Generate YouTube OAuth Authorization URL
Run this on VPS, then open the URL in your browser to get the auth code.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, '/opt/content-trend')
os.environ.setdefault('PATH', '/usr/bin:/usr/local/bin:/home/ubuntu/.local/bin')

from dotenv import load_dotenv
load_dotenv('/opt/content-trend/.env')

from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_SECRET_FILE = '/opt/content-trend/data/youtube_client_secret.json'
TOKEN_FILE = '/opt/content-trend/data/youtube_token.json'

SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl'
]


def generate_auth_url():
    """Generate authorization URL for user to visit."""
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
    
    # Use run_console style - just get the URL
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    print("=" * 70)
    print("🔗 BUKA URL INI DI BROWSER KAMU:")
    print("=" * 70)
    print()
    print(auth_url)
    print()
    print("=" * 70)
    print("📝 LANGSUNGKAN:")
    print("1. Buka URL di atas di browser")
    print("2. Login dengan akun Google kamu")
    print("3. Izinkan akses YouTube")
    print("4. Copy kode authorization yang muncul")
    print("5. Kembalikan kode tersebut ke aku di chat Telegram")
    print("=" * 70)
    
    return flow


if __name__ == "__main__":
    generate_auth_url()
