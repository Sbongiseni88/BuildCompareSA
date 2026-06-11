"""
Background price pipeline.

Walks the material catalogue (catalogue.json) across all 5 stores, scrapes each
with a SHARED browser (one boot, many pages — the big speed win over the live
endpoint), extracts the best-matching price per store via DeepSeek, and UPSERTs
real prices into the Supabase `price_cache` table.

Run on a schedule (GitHub Actions cron). The app then reads price_cache
cache-first, so user searches get real per-store prices instantly instead of
scraping live or fabricating estimates.

Usage:
    python -m scraper.pipeline            # scrape + upsert to Supabase
    python -m scraper.pipeline --dry-run  # scrape + print, no DB write (local test)
    python -m scraper.pipeline --limit 5  # only the first 5 catalogue items

Required env (live run):
    DEEPSEEK_API_KEY                 canonical price extractor
    NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
    SUPABASE_SERVICE_ROLE_KEY        write key (bypasses RLS)
Optional:
    BROWSERBASE_API_KEY / BROWSERBASE_PROJECT_ID   cloud Chromium
    PIPELINE_CONCURRENCY             max simultaneous scrapes (default 4)
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

import httpx
from playwright.async_api import async_playwright

from scraper.scrape_core import (
    STORE_URLS,
    connect_browser,
    render_search_html,
    extract_meaningful_text,
    material_key,
)

CATALOGUE_PATH = Path(__file__).parent / "catalogue.json"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"


def _env(*names: str) -> str | None:
    for n in names:
        v = os.environ.get(n)
        if v:
            return v
    return None


def load_catalogue(limit: int | None = None) -> list[dict]:
    data = json.loads(CATALOGUE_PATH.read_text())
    materials = data.get("materials", [])
    return materials[:limit] if limit else materials


async def extract_price(client: httpx.AsyncClient, api_key: str, store: str, query: str, text: str) -> dict | None:
    """
    Ask DeepSeek for the single best-matching product price in the scraped text.
    Returns {price, in_stock, product_name} or None when nothing matches.
    Per-store extraction keeps each column independent (no cross-store mirroring).
    """
    if not text or len(text) < 20:
        return None

    prompt = (
        f'You are a South African retail pricing extractor for the store "{store}".\n'
        f'The shopper searched for: "{query}".\n'
        "From the raw page text below, return the SINGLE best-matching product as JSON:\n"
        '{ "price": 123.45, "in_stock": true, "product_name": "exact name from page" }\n'
        "Rules:\n"
        "- price is a plain ZAR float (strip R, spaces, thousands separators). No currency symbols.\n"
        "- Only return a product that genuinely matches the search. If nothing matches, return "
        '{ "price": null }.\n'
        "- Never invent a price. Use only numbers present in the text.\n\n"
        f"--- PAGE TEXT ---\n{text[:15000]}\n--- END ---"
    )
    try:
        resp = await client.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
            timeout=30.0,
        )
        if resp.status_code != 200:
            print(f"  [{store}] DeepSeek HTTP {resp.status_code}: {resp.text[:160]}")
            return None
        content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content.replace("```json", "").replace("```", "").strip())
        price = parsed.get("price")
        if not isinstance(price, (int, float)) or price <= 0:
            return None
        return {
            "price": round(float(price), 2),
            "in_stock": bool(parsed.get("in_stock", True)),
            "product_name": str(parsed.get("product_name", ""))[:300] or None,
        }
    except Exception as e:
        print(f"  [{store}] price extraction error: {type(e).__name__}: {e}")
        return None


async def scrape_one(sem, context, client, api_key, store, item) -> dict | None:
    """Scrape + extract one (store, material). Returns an upsert row or None (N/A)."""
    query = item["query"]
    async with sem:
        try:
            html = await asyncio.wait_for(render_search_html(context, store, query), timeout=35.0)
        except Exception as e:
            print(f"  [{store}] scrape failed for '{query}': {type(e).__name__}: {e}")
            return None
        text = extract_meaningful_text(html)
        result = await extract_price(client, api_key, store, query, text)

    if not result:
        # Anti-bias telemetry — a burst of N/A for one store is the bug signature.
        print(json.dumps({"event": "pipeline.store_na", "store": store, "query": query}))
        return None

    return {
        "store": store,
        "material_key": material_key(query),
        "query_text": query,
        "product_name": result["product_name"],
        "price": result["price"],
        "in_stock": result["in_stock"],
    }


async def run(dry_run: bool, limit: int | None) -> int:
    api_key = _env("DEEPSEEK_API_KEY", "deepseek_api")
    if not api_key:
        print("FATAL: DEEPSEEK_API_KEY is not set.")
        return 1

    supabase_url = _env("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")
    supabase = None
    if not dry_run:
        if not supabase_url or not service_key:
            print("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (or use --dry-run).")
            return 1
        from supabase import create_client  # imported lazily so --dry-run needs no dep
        supabase = create_client(supabase_url, service_key)

    catalogue = load_catalogue(limit)
    concurrency = int(os.environ.get("PIPELINE_CONCURRENCY", "4"))
    sem = asyncio.Semaphore(concurrency)

    print(f"Pipeline start: {len(catalogue)} materials x {len(STORE_URLS)} stores, concurrency={concurrency}, dry_run={dry_run}")

    rows: list[dict] = []
    async with async_playwright() as p:
        browser, context = await connect_browser(p)
        try:
            async with httpx.AsyncClient() as client:
                tasks = [
                    scrape_one(sem, context, client, api_key, store, item)
                    for item in catalogue
                    for store in STORE_URLS
                ]
                for coro in asyncio.as_completed(tasks):
                    row = await coro
                    if row:
                        rows.append(row)
        finally:
            await browser.close()

    print(f"Pipeline scraped {len(rows)} real prices across {len(catalogue)} materials.")

    if dry_run:
        for r in rows:
            print(f"  {r['store']:<12} {r['price']:>10.2f}  {r['query_text']}")
        return 0

    if rows and supabase is not None:
        # Single upsert keyed on (store, material_key) keeps one latest row each.
        supabase.table("price_cache").upsert(rows, on_conflict="store,material_key").execute()
        print(f"Upserted {len(rows)} rows into price_cache.")
    else:
        print("No rows to upsert.")
    return 0


def main():
    parser = argparse.ArgumentParser(description="BuildCompare SA price pipeline")
    parser.add_argument("--dry-run", action="store_true", help="scrape and print, do not write to Supabase")
    parser.add_argument("--limit", type=int, default=None, help="only process the first N catalogue items")
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.dry_run, args.limit)))


if __name__ == "__main__":
    main()
