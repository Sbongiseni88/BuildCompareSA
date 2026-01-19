# Backend Development Specification (FastAPI/Python)

## 1. Overview
The backend service layer powers the intelligence of BuildCompare SA, handling web scraping, data aggregation, and AI orchestration.

## 2. Dependencies
- **WAIT FOR**: Database Schema (see `database_arch.md`).
- **WAIT FOR**: Google Gemini / OpenAI API Keys.

## 3. Tech Stack & Architecture
- **Framework**: FastAPI (Python 3.10+).
- **Concurrency**: `AsyncIO` for non-blocking I/O operations (crucial for scraping).
- **Validation**: Pydantic v2 Models.

### Code Consistency
> "All backend code must use Python Type Hinting."

## 4. Services

### Web Scraping Service (`services/scraper`)
Specialized logic for SA retailers.

**Retailer Strategies:**
1.  **Builders Warehouse**:
    - Method: API inspection / Headless Browser (Playwright).
    - Rate Limit: High sensitivity. Randomize User-Agents.
2.  **Leroy Merlin**:
    - Method: JSON-LD extraction or Sitemap parsing.
3.  **Cashbuild**:
    - Method: HTML parsing (BeautifulSoup) or PDF scraping (if only flyers available).

**Latency Optimization:**
- Use `aiohttp` or `httpx` for concurrent requests to multiple suppliers.
- Timeout aggressively (e.g., 5s). Return partial results if one supplier hangs.

### AI Orchestration (`services/llm`)
- Logic to inject RAG context into prompts.
- Handling streaming responses back to the frontend.

## 5. Offline & Caching Strategy
- **Redis Cache**: Store recent search results (e.g., "Cement pricing Gauteng") for 1 hour to reduce scraping load.
- Ensure the API returns `304 Not Modified` headers where appropriate.

---
*Created by Lead Systems Architect*
