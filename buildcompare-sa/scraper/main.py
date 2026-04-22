from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from playwright.async_api import async_playwright
import uvicorn
import asyncio
from bs4 import BeautifulSoup

app = FastAPI(title="BuildCompare SA Scraper Engine")

STORE_URLS = {
    "builders": "https://www.builders.co.za/search/?text={query}",
    "cashbuild": "https://www.cashbuild.co.za/search?q={query}",
    "leroy_merlin": "https://leroymerlin.co.za/search?q={query}"
}

async def fetch_html_playwright(url: str) -> str:
    async with async_playwright() as p:
        # Launch chromium in a memory-efficient headless mode
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
async def scrape_store(store: str = Query(...), query: str = Query(...), region: str = Query(default="gauteng")):
    """
    Scrapes the visual DOM from the requested store and returns clean text.
    """
    if store not in STORE_URLS:
        raise HTTPException(status_code=400, detail=f"Store '{store}' is not supported. Use builders, cashbuild, or leroy_merlin.")
    
    # Broaden search: Strip parentheses and special characters that break retailer search engines
    clean_q = re.sub(r'[()\[\]]', '', query)
    url = STORE_URLS[store].format(query=clean_q)
    
    try:
        # Tier 2 fallback: Heavy headless playwright rendering
        html = await fetch_html_playwright(url)
        clean_text = extract_meaningful_text(html)
        
        return {
            "success": True,
            "store": store,
            "region": region,
            "query": query,
            "raw_text": clean_text
        }
        
    except Exception as e:
        print(f"Scraper error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
