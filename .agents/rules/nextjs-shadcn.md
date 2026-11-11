---
description: Enforces Next.js App Router, shadcn/ui, and Tailwind CSS conventions.
trigger: always_on
---
# Next.js & UI Development Rules

When developing the Content Trend Intelligence app:

1. **Next.js App Router**: Always use the App Router (`app/` directory). By default, all components are Server Components. Only add `'use client'` at the top of the file when you need interactivity (useState, useEffect, event listeners).
2. **shadcn/ui & Tailwind CSS**: Use Tailwind CSS for all styling. Rely on `shadcn/ui` components for common UI elements (Buttons, Cards, Dialogs, etc.). Do not write custom CSS unless strictly necessary.
3. **Data Fetching**: Prefer Server Components for data fetching. Use API Routes (`app/api/...`) for endpoints consumed by the client or external services.
4. **TypeScript**: Write strict TypeScript. Define interfaces for database models (e.g., Video, TrendScore, ContentContext).
5. **Security**: Ensure all API keys (YouTube, TikTok, AI) are loaded via `process.env` and never leaked to the client side. Never use `NEXT_PUBLIC_` for secret keys.
