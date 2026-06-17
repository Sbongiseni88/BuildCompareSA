"""
Shared scraping core.

Single source of truth for the store URLs, the browser connection (Browserbase
CDP in production, local Chromium otherwise), the search-page renderer, and the
HTML→text cleaner. Imported by both the live endpoint (main.py) and the
background pipeline (pipeline.py) so they cannot drift apart.
"""

import os
import re
import urllib.parse

from bs4 import BeautifulSoup

# Canonical 7-store matrix (5 general merchants + Voltex & ABB electrical
# specialists). URL shapes for BUCO / Build it / Voltex / ABB are best-effort
# and need verification against the live sites (see PROJECT_HANDOFF "Next Steps").
STORE_URLS = {
    "builders": "https://www.builders.co.za/search/?text={query}",
    "cashbuild": "https://www.cashbuild.co.za/search?q={query}",
    "leroy_merlin": "https://leroymerlin.co.za/search?q={query}",
    "buco": "https://www.buco.co.za/?s={query}&post_type=product",
    "buildit": "https://www.buildit.co.za/?s={query}",
    "voltex": "https://www.voltex.co.za/search?q={query}",
    "abb": "https://new.abb.com/products/search?q={query}",
}

# Aggressively delete "Select your store" modals / overlays so the underlying
# product grid is readable.
_OVERLAY_REMOVAL_JS = """() => {
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
            if (node.tagName !== 'HEADER' && node.tagName !== 'NAV') node.remove();
        }
    });
    if (document.body) document.body.style.overflow = 'auto';
}"""


def material_key(query: str) -> str:
    """
    Deterministic cache key for a search string.

    MUST stay identical to priceCacheKey() in src/lib/price-cache.ts —
    the app derives the same key to look up what this worker writes.
    Rule: lower-case, then remove every non-alphanumeric character.
    """
    return re.sub(r"[^a-z0-9]", "", (query or "").lower())


def build_search_url(store: str, query: str) -> str:
    """Build a retailer search URL, stripping characters that break their search."""
    clean_q = re.sub(r"[()\[\]]", "", query).strip()
    safe_q = urllib.parse.quote_plus(clean_q)
    return STORE_URLS[store].format(query=safe_q)


def extract_meaningful_text(html: str) -> str:
    """Strip scripts/nav/footer noise and return cleaned text (token-capped)."""
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style", "nav", "footer", "header"]):
        element.extract()
    text = soup.get_text(separator=" | ")
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    cleaned_text = "\n".join(chunk for chunk in chunks if chunk)
    return cleaned_text[:50000]


async def connect_browser(p):
    """
    Return (browser, context). Uses Browserbase CDP when BROWSERBASE_API_KEY is
    set (recommended for CI / parallel load), else a local headless Chromium.
    The caller owns the browser lifecycle and must close it.
    """
    api_key = os.environ.get("BROWSERBASE_API_KEY")
    project_id = os.environ.get("BROWSERBASE_PROJECT_ID")

    if api_key:
        cdp_url = f"wss://connect.browserbase.com?apiKey={api_key}"
        if project_id:
            cdp_url += f"&projectId={project_id}"
        print("Connecting to Browserbase CDP...")
        browser = await p.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        return browser, context

    print("BROWSERBASE_API_KEY not found. Launching local Chromium...")
    browser = await p.chromium.launch(
        headless=True,
        args=["--disable-dev-shm-usage", "--no-sandbox"],
    )
    context = await browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    )
    return browser, context


async def render_search_html(context, store: str, query: str, nav_timeout_ms: int = 30000, settle_ms: int = 2000) -> str:
    """
    Render a store's search results on a NEW page within an existing context,
    then close the page. Reusing one context/browser across many calls is the
    main speed win for the pipeline (no cold browser boot per query).
    """
    url = build_search_url(store, query)
    page = await context.new_page()
    try:
        await page.goto(url, wait_until="networkidle", timeout=nav_timeout_ms)
        await page.wait_for_timeout(settle_ms)
        await page.evaluate(_OVERLAY_REMOVAL_JS)
        return await page.content()
    finally:
        await page.close()
