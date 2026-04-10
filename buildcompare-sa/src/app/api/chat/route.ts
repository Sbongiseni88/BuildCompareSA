import { NextResponse } from "next/server";
import { groqClient, isGroqConfigured } from "@/lib/groq";

export const runtime = 'nodejs';

const SYSTEM_PROMPT = "You are the BuildCompare SA AI Concierge. You help South African contractors and homeowners with material choices, quantities, and price trends. Use South African terminology (bricks, cement, rebar, 50kg bags, etc.). Be professional, helpful, and concise.";

/**
 * AI Chat endpoint
 * Tries the Python RAG backend first, falls back to direct Groq streaming.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userMessage = body.message;

        if (!userMessage) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

        // Try the Python RAG backend first
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

        // Backend unavailable — use REAL Groq streaming
        if (isGroqConfigured) {
            try {
                const stream = await groqClient.chat.completions.create({
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: userMessage }
                    ],
                    model: "llama-3.3-70b-versatile",
                    stream: true,
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
