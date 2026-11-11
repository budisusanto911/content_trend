---
description: Ensures secure handling of API keys and secrets.
trigger: always_on
---
# API Security Rules

1. **Environment Variables**: All external API keys (YOUTUBE_API_KEY, TIKTOK_API_KEY, AI_API_KEY, DATABASE_URL) MUST be stored in `.env` or `.env.local` and accessed via `process.env`.
2. **No Client Leakage**: Never prefix secret keys with `NEXT_PUBLIC_` unless they are explicitly meant for client-side use (which is almost never the case for API keys).
3. **Backend Only**: API calls to YouTube, TikTok, or the AI Engine must occur from the backend (Server Components or API Route Handlers) to protect the credentials and bypass CORS issues.
