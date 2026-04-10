import { NextResponse } from "next/server";
import { groqClient, isGroqConfigured } from "@/lib/groq";

export const runtime = 'nodejs';

/**
 * Enriched system prompt with SA construction domain knowledge.
 * Gives the AI real context to provide high-value replies.
 */
const SYSTEM_PROMPT = `You are the BuildCompare SA AI Concierge — an expert construction assistant for South African contractors, quantity surveyors, and homeowners.

## Your expertise:
- South African building materials (cement, bricks, sand, steel, timber, roofing, plumbing, electrical)
- SANS 10400 building regulations and NHBRC requirements
- SA retailer landscape: Builders Warehouse, Cashbuild, Leroy Merlin, Build It, Mica
- ZAR pricing context: current market ranges for common materials
- Quantity estimation for residential and commercial projects
- Load shedding considerations for construction timelines

## Pricing context (approximate 2025-2026 ranges):
- Cement (50kg bag): R95-R120
- Clay bricks (per brick): R4-R7
- Building sand (per m³): R500-R750
- Y12 Rebar (6m): R130-R190
- IBR Roof sheeting (0.47mm 3.6m): R250-R350
- Dulux/Plascon paint (5L): R400-R600

## Behavior rules:
- Always quote prices in ZAR (South African Rand)
- Use South African terminology (e.g., "bricks" not "blocks", "bakkie load" for delivery)
- Provide practical, actionable advice
- When estimating quantities, show your calculations
- If unsure, say so rather than guessing
- Keep responses concise but complete`;

/** Maximum number of history messages to send to the LLM (to stay within token limits) */
const MAX_HISTORY_MESSAGES = 20;

/**
 * AI Chat endpoint
 * Accepts: { message: string, history?: { role: string, content: string }[] }
 * Tries the Python RAG backend first, falls back to direct Groq streaming.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userMessage: string = body.message;
        const history: { role: string; content: string }[] = body.history || [];

        if (!userMessage) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

        // Try the Python RAG backend first (for context-enriched answers)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${backendUrl}/rag/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    query: userMessage,
                    n_context_results: 3
                }),
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const aiText = data.llm_response || "I apologize, but I couldn't generate a response.";
                return createFakeStreamResponse(aiText);
            }
        } catch (backendError) {
            console.warn("Python backend unreachable, attempting Groq fallback...", backendError);
        }

        // Backend unavailable — use REAL Groq streaming WITH conversation history
        if (isGroqConfigured) {
            try {
                // Build message array: system prompt + trimmed history + current message
                const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
                    { role: "system", content: SYSTEM_PROMPT },
                ];

                // Append recent history (capped to avoid exceeding token limits)
                const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
                for (const msg of trimmedHistory) {
                    if (msg.role === "user" || msg.role === "assistant") {
                        messages.push({
                            role: msg.role as "user" | "assistant",
                            content: msg.content,
                        });
                    }
                }

                // Append the current user message
                messages.push({ role: "user", content: userMessage });

                const stream = await groqClient.chat.completions.create({
                    messages,
                    model: "llama-3.3-70b-versatile",
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 2048,
                });

                // Forward real LLM token stream directly to the client
                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of stream) {
                                const content = chunk.choices[0]?.delta?.content;
                                if (content) {
                                    controller.enqueue(encoder.encode(content));
                                }
                            }
                        } catch (err) {
                            console.error("Stream error:", err);
                        } finally {
                            controller.close();
                        }
                    }
                });

                return new NextResponse(readable, {
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            } catch (groqError) {
                console.error("Groq streaming fallback failed:", groqError);
            }
        }

        // Nothing worked — tell the user
        return NextResponse.json({
            error: "AI Services currently unavailable. Please check your connection."
        }, { status: 503 });

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/** Fallback: wraps a completed text string in a simulated stream (used for RAG backend responses) */
function createFakeStreamResponse(text: string) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const chunkSize = 15;
            for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.slice(i, i + chunkSize);
                controller.enqueue(encoder.encode(chunk));
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            controller.close();
        },
    });
    return new NextResponse(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}
