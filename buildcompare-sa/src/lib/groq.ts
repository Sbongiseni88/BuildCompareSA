/**
 * Groq SDK — fallback provider only.
 *
 * Per `.agent/rules/team_standards.md`, DeepSeek is the canonical AI provider.
 * Groq is retained as a graceful fallback when DeepSeek is unavailable.
 * Every call site MUST attempt DeepSeek first; only when that path fails or
 * the key is missing should it touch Groq.
 *
 * The client is constructed lazily so a missing key never crashes module load.
 */
import Groq from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY || '';

/** True when a Groq fallback key is configured. */
export const isGroqConfigured = Boolean(groqApiKey);

let _client: Groq | null = null;

export const groqClient: Groq = new Proxy({} as Groq, {
  get(_target, prop) {
    if (!_client) {
      if (!groqApiKey) {
        throw new Error(
          'Groq fallback was invoked but GROQ_API_KEY is not configured. ' +
            'DeepSeek is the canonical provider — set DEEPSEEK_API_KEY.',
        );
      }
      _client = new Groq({ apiKey: groqApiKey });
    }
    // @ts-expect-error — dynamic SDK proxy
    return _client[prop];
  },
});
