import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Initialize the Groq client
// Fallback gracefully if the API key is not present in the environment
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'missing-key',
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    if (process.env.GROQ_API_KEY === undefined || process.env.GROQ_API_KEY === '') {
        console.warn('GROQ_API_KEY is missing. Falling back to simple heuristic estimation.');
        return NextResponse.json({
            category: 'other',
            basePrice: 95,
            standardizedName: query
        });
    }

    const systemPrompt = `You are an expert South African Quantity Surveyor and Hardware Specialist.
The user is searching for a construction material or tool: "${query}".
Return a JSON object with exactly these three keys:
1. "standardizedName": The clean, professional name of the item.
2. "category": The best matching category. Must be one of: cement, bricks, steel, timber, plumbing, electrical, paint, roofing, tiles, hardware, labor, other.
3. "basePrice": A realistic, highly accurate estimated price in ZAR (South African Rands) for a typical unit of this item. E.g. for a 18V cordless drill, price might be 2500. For a 4000L Jojo water tank, price might be 5500. For a bag of cement, 110. Respond with just the integer/float number, no currency symbols.
ONLY RETURN VALID JSON. Nothing else.`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: systemPrompt }],
            model: 'llama3-8b-8192',
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });

        const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawResponse);

        // Enforce safe defaults if LLM hallucinated
        const safePrice = typeof parsed.basePrice === 'number' && parsed.basePrice > 0 ? parsed.basePrice : 95;
        const safeCategory = parsed.category || 'other';
        const safeName = parsed.standardizedName || query;

        return NextResponse.json({
            category: safeCategory,
            basePrice: safePrice,
            standardizedName: safeName
        });
    } catch (error) {
        console.error('Groq Estimation Error:', error);
        return NextResponse.json({
            category: 'other',
            basePrice: 95,
            standardizedName: query
        });
    }
}
