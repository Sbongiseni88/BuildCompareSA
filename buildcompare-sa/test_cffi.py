import asyncio
from curl_cffi import requests

async def main():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }
    async with requests.AsyncSession(impersonate="chrome124", headers=headers) as s:
        print("Fetching Leroy Merlin...")
        r = await s.get("https://leroymerlin.co.za/catalogsearch/result/?q=cement")
        print("Leroy status:", r.status_code)
        
        print("Fetching Cashbuild...")
        r = await s.get("https://www.cashbuild.co.za/search?q=cement")
        print("Cashbuild status:", r.status_code)
        
        print("Fetching Builders...")
        r = await s.get("https://www.builders.co.za/search?q=cement")
        print("Builders status:", r.status_code)

if __name__ == "__main__":
    asyncio.run(main())
