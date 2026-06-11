# API Setup

BuildCompare SA uses **DeepSeek** as its canonical AI provider, with **Groq** as a graceful fallback. The DeepSeek API is OpenAI-compatible, so we use the `openai` npm package as the transport layer.

## 1. Get a DeepSeek API key (required)

1. Visit [platform.deepseek.com](https://platform.deepseek.com/) and sign up.
2. Create an API key from the dashboard.
3. The key starts with `sk-…`.

DeepSeek powers chat, BoQ extraction, price parsing, and quote normalisation. Without it, the app cannot extract structured line items from uploaded BoQs.

## 2. (Optional) Get a Groq API key for fallback

If DeepSeek experiences an outage or rate-limit, BuildCompare automatically falls back to Groq's Llama 3.3 70B / Llama 3.1 8B Instant models.

1. Visit [console.groq.com](https://console.groq.com/) and sign up.
2. Create an API key (free tier is sufficient for fallback usage).

## 3. (Required for live pricing) Browserbase

Browserbase is the cloud headless-Chromium service the `scraper/` Python microservice uses to fetch raw HTML from Builders Warehouse, Cashbuild, Leroy Merlin, BUCO, and Build it.

1. Visit [browserbase.com](https://www.browserbase.com/) and sign up.
2. Create a project; copy the API key and project ID.

Without Browserbase, the scraper falls back to a local Playwright Chromium — fine for dev, not recommended for production parallel scraping.

## 4. Configure `.env.local`

In the project root, create `.env.local` and set:

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
GROQ_API_KEY=gsk_your-groq-key                 # optional fallback
BROWSERBASE_API_KEY=bb_your-browserbase-key    # required for live prices
BROWSERBASE_PROJECT_ID=your-project-id

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

See [`.env.example`](.env.example) for the full template.

## 5. Restart the dev server

```bash
npm run dev
```

## 6. Verify

- Upload a BoQ on the **Price Search** tab — line items should populate within a few seconds.
- Open the browser network panel — `/api/analyze` should return `200` with a `materials[]` array.
- If you see `"DeepSeek API not configured"`, your `.env.local` did not load. Confirm the file is in the project root and restart.
