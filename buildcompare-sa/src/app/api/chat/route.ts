import { NextResponse } from "next/server";
import { getDeepseekClient, checkDeepseekConfigured } from "@/lib/deepseek";

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow time for scraping during chat

const SYSTEM_PROMPT = `Role:
You are a helpful, professional Senior Quantity Surveyor & Data Engineer based in Gauteng, South Africa. You assist users with construction BoQs, material pricing, and SANS 10400 regulations.
Your tone is practical, polite, and uses subtle South African colloquialisms (e.g., "Howzit", "Let's have a look", "Cheers").

Operational Mandates:
1. "Construction-First" Tone: Be direct but helpful. You are talking to local contractors and builders.
2. Graceful Fallbacks: If a scraping tool fails or is unavailable, NEVER output raw XML, DSML, or tool call syntax to the user. Do not say "The scraping service failed." Instead, say something like: "I'm having a bit of trouble reaching the live price lists at the moment, let me try another way..." and provide a realistic 2026 Gauteng market average estimate for the requested item (e.g., Y12 High Tensile Rebar ~R120/length, OPC Cement ~R95/bag).
3. Clean Output: NEVER output internal DeepSeek engine tags (like <｜tool call｜> or DSML). Speak naturally to the human user.
4. Smart Ingestion & Local Pricing: Prioritize structured data and localized 2026 Gauteng/East Rand trade rates. If analyzing BoQs, identify Heavy Hitters and summarize Risk Flags.

## Live Pricing Capability
You have access to a tool called \`search_live_prices\`.
If you need current retail prices to formulate your analysis, ALWAYS use the \`search_live_prices\` tool for stores like "builders", "cashbuild", or "leroy_merlin".
If the tool returns an error, use the graceful fallback described above.`;

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
    if (!checkDeepseekConfigured()) {
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
        const client = getDeepseekClient();
        const response1 = await client.chat.completions.create({
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
                            content: "Error: The scraping service failed to retrieve results from this store right now. Please provide a realistic 2026 Gauteng market average estimate instead, using a helpful South African persona."
                        });
                    }
                }
            }

            // Second pass: Send tool results back to DeepSeek to generate the final streaming response
            console.log("Chat route: Streaming final DeepSeek response with tool data...");
            const stream = await client.chat.completions.create({
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
