from playwright.sync_api import sync_playwright

def get_apis():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("--- Builders Warehouse ---")
        page.on("response", lambda response: print(f"Response: {response.url} - {response.status}") if "api" in response.url.lower() or "graphql" in response.url.lower() or "search" in response.url.lower() else None)
        page.goto("https://www.builders.co.za/search?q=cement", wait_until="networkidle")
        
        print("--- Cashbuild ---")
        page.goto("https://www.cashbuild.co.za/search?q=cement", wait_until="networkidle")
        
        browser.close()

if __name__ == "__main__":
    get_apis()
