import { NextResponse } from 'next/server';
import { groqClient, isGroqConfigured } from '@/lib/groq';
import { deepseekClient, isDeepseekConfigured } from '@/lib/deepseek';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    if (!isGroqConfigured && !isDeepseekConfigured) {
        console.warn('⚠️ No AI API keys found. Falling back to simple heuristic estimation.');
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
3. "basePrice": A realistic, highly accurate estimated price in ZAR (South African Rands) for a typical unit of this item. E.g. for a 18V cordless drill, price might be 2500.00. For a 4000L Jojo water tank, price might be 5500.00. For a bag of cement, 110.00. Respond with just the float number natively (e.g. 100.00), no currency symbols or strings.
4. "laborCostEstimate": A realistic estimate for the installation labor cost for this item in ZAR.
ONLY RETURN VALID JSON. Nothing else.`;

    let rawResponse = '{}';
    let success = false;

    // Try DeepSeek First
    if (isDeepseekConfigured) {
        try {
            console.log('Attempting DeepSeek model: deepseek-chat for estimate');
            const chatCompletion = await deepseekClient.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }],
                model: 'deepseek-chat',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
            success = true;
        } catch (err: any) {
            console.warn('DeepSeek Estimation Error, falling back to Groq:', err.message);
        }
    }

    // Try Groq if DeepSeek failed or wasn't configured
    if (!success && isGroqConfigured) {
        try {
            console.log('Attempting Groq model for estimate fallback');
            const chatCompletion = await groqClient.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.1,
                response_format: { type: 'json_object' },
            });
            rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
        } catch (err: any) {
            console.error('Groq Estimation Error:', err.message);
            return NextResponse.json({
                category: 'other',
                basePrice: 95,
                standardizedName: query
            });
        }
    }

    try {
        const parsed = JSON.parse(rawResponse);
        // Enforce safe defaults if LLM hallucinated
        const safePrice = typeof parsed.basePrice === 'number' && parsed.basePrice > 0 ? parsed.basePrice : 95;
        const safeLabor = typeof parsed.laborCostEstimate === 'number' ? parsed.laborCostEstimate : 0;
        const safeCategory = parsed.category || 'other';
        const safeName = parsed.standardizedName || query;

        return NextResponse.json({
            category: safeCategory,
            basePrice: safePrice,
            laborCostEstimate: safeLabor,
            standardizedName: safeName
        });
    } catch (parseError) {
        console.error('Failed to parse AI estimate JSON:', parseError);
        return NextResponse.json({ category: 'other', basePrice: 95, standardizedName: query });
    }
}
