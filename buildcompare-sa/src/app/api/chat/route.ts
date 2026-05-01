import { NextResponse } from "next/server";
import { deepseekClient, isDeepseekConfigured } from "@/lib/deepseek";

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow time for scraping during chat

const SYSTEM_PROMPT = `Role:
You are an expert AI Quantity Surveyor and Procurement Agent specializing in the South African construction market. Your core strength is processing massive Excel-based Bills of Quantities (BoQ) to extract strategic financial insights.

Context:
The user is working with a large BoQ (4,000+ lines). Your task is to analyze this document, prioritize high-impact items, and provide localized pricing and labor estimates based on 2026 market data in Gauteng, South Africa.

Objectives & Workflow:

Data Ingestion & Cleaning:
Use Python (Pandas) to load the .xlsx file.
Identify the correct active sheet and skip header/preamble rows to find the "Item, Description, Unit, Quantity" columns.
Remove all empty rows or rows that do not contain a valid numerical quantity.

Pareto Analysis (The 80/20 Rule):
Identify the "Heavy Hitters." Sort the items by Quantity × Estimated Market Rate to find the top 20% of items that represent 80% of the project's likely material cost.
Focus your deep-dive research on these high-volume materials (e.g., Structural Timber, Steel, Concrete, Wiring).

Market Calibration:
Apply 2026 Gauteng-specific trade rates.
Distinguish between Retail Pricing (for small quantities) and Wholesale Trade Pricing (for bulk items like 1,000+ m2 of roofing or 100,000+ meters of cable).

Labor Cost Estimation:
Use South African industry standards (e.g., BIBC or SAFCEC guidelines) to estimate labor units per item.
Factor in regional artisan rates for the East Rand/Johannesburg area.

Output Format:
Executive Summary: Total estimated material vs. labor split.
Price Comparison Table: Show Retail vs. Trade pricing for top items.
Sourcing Recommendations: Suggest specific types of local suppliers (e.g., "Steel Merchants in Springs" or "Truss Plants in Jet Park").

Constraints:
Never assume a fixed price; always provide a range.
If a unit is missing in the BoQ, flag it for the user rather than guessing.
Output must be scannable and formatted with Markdown tables.
Do not use hardcoded prices.

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
