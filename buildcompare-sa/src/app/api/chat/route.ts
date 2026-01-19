import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders, getClientIP } from "@/lib/rate-limit";

const apiKey = process.env.GEMINI_API_KEY;

const systemPrompt = `
You are BuildCompare Concierge, an expert South African construction assistant.
Your goal is to help users with Bill of Quantities (BoQ), material estimation, and local building standards (SANS 10400, NHBRC).

Key Traits:
- Friendly South African persona ("Sawubona!", "Howzit").
- Expert knowledge of South African brands (PPC, AfriSam, Corobrik, Cashbuild, Builders Warehouse).
- Emphasis on compliance (NHBRC, SABS standards).
- Practical advice for home builders.

When asked about cement:
- Explain specific grades (32.5 vs 42.5) for different uses (plaster vs structural).
- Mention local brands.

When asked about house planning (e.g., "3 bedroom house"):
- Break down into stages: Legal, Professional Team, Structural, Internal Services, Finishes.
- Mention budget estimates in ZAR (R8,000 - R12,000 per sqm).

Always format your responses with nice Markdown (headers, bullet points) for readability.
`;

export async function POST(req: Request) {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, 'default');

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
                status: 429,
                headers: getRateLimitHeaders(rateLimitResult)
            }
        );
    }

    if (!apiKey) {
        return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }


    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const data = await req.json();
        const userMessage = data.message;

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "Hello, who are you?" }],
                },
                {
                    role: "model",
                    parts: [{ text: "Sawubona! I'm your BuildCompare Concierge. Need help with a BoQ or estimating material for your next project?" }],
                },
            ],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessageStream(`${systemPrompt}\n\nUser Question: ${userMessage}`);

        // Create a readable stream from the Gemini stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            },
        });

        return new NextResponse(stream);
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: "Failed to process with AI" }, { status: 500 });
    }
}
