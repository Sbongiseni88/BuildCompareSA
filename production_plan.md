Modernise BuildCompare SA: Live Data Pipeline & DeepSeek Integration
This is the comprehensive, phase-by-phase master plan to shift BuildCompare SA from a prototype (using mock data) to a production-grade live-scraping engine.

Architectural Manifesto
Orchestrator Pattern: Next.js is the "brain". It holds the DeepSeek API key, orchestrates data flow, handles auth, and caches results.
Dumb Scraper Pattern: The Python service is purely a mechanical scraper. It takes a search URL, extracts raw HTML/JSON, and returns it to Next.js. It requires no API keys and is totally stateless.
Data Pipeline Flow: User searches for "Cement" -> Next.js checks Cache -> If empty, Next.js calls Python Scraper -> Python Scraper fetches raw HTML from Builders/Cashbuild -> Returns raw HTML to Next.js -> Next.js passes raw HTML to DeepSeek-V3 -> DeepSeek strictly outputs clean json_object -> Next.js saves to Cache & shows user.
The Master Plan
PHASE 1: The DeepSeek Orchestrator (Next.js)
Goal: Wire up DeepSeek-V3 in the backend and ensure JSON structured outputs are flawless. We will test this by replacing the Groq models first.

Install openai package.
Add DEEPSEEK_API_KEY to .env (Completed).
Create src/lib/deepseek.ts client.
Refactor src/app/api/analyze/route.ts and src/app/api/estimate/route.ts:
Replace Llama calls with deepseek-chat.
Enforce response_format: { type: 'json_object' }.
Explicitly instruct DeepSeek to return correctly formatted ZAR floats (e.g. 100.00 not R 100,00).
PHASE 2: The Mono-Repo Scraper Service (Python)
Goal: Build the extraction engine inside a new /scraper subfolder.

Initialize Python environment inside buildcompare-sa/scraper.
Install fastapi, uvicorn, playwright.
Build main.py with a simple endpoint: GET /scrape?store=builders&query=cement&region=gauteng.
Implement the API Discovery Method: Try to fetch via raw requests (e.g. hitting Mirakl APIs or Solr endpoints) because it's fast.
Implement the Playwright Fallback Method: If direct API fails (CloudFlare/Auth), launch Playwright, select the regional store (Crucial for Cashbuild/Builders regional pricing), and return the raw HTML string of the product grid.
Add an /uptime endpoint so AWS/cron jobs can ping it to prevent Cold Starts.
PHASE 3: The Caching & Pipeline Glue
Goal: Connect Next.js to the Python scraper and prevent API cost explosions.

Build a new internal route in Next.js: src/app/api/prices/live/route.ts.
Implement caching logic (For MVP, we'll use a simple in-memory cache or Supabase table if you prefer). If a search for cement-gauteng is < 2 hours old, return cache.
If not cached, ping Python GET /scrape, pass the massive raw HTML to DeepSeek, and parse the resulting JSON into our PriceQuote format.
Stress Test: Verify the Next.js API gracefully handles concurrent python/deepseek limits.
PHASE 4: Deprecation & The Live Agent Chatbot
Goal: Rip out the old mock data and empower the chatbot.

Delete generateMockQuotes entirely.
Wire PriceSearchHub.tsx to hit our new /api/prices/live endpoint.
Upgrade the AI Chatbot src/app/api/chat/route.ts using DeepSeek's Tool Use capability.
Teach the chatbot to autonomously generate a search_live_prices tool call when a user asks "Who has the cheapest cement in Joburg?", wait for the response, and explain the best option in plain English.
TIP

