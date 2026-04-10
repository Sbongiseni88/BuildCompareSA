/**
 * Shared Groq SDK singleton.
 *
 * Both /api/chat and /api/analyze import from here so we:
 *  - reuse one client instance (connection pooling)
 *  - have a single source of truth for the API key
 *  - avoid recreating the client on every request
 */
import Groq from "groq-sdk";

const groqApiKey = process.env.GROQ_API_KEY || "";

if (!groqApiKey) {
    console.warn("⚠️ GROQ_API_KEY is not set. AI features will be unavailable.");
}

export const groqClient = new Groq({ apiKey: groqApiKey });

/** True when a valid API key is configured */
export const isGroqConfigured = Boolean(groqApiKey);
