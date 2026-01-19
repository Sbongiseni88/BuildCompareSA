import { checkRateLimit, RATE_LIMIT_CONFIGS, getRateLimitHeaders } from '@/lib/rate-limit';

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Clear the rate limit store between tests by using unique identifiers
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('checkRateLimit', () => {
        it('should allow requests under the limit', () => {
            const identifier = `test-user-${Date.now()}`;

            // First request should succeed
            const result = checkRateLimit(identifier, 'default');
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.default.maxRequests - 1);
        });

        it('should block requests over the limit', () => {
            const identifier = `test-user-block-${Date.now()}`;
            const maxRequests = RATE_LIMIT_CONFIGS.default.maxRequests;

            // Make requests up to the limit
            for (let i = 0; i < maxRequests; i++) {
                const result = checkRateLimit(identifier, 'default');
                expect(result.success).toBe(true);
            }

            // Next request should be blocked
            const blockedResult = checkRateLimit(identifier, 'default');
            expect(blockedResult.success).toBe(false);
            expect(blockedResult.remaining).toBe(0);
            expect(blockedResult.retryAfterMs).toBeDefined();
        });

        it('should use stricter limits for scraping config', () => {
            const identifier = `test-scraper-${Date.now()}`;
            const maxRequests = RATE_LIMIT_CONFIGS.scraping.maxRequests;

            // Scraping config should have lower limit (10 vs 100)
            expect(maxRequests).toBe(10);

            // Make requests up to the limit
            for (let i = 0; i < maxRequests; i++) {
                checkRateLimit(identifier, 'scraping');
            }

            // Should be blocked after 10 requests
            const blockedResult = checkRateLimit(identifier, 'scraping');
            expect(blockedResult.success).toBe(false);
        });

        it('should reset after window expires', () => {
            const identifier = `test-user-reset-${Date.now()}`;
            const maxRequests = RATE_LIMIT_CONFIGS.default.maxRequests;

            // Exhaust the limit
            for (let i = 0; i <= maxRequests; i++) {
                checkRateLimit(identifier, 'default');
            }

            // Should be blocked
            expect(checkRateLimit(identifier, 'default').success).toBe(false);

            // Advance time past the window (1 minute + 1 second)
            jest.advanceTimersByTime(61000);

            // Should be allowed again
            const result = checkRateLimit(identifier, 'default');
            expect(result.success).toBe(true);
        });
    });

    describe('getRateLimitHeaders', () => {
        it('should return correct headers for successful request', () => {
            const result = {
                success: true,
                limit: 100,
                remaining: 99,
                resetTime: Date.now() + 60000,
            };

            const headers = getRateLimitHeaders(result);
            expect(headers['X-RateLimit-Limit']).toBe('100');
            expect(headers['X-RateLimit-Remaining']).toBe('99');
            expect(headers['X-RateLimit-Reset']).toBeDefined();
            expect(headers['Retry-After']).toBeUndefined();
        });

        it('should include Retry-After header when rate limited', () => {
            const result = {
                success: false,
                limit: 100,
                remaining: 0,
                resetTime: Date.now() + 30000,
                retryAfterMs: 30000,
            };

            const headers = getRateLimitHeaders(result);
            expect(headers['Retry-After']).toBe('30');
        });
    });
});
