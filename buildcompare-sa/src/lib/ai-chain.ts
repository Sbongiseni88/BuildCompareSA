/**
 * Canonical AI provider chain (team_standards.md):
 *
 *   DeepSeek (deepseek-chat) → Groq fallback → throw.
 *
 * Never invoke Groq in front of DeepSeek; never silently swallow a provider
 * failure. Every API route that talks to an LLM should resolve through this
 * helper rather than instantiating clients directly.
 */

import { getDeepseekClient, checkDeepseekConfigured } from './deepseek';
import { groqClient, isGroqConfigured } from './groq';

export interface ChainMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChainOptions {
    temperature?: number;
    /** Request a JSON-object response from the provider (default true). */
    jsonObject?: boolean;
}

const GROQ_FALLBACK_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

/** True when at least one provider in the chain has a key configured. */
export function isAnyAIProviderConfigured(): boolean {
    return checkDeepseekConfigured() || isGroqConfigured;
}

/**
 * Run the completion through the chain and return the first non-empty
 * content string. Throws the last provider error when the whole chain is
 * exhausted — callers decide how to surface that.
 */
export async function runAIChain(
    messages: ChainMessage[],
    opts: ChainOptions = {},
): Promise<string> {
    const temperature = opts.temperature ?? 0.1;
    const response_format =
        opts.jsonObject === false ? undefined : ({ type: 'json_object' } as const);
    let lastErr: Error | null = null;

    if (checkDeepseekConfigured()) {
        try {
            const res = await getDeepseekClient().chat.completions.create({
                messages,
                model: 'deepseek-chat',
                temperature,
                response_format,
            });
            const content = res.choices[0]?.message?.content;
            if (content) return content;
            lastErr = new Error('DeepSeek returned empty content');
            console.warn('DeepSeek returned empty content — falling back to Groq.');
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            console.warn('DeepSeek failed, falling back to Groq:', lastErr.message);
        }
    }

    if (isGroqConfigured) {
        for (const model of GROQ_FALLBACK_MODELS) {
            try {
                const res = await groqClient.chat.completions.create({
                    messages,
                    model,
                    temperature,
                    response_format,
                });
                const content = res.choices[0]?.message?.content;
                if (content) return content;
                lastErr = new Error(`Groq ${model} returned empty content`);
            } catch (err) {
                lastErr = err instanceof Error ? err : new Error(String(err));
                console.warn(`Groq ${model} failed:`, lastErr.message);
            }
        }
    }

    throw lastErr ?? new Error('No AI provider configured (DeepSeek canonical, Groq fallback)');
}
