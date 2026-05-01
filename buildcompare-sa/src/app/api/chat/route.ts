import { NextResponse } from "next/server";
import { deepseekClient, isDeepseekConfigured } from "@/lib/deepseek";

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow time for scraping during chat

const SYSTEM_PROMPT = `Role:
You are a Senior Quantity Surveyor & Data Engineer. Your goal is to analyze construction BoQs with 4,000+ lines for projects like the SAPS Training College. You prioritize structured data processing over visual analysis to avoid API configuration errors.

Operational Mandates:

Bypass Vision Processing:
Strict Rule: Do not attempt to "look" at the document or treat it as an image.
Execution: Immediately use the Python environment to load the file using pd.read_excel('BoQ.xlsx'). This is mandatory to avoid the "API keys not configured" error.

Smart Ingestion (Springs/Gauteng Context):
Code Strategy: Skip the preamble rows (first ~2 rows) to find the column headers (ITEM, DESCRIPTION, UNIT, QUANTITY, RATE, AMOUNT).
Data Cleaning: Filter out all rows that do not have a numerical value in the Quantity column to isolate active work items.

High-Impact Analysis (The 80/20 Rule):
Identify "Heavy Hitter" items—specifically large volume materials like 2.5mm² wiring, structural timber, and roofing sheets.
Calculate the total project volume using Python to ensure mathematical integrity.

Localized 2026 Pricing Logic:
Apply trade-level rates for the Gauteng/East Rand region for 2026.
For the 4,713 m2 of roofing and 181,768m of wiring, use Bulk Trade Prices from industrial suppliers in Springs or Jet Park rather than general retail.

Error Handling & Traceability:
If the Python script encounters a formatting error, log the specific Row Number and Sheet Name ('SAPS-APRL-2025') so the user can fix the source file.
Always output a summary of "Risk Flags" (e.g., missing rates or unusual quantity spikes).

Output Structure:
Data Status: "Excel file successfully parsed via Python (Vision API bypassed)."
Strategic Price Comparison Table: Retail vs. Trade rates for top items.
Labor Estimate: Local Gauteng artisan rates for the specific trades found (Roofing, Electrical, Concrete).

## Live Pricing Capability
You have access to a tool called \`search_live_prices\`.
If you need current retail prices to formulate your analysis, ALWAYS use the \`search_live_prices\` tool.
You can check stores like "builders", "cashbuild", or "leroy_merlin".`;

const MAX_HISTORY_MESSAGES = 10;

const chatTools = [
    {
        type: "function" as const,
        function: {
            name: "search_live_prices",
            description: "Fetches real-time pricing and stock information for a construction material from South African stores by scraping their live websites.",
            parameters: {
                type: "object",
                properties: {
                    store: {
                        type: "string",
                        enum: ["builders", "cashbuild", "leroy_merlin"],
                        description: "The hardware store to search."
                    },
                    query: {
                        type: "string",
                        description: "The specific product to search for, e.g., '50kg ppc cement' or 'timber door'."
                    }
                },
                required: ["store", "query"]
            }
        }
    }
];

export async function POST(req: Request) {
    if (!isDeepseekConfigured) {
        return NextResponse.json({ error: "DeepSeek API key missing. Please configure it." }, { status: 500 });
    }

    try {
        const body = await req.json();
        const userMessage: string = body.message;
        const history: { role: "system" | "user" | "assistant" | "tool"; content: string; name?: string; tool_call_id?: string }[] = body.history || [];

        if (!userMessage) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Build messages payload
        const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
        
        // Append history 
        const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
        messages.push(...trimmedHistory);
        messages.push({ role: "user", content: userMessage });

        // First pass: Ask DeepSeek if it wants to use a tool
        console.log("Chat route: Requesting DeepSeek tool decision...");
        const response1 = await deepseekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: messages,
            tools: chatTools,
            temperature: 0.2, // low temp for accurate tool usage
        });

        const responseMessage = response1.choices[0]?.message;

        if (!responseMessage) {
            throw new Error("Empty response from DeepSeek");
        }

        // Check if a tool call was requested
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`Chat route: DeepSeek requested ${responseMessage.tool_calls.length} tool calls.`);
            
            // Append the assistant's tool call message
            messages.push(responseMessage);

            // Execute all requested tool calls in parallel
            for (const toolCall of responseMessage.tool_calls) {
                const tc: any = toolCall;
                if (tc.type === "function" && tc.function.name === "search_live_prices") {
                    const args = JSON.parse(tc.function.arguments);
                    console.log(`Chat route: Executing search_live_prices for ${args.store} - ${args.query}`);
                    
                    try {
                        const scraperUrl = process.env.LOCAL_SCRAPER_URL || 'http://127.0.0.1:8001';
                        
                        // Add timeout to prevent chat from hanging if scraper is deadlocked
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 15000);
                        
                        const pyRes = await fetch(
                            `${scraperUrl}/scrape?store=${encodeURIComponent(args.store)}&query=${encodeURIComponent(args.query)}`,
                            { signal: controller.signal }
                        );
                        clearTimeout(timeout);
                        
                        if (!pyRes.ok) throw new Error("Scraper returned an error");
                        
                        const data = await pyRes.json();
                        const rawText = data.raw_text;
                        
                        let toolResponseContent = "";
                        if (!rawText || rawText.length < 20) {
                            toolResponseContent = "No results were found for this query on the store's website.";
                        } else {
                            // Trim to fit inside context window safely
                            toolResponseContent = rawText.slice(0, 20000); 
                        }

                        // Append tool result
                        messages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            name: tc.function.name,
                            content: `Raw scraped text from store:\n\n${toolResponseContent}`
                        });
                        console.log(`Chat route: Tool ${toolCall.id} completed.`);
                        
                    } catch (err: any) {
                        console.error('Chat route: Tool execution failed', err);
                        messages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            name: tc.function.name,
                            content: "Error: The scraping service failed to retrieve results from this store right now."
                        });
                    }
                }
            }

            // Second pass: Send tool results back to DeepSeek to generate the final streaming response
            console.log("Chat route: Streaming final DeepSeek response with tool data...");
            const stream = await deepseekClient.chat.completions.create({
                model: "deepseek-chat",
                messages: messages,
                stream: true,
                temperature: 0.6,
            });

            return createStreamResponse(stream);

        } else {
            // No tool used, just standard response. But we didn't request a stream initially to catch tool calls,
            // so we stream it manually if we have normal text. Or we can just rebuild the stream.
            // Since we already have the text response, let's just fake stream it to keep the UI happy.
            return createFakeStreamResponse(responseMessage.content || "I couldn't generate a response.");
        }

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function createStreamResponse(stream: AsyncIterable<any>) {
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
}

function createFakeStreamResponse(text: string) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const chunkSize = 20;
            for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.slice(i, i + chunkSize);
                controller.enqueue(encoder.encode(chunk));
                await new Promise(resolve => setTimeout(resolve, 10)); // tiny delay
            }
            controller.close();
        },
    });
    return new NextResponse(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}
