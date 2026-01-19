/**
 * Rate Limiter using Sliding Window Algorithm
 * 
 * This module provides rate limiting functionality to protect API endpoints,
 * especially the scraping engine, from abuse and to avoid IP blocks from retailer sites.
 * 
 * POPIA Compliance Note: This rate limiter only stores IP addresses and request counts
 * temporarily in memory. No personal data is persisted.
 */

interface RateLimitEntry {
    count: number
    resetTime: number
}


// In-memory store (for production, consider Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key)
        }
    }
}, 60000) // Clean up every minute

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
    // General API endpoints
    default: {
        windowMs: 60 * 1000,    // 1 minute
        maxRequests: 100,       // 100 requests per minute
    },
    // Scraping endpoints - more restrictive to avoid retailer IP blocks
    scraping: {
        windowMs: 60 * 1000,    // 1 minute
        maxRequests: 10,        // 10 requests per minute (very conservative)
    },
    // Auth endpoints - prevent brute force
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,           // 5 attempts per 15 minutes
    },
} as const

export interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    resetTime: number
    retryAfterMs?: number
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param configType - Type of rate limit to apply
 * @returns RateLimitResult with status and headers info
 */
export function checkRateLimit(
    identifier: string,
    configType: keyof typeof RATE_LIMIT_CONFIGS = 'default'
): RateLimitResult {
    const config = RATE_LIMIT_CONFIGS[configType]
    const now = Date.now()
    const key = `${configType}:${identifier}`

    let entry = rateLimitStore.get(key)

    // If no entry exists or window has passed, create new entry
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
        }
        rateLimitStore.set(key, entry)

        return {
            success: true,
            limit: config.maxRequests,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
        }
    }

    // Increment count
    entry.count++

    // Check if over limit
    if (entry.count > config.maxRequests) {
        return {
            success: false,
            limit: config.maxRequests,
            remaining: 0,
            resetTime: entry.resetTime,
            retryAfterMs: entry.resetTime - now,
        }
    }

    return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    }

    if (!result.success && result.retryAfterMs) {
        headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000))
    }

    return headers
}

/**
 * Helper to get client IP from request headers
 */
export function getClientIP(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP
    }

    // Fallback for local development
    return '127.0.0.1'
}
