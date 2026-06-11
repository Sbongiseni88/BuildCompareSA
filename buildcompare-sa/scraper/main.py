import os
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from playwright.async_api import async_playwright
import uvicorn
import asyncio
from bs4 import BeautifulSoup
import re
import urllib.parse
from scraper.boq_parser import router as boq_router

app = FastAPI(title="BuildCompare SA Scraper Engine")
app.include_router(boq_router)

STORE_URLS = {
    "builders": "https://www.builders.co.za/search/?text={query}",
    "cashbuild": "https://www.cashbuild.co.za/search?q={query}",
    "leroy_merlin": "https://leroymerlin.co.za/search?q={query}",
    # Added in the tender-pivot refactor — symmetric 5-store matrix.
    # URL shapes are best-effort and may need adjustment after first real run.
    "buco": "https://www.buco.co.za/?s={query}&post_type=product",
    "buildit": "https://www.buildit.co.za/?s={query}",
}

async def fetch_html_playwright(url: str) -> str:
    browserbase_api_key = os.environ.get("BROWSERBASE_API_KEY")
    browserbase_project_id = os.environ.get("BROWSERBASE_PROJECT_ID")
    
    async with async_playwright() as p:
        if browserbase_api_key:
            # Connect to Browserbase cloud browser over CDP
            cdp_url = f"wss://connect.browserbase.com?apiKey={browserbase_api_key}"
            if browserbase_project_id:
                cdp_url += f"&projectId={browserbase_project_id}"
            
            print("Connecting to Browserbase CDP...")
            browser = await p.chromium.connect_over_cdp(cdp_url)
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else await context.new_page()
        else:
            # Launch chromium in a memory-efficient headless mode locally
            print("BROWSERBASE_API_KEY not found. Launching local Chromium...")
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-dev-shm-usage", "--no-sandbox"]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

        try:
            # Wait until there are no more than 2 network connections for at least 500 ms (Networkidle)
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Additional small wait to allow JS frameworks (React/Angular) to render final DOM
            await page.wait_for_timeout(2000) 
            
            # ── SA "Select Store" Hack ──
            # Builders and Cashbuild often throw a "Select Store" modal that blurs the background.
            # We aggressively delete these overlay nodes so BeautifulSoup can read the underlying products.
            await page.evaluate('''() => {
                const overlayClasses = [
                    'modal', 'modal-backdrop', 'overlay', 'popup', 'store-selector',
                    'cx-store-finder', 'cdk-overlay-container'
                ];
                document.querySelectorAll('*').forEach(node => {
                    if (node.className && typeof node.className === 'string') {
                        if (overlayClasses.some(c => node.className.toLowerCase().includes(c))) {
                            node.remove();
                        }
                    }
                    if (node.style && (node.style.zIndex > 100 || node.style.position === 'fixed')) {
                        // Sometimes the fixed header is fine, but massive z-index is usually a modal
                        if(node.tagName !== 'HEADER' && node.tagName !== 'NAV') node.remove();
                    }
                });
                if (document.body) {
                    document.body.style.overflow = 'auto'; // Re-enable scrolling if modal disabled it
                }
            }''')

            # Fetch the fully rendered HTML
            html = await page.content()
            return html
        finally:
            await browser.close()

def extract_meaningful_text(html: str) -> str:
    """
    Strips out noise (scripts, styles, navbars, footers) and returns clean text.
    This saves massive amounts of tokens when passing to DeepSeek.
    """
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer", "header"]):
        element.extract()
        
    text = soup.get_text(separator=' | ')
    
    # Clean up whitespace
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    cleaned_text = '\n'.join(chunk for chunk in chunks if chunk)
    
    # Cap token length realistically for passing down to Next.js -> DeepSeek
    return cleaned_text[:50000]

@app.get("/uptime")
async def uptime():
    return {"status": "ok", "service": "scraper-engine"}

@app.get("/scrape")
async def scrape_store(store: str = Query(...), query: str = Query(...)):
    """
    Scrapes the visual DOM from the requested store and returns clean text.
    """
    if store not in STORE_URLS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Store '{store}' is not supported. Use one of: "
                + ", ".join(sorted(STORE_URLS.keys()))
            ),
        )
    
    # Broaden search: Strip parentheses and special characters that break retailer search engines
    clean_q = re.sub(r'[()\[\]]', '', query).strip()
    safe_q = urllib.parse.quote_plus(clean_q)
    url = STORE_URLS[store].format(query=safe_q)
    
    try:
        # Tier 2 fallback: Heavy headless playwright rendering with absolute timeout
        html = await asyncio.wait_for(fetch_html_playwright(url), timeout=25.0)
        clean_text = extract_meaningful_text(html)
        
        return {
            "success": True,
            "store": store,
            "query": query,
            "raw_text": clean_text
        }
        
    except Exception as e:
        print(f"Scraper error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
