import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = 'nodejs';

/**
 * AI Chat Route
 * - Primary: Python RAG Backend (127.0.0.1:8000)
 * - Fallback: Direct Groq SDK (for Vercel/Production)
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

        // --- PHASE 1: Try Python RAG Backend ---
        try {
            // Short timeout for backend check to avoid long hangs on Vercel
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

        // --- PHASE 2: Fallback to Direct Groq (Production/Vercel) ---
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

        // --- PHASE 3: Error / Offline ---
        return NextResponse.json({
            error: "AI Services currently unavailable. Please check your connection."
        }, { status: 503 });

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * Helper to create a streaming response for the typing effect
 */
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
