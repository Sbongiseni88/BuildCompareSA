import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = 'nodejs';

/**
 * AI Chat endpoint
 * Tries the Python RAG backend first, falls back to direct Groq calls.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userMessage = body.message;

        if (!userMessage) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
        const groqApiKey = process.env.GROQ_API_KEY;

        // Try the Python RAG backend first
        try {
            // Quick timeout so we don't hang forever if the backend is down
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
                return createStreamResponse(aiText);
            }
        } catch (backendError) {
            console.warn("Python backend unreachable, attempting Groq fallback...", backendError);
        }

        // Backend unavailable — go straight to Groq
        if (groqApiKey) {
            try {
                const groq = new Groq({ apiKey: groqApiKey });
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are the BuildCompare SA AI Concierge. You help South African contractors and homeowners with material choices, quantities, and price trends. Use South African terminology (bricks, cement, rebar, 50kg bags, etc.). Be professional, helpful, and concise."
                        },
                        { role: "user", content: userMessage }
                    ],
                    model: "llama-3.3-70b-versatile",
                });

                const aiText = completion.choices[0]?.message?.content || "I'm having trouble connecting to my brain right now.";
                return createStreamResponse(aiText);
            } catch (groqError) {
                console.error("Groq fallback failed:", groqError);
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

/** Wraps a completed text string in a streaming response for the typing effect */
function createStreamResponse(text: string) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const chunkSize = 15; // Faster for production
            for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.slice(i, i + chunkSize);
                controller.enqueue(encoder.encode(chunk));
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            controller.close();
        },
    });
    return new NextResponse(stream);
}
