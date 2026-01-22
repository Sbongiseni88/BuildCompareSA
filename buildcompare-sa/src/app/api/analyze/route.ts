import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { Material } from '@/types';
import { analyzeUploadedImage as mockAnalyze } from '@/data/mockData';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/rate-limit';

// Initialize Groq
// NOTE: user needs to add GROQ_API_KEY to .env.local
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || ''
});

export async function POST(req: NextRequest) {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, 'scraping');

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: "Rate limit exceeded. Please wait before trying again." },
            {
                status: 429,
                headers: getRateLimitHeaders(rateLimitResult)
            }
        );
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;

        if (!process.env.GROQ_API_KEY) {
            console.warn('⚠️ No GROQ_API_KEY found, using mock data.');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return NextResponse.json({
                success: true,
                mode: 'mock',
                materials: mockAnalyze(fileName || 'image.jpg')
            });
        }

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // 2. Prepare image for Groq (Base64 Data URL)
        const arrayBuffer = await file.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        // 3. Prompt Groq Vision (Llama 3.2)
        try {
            console.log('Attemping analysis with Groq Llama-3.2 Vision...');

            const prompt = `
            You are an expert Quantity Surveyor.
            Analyze this image of construction material.
            Identify the MAIN item visible. Do not list background items.
            
            Return a VALID JSON array with this structure:
            [
              {
                "id": "item-1",
                "name": "Detailed Name (e.g. 50kg Cement Bag)",
                "brand": "Brand Name if visible (e.g. PPC, AfriSam)",
                "category": "cement" (or bricks, steel, timber, paint, roofing, other),
                "quantity": 1,
                "unit": "unit" (or bag, m3, length)
              }
            ]
            
            IMPORTANT: Return ONLY the JSON. No Markdown. No text before or after.
            `;

            // 3. Prompt Groq Vision (Llama 3.2) with Fallback
            // Preview models are often decommissioned. Trying stable versions first.
            const MODELS = [
                "llama-3.2-90b-vision-preview", // sometimes re-enabled
                "llama-3.2-11b-vision-preview",
                "llama-3.2-90b-vision",
                "llama-3.2-11b-vision"
            ];
            let successContent = null;
            let loopError = null;

            for (const modelId of MODELS) {
                try {
                    console.log(`Attempting Groq model: ${modelId}`);
                    const completion = await groq.chat.completions.create({
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: dataUrl,
                                        },
                                    },
                                ],
                            },
                        ],
                        model: modelId,
                        temperature: 0.1,
                        max_tokens: 1024,
                        top_p: 1,
                        stream: false,
                        response_format: { type: "json_object" }
                    });

                    if (completion.choices[0]?.message?.content) {
                        successContent = completion.choices[0].message.content;
                        break;
                    }
                } catch (err: any) {
                    console.warn(`Groq Model ${modelId} failed:`, err.message);
                    loopError = err;
                    if (err.message.includes('decommissioned') || err.message.includes('not found')) {
                        continue;
                    }
                }
            }

            if (!successContent) throw loopError || new Error("All Groq models failed");

            const content = successContent;

            if (!content) {
                throw new Error("No content received from Groq");
            }

            console.log("Groq Raw Response:", content);

            // Clean up response if it contains markdown code blocks (even with json_object mode sometimes)
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();

            let materials: Material[] = [];

            // Parse and Validate
            let parsed = JSON.parse(cleanJson);

            // Handle if it returns object { materials: [...] } or just array [...]
            if (!Array.isArray(parsed) && parsed.materials) {
                parsed = parsed.materials;
            } else if (!Array.isArray(parsed) && parsed.items) {
                parsed = parsed.items;
            } else if (!Array.isArray(parsed) && typeof parsed === 'object') {
                // Single object, wrap in array
                parsed = [parsed];
            }

            if (!Array.isArray(parsed)) {
                throw new Error("AI returned invalid JSON structure (not an array)");
            }

            materials = parsed.map((m: any, i: number) => ({
                id: `ai-groq-${Date.now()}-${i}`,
                name: m.name || 'Unknown Item',
                brand: m.brand || 'Generic',
                category: m.category || 'other',
                quantity: Number(m.quantity) || 1,
                unit: m.unit || 'unit'
            }));

            return NextResponse.json({
                success: true,
                mode: 'live-groq',
                materials
            });

        } catch (aiError: any) {
            console.error('⚠️ Groq API Error:', aiError);

            // Return 500 to frontend
            return NextResponse.json(
                { error: `AI Analysis Failed: ${aiError.message || 'Unknown error'}` },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Critical Error in analyze route:', error);
        return NextResponse.json({ error: 'Server processing error' }, { status: 500 });
    }
}
