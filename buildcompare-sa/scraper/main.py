from fastapi import FastAPI, HTTPException, Query
from playwright.async_api import async_playwright
import uvicorn
import asyncio
from scraper.boq_parser import router as boq_router
from scraper.scrape_core import (
    STORE_URLS,
    connect_browser,
    render_search_html,
    extract_meaningful_text,
)

app = FastAPI(title="BuildCompare SA Scraper Engine")
app.include_router(boq_router)


async def fetch_store_html(store: str, query: str) -> str:
    """One-shot render for the live endpoint: own browser, render, close."""
    async with async_playwright() as p:
        browser, context = await connect_browser(p)
        try:
            return await render_search_html(context, store, query)
        finally:
            await browser.close()


@app.get("/uptime")
async def uptime():
    return {"status": "ok", "service": "scraper-engine"}


@app.get("/scrape")
async def scrape_store(store: str = Query(...), query: str = Query(...)):
    """Scrapes the visual DOM from the requested store and returns clean text."""
    if store not in STORE_URLS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Store '{store}' is not supported. Use one of: "
                + ", ".join(sorted(STORE_URLS.keys()))
            ),
        )

    try:
        html = await asyncio.wait_for(fetch_store_html(store, query), timeout=25.0)
        clean_text = extract_meaningful_text(html)
        return {"success": True, "store": store, "query": query, "raw_text": clean_text}
    except Exception as e:
        print(f"Scraper error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
