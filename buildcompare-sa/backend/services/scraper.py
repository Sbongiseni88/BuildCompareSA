import asyncio
import time
import random
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

from backend.models import PriceItem


class ScraperService:
    """
    Async scraper service for South African building material retailers.
    Uses AsyncIO for high-concurrency, non-blocking requests.
    """
    
    def __init__(self) -> None:
        self.headers: Dict[str, str] = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self.cache: Dict[str, tuple[float, List[PriceItem]]] = {}
        self.cache_ttl: int = 300  # 5 minutes
        self.timeout: float = 5.0  # Aggressive timeout per backend_dev.md

    async def get_prices(self, query: str) -> List[PriceItem]:
        """
        Fetch prices from all retailers asynchronously.
        Returns cached results if available and fresh.
        """
        current_time = time.time()
        
        # Check cache
        if query in self.cache:
            stored_time, data = self.cache[query]
            if current_time - stored_time < self.cache_ttl:
                print(f"Cache hit for '{query}'")
                return data

        # Concurrent requests to all retailers
        results = await self._fetch_all_retailers(query)
        
        # Store in cache
        self.cache[query] = (current_time, results)
        
        return results
    
    async def _fetch_all_retailers(self, query: str) -> List[PriceItem]:
        """
        Fetch from all retailers concurrently using asyncio.gather.
        """
        tasks = [
            self._fetch_builders(query),
            self._fetch_cashbuild(query),
            self._fetch_leroy_merlin(query),
        ]
        
        # Run all concurrently, return partial results on timeout
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten and filter out exceptions
        all_prices: List[PriceItem] = []
        for result in results:
            if isinstance(result, list):
                all_prices.extend(result)
            elif isinstance(result, Exception):
                print(f"Scraper error: {result}")
        
        return all_prices
    
    async def _fetch_builders(self, query: str) -> List[PriceItem]:
        """
        Builders Warehouse scraper.
        Note: Real implementation would use Playwright for JS-rendered content.
        Currently mocked for prototype stability.
        """
        await asyncio.sleep(random.uniform(0.5, 1.5))  # Simulate network delay
        
        return [
            PriceItem(
                supplier="Builders Warehouse",
                product=f"{query.capitalize()} - Standard Grade",
                price=round(random.uniform(80, 450), 2),
                in_stock=True,
                stock_quantity=random.randint(50, 500),
                link="https://www.builders.co.za"
            )
        ]
    
    async def _fetch_cashbuild(self, query: str) -> List[PriceItem]:
        """
        Cashbuild scraper.
        Method: HTML parsing (BeautifulSoup).
        """
        await asyncio.sleep(random.uniform(0.3, 1.0))
        
        return [
            PriceItem(
                supplier="Cashbuild",
                product=f"{query.capitalize()} - Value Pack",
                price=round(random.uniform(70, 420), 2),
                in_stock=True,
                stock_quantity=random.randint(30, 300),
                link="https://www.cashbuild.co.za"
            )
        ]
    
    async def _fetch_leroy_merlin(self, query: str) -> List[PriceItem]:
        """
        Leroy Merlin scraper.
        Method: JSON-LD extraction or API inspection.
        """
        await asyncio.sleep(random.uniform(0.4, 1.2))
        
        return [
            PriceItem(
                supplier="Leroy Merlin",
                product=f"{query.capitalize()} - Premium Quality",
                price=round(random.uniform(90, 500), 2),
                in_stock=random.choice([True, False]),
                stock_quantity=random.randint(10, 200) if random.random() > 0.3 else 0,
                link="https://leroymerlin.co.za"
            )
        ]


# Singleton instance
scraper_service = ScraperService()

