import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

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

        // Send the user message with the system prompt context (soft system prompt via history or direct injection)
        // Gemini Pro doesn't strictly have system prompt in headers yet, so we prepend context or rely on the chat history initialization.
        // We'll inject the persona in the first message exchange simulation above.
        // Actually, passing instruction in the first part is often better.

        const result = await chat.sendMessage(`${systemPrompt}\n\nUser Question: ${userMessage}`);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ message: text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: "Failed to process with AI" }, { status: 500 });
    }
}
