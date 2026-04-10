import asyncio
import httpx

async def main():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json",
        "Accept-Language": "en-ZA,en;q=0.9",
    }
    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        try:
            print("Fetching Builders...")
            resp = await client.get("https://www.builders.co.za/search?q=cement")
            resp.raise_for_status()
            print("Builders HTTP status:", resp.status_code)
            with open("builders.html", "w") as f:
                f.write(resp.text)
        except Exception as e:
            print(f"Builders error: {type(e).__name__} - {e}")
            if hasattr(e, "response") and e.response:
                print("Response status:", e.response.status_code)

        try:
            print("Fetching Cashbuild...")
            resp = await client.get("https://www.cashbuild.co.za/search?q=cement")
            resp.raise_for_status()
            print("Cashbuild HTTP status:", resp.status_code)
            with open("cashbuild.html", "w") as f:
                f.write(resp.text)
        except Exception as e:
            print(f"Cashbuild error: {type(e).__name__} - {e}")
            if hasattr(e, "response") and e.response:
                print("Response status:", e.response.status_code)

if __name__ == "__main__":
    asyncio.run(main())
