import asyncio
import sys
import os

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.services.scraper import scraper_service

async def main():
    print("Testing scrapers...")
    results = await scraper_service.get_prices("cement")
    print(f"Got {len(results)} results")
    for r in results:
        print(f"Supplier: {r.supplier}, Product: {r.product}, Price: {r.price}")

if __name__ == "__main__":
    asyncio.run(main())
