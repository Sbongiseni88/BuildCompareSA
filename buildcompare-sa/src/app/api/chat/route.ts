import { NextResponse } from "next/server";

export const runtime = 'nodejs'; // Use Node.js runtime for fetch

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userMessage = body.message;

        if (!userMessage) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Call the Python Backend (Groq RAG Service)
        // Make sure your Python backend is running on port 8000
        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

        try {
            const response = await fetch(`${backendUrl}/rag/query`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: userMessage,
                    n_context_results: 3
                }),
            });

            if (!response.ok) {
                console.error(`Backend error: ${response.statusText}`);
                throw new Error("Failed to reach AI backend");
            }

            const data = await response.json();
            const aiText = data.llm_response || "I apologize, but I couldn't generate a response.";

            // Stream the text back to the client to simulate typing effect
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    const chunkSize = 10; // Characters per chunk
                    for (let i = 0; i < aiText.length; i += chunkSize) {
                        const chunk = aiText.slice(i, i + chunkSize);
                        controller.enqueue(encoder.encode(chunk));
                        await new Promise(resolve => setTimeout(resolve, 15)); // Tiny delay for effect
                    }
                    controller.close();
                },
            });

            return new NextResponse(stream);

        } catch (backendError) {
            console.error("Connection to Python backend failed:", backendError);
            // Fallback for when backend is offline
            return NextResponse.json({
                error: "AI Backend Offline. Please run 'python backend/main.py'"
            }, { status: 503 });
        }

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
