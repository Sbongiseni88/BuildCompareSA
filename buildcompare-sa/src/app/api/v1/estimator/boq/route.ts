import { NextResponse } from 'next/server';
import { getDeepseekClient, checkDeepseekConfigured } from '@/lib/deepseek';

interface SpecsPayload {
    foundation: string;
    structure: string;
    roofing: string;
    finishing: string;
    includeLabor?: boolean;
}

export async function POST(request: Request) {
    try {
        const specs: SpecsPayload = await request.json();

        const isConfigured = checkDeepseekConfigured();
        console.log(`[BoQ Generator] deepseek_api present: ${isConfigured}`);

        // Build a human-readable spec summary for the prompt
        const specLines: string[] = [];
        if (specs.foundation?.trim()) specLines.push(`Foundation: ${specs.foundation}`);
        if (specs.structure?.trim()) specLines.push(`Structure: ${specs.structure}`);
        if (specs.roofing?.trim()) specLines.push(`Roofing: ${specs.roofing}`);
        if (specs.finishing?.trim()) specLines.push(`Finishing: ${specs.finishing}`);

        if (specLines.length === 0) {
            return NextResponse.json(
                { error: 'At least one specification field is required.' },
                { status: 400 }
            );
        }

        const specSummary = specLines.join('\n');

        const systemPrompt = `You are an expert South African Quantity Surveyor specialising in residential and commercial construction.
The user has provided these engineering specifications for a building project:

${specSummary}

Based on these specifications and SANS 10400 building standards, generate a comprehensive Bill of Quantities (BoQ).

CRITICAL RULES:
1. **Qualitative Filters vs Quantitative Multipliers**:
   - Specs like "30MPa", "42.5N", "CEM II", "IBR 0.47mm" are GRADES/TYPES — include them in the "name" field as classification.
   - NEVER multiply grade numbers by quantities (e.g., "30MPa concrete" with 5m³ = 5m³, NOT 150).
   - Quantities must be realistic physical measurements (bags, m², m³, lengths).

2. **Unit of Measure (UOM)**:
   - Always use correct SA construction units: bags (50kg cement), each (bricks), m² (tiles, roofing), m³ (sand, concrete), lengths (steel, timber), sheets (roofing).
   - Never report bulk prices as per-unit or vice versa.

3. **Labour Engine & Logic**:
   - ${specs.includeLabor ? 'The user requested a Labour Estimate. Calculate realistic "laborCostEstimate" in ZAR for each item based on Gauteng benchmarks (e.g., Bricklaying: ~R120/m², Concrete: ~R350/m³, Painting: ~R40/m²). Do NOT output separate "General Labor" line items; attach the labor cost directly to the relevant material.' : 'Do NOT include labor estimates. Set "laborCostEstimate" to 0.'}

4. **Smart Conversion (52x Multiplier)**:
   - If the material is "Brickwork" or "Masonry" and the calculated Unit is "m²", you MUST multiply the Quantity by 52 to get the actual Brick Count in "each" (e.g., 200m² = 10,400 bricks).
   - However, if calculating labor for that brickwork, base the \`laborCostEstimate\` on the original m² figure (e.g., 200m² * R120/m²), NOT the multiplied brick count.

Return a JSON object with a single key "materials" containing an array. Each item MUST have:
- "name": Descriptive material name in Title Case (e.g. "OPC 42.5N Cement 50Kg Bag")
- "category": One of: cement, bricks, steel, timber, plumbing, electrical, paint, roofing, tiles, hardware, other
- "quantity": A realistic numeric quantity (integer or float)
- "unit": The unit of measure (e.g. "bags", "m²", "m³", "lengths", "kg", "each", "sheets")
- "brand": A suggested South African brand if applicable (e.g. "PPC", "Corobrik", "Safal"), or null
- "laborCostEstimate": A numeric estimate for installation labor in ZAR (or 0 if not applicable).

Generate between 8 and 20 line items covering all specified construction phases.
Be realistic with South African material names, quantities, and brands.
ONLY RETURN VALID JSON. Nothing else.`;

        if (!isConfigured) {
            console.warn('⚠️ DeepSeek not configured. Returning heuristic fallback BoQ.');
            return NextResponse.json({
                materials: generateFallbackBoQ(specs)
            });
        }

        try {
            console.log('[BoQ Generator] Calling DeepSeek deepseek-chat...');
            const client = getDeepseekClient();
            const chatCompletion = await client.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }],
                model: 'deepseek-chat',
                temperature: 0.2,
                response_format: { type: 'json_object' },
            });

            const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
            console.log('[BoQ Generator] Raw AI response length:', rawResponse.length);

            const parsed = JSON.parse(rawResponse);

            if (parsed.materials && Array.isArray(parsed.materials)) {
                return NextResponse.json({ materials: parsed.materials });
            }

            // AI returned valid JSON but no materials array
            console.warn('[BoQ Generator] AI returned JSON without materials array. Returning fallback.');
            return NextResponse.json({
                materials: generateFallbackBoQ(specs)
            });

        } catch (aiError: any) {
            console.error('[BoQ Generator] DeepSeek API error:', aiError.message);
            return NextResponse.json({
                materials: generateFallbackBoQ(specs)
            });
        }

    } catch (parseError) {
        console.error('[BoQ Generator] Request parse error:', parseError);
        return NextResponse.json(
            { error: 'Invalid request body.' },
            { status: 400 }
        );
    }
}

/**
 * Heuristic fallback when DeepSeek is unavailable.
 * Returns a sensible default BoQ based on which spec fields are populated.
 */
function generateFallbackBoQ(specs: SpecsPayload) {
    const materials: any[] = [];

    if (specs.foundation?.trim()) {
        materials.push(
            { name: 'OPC 42.5N Cement 50kg', category: 'cement', quantity: 40, unit: 'bags', brand: 'PPC' },
            { name: 'Building Sand', category: 'cement', quantity: 6, unit: 'm³', brand: null },
            { name: '19mm Stone Aggregate', category: 'cement', quantity: 4, unit: 'm³', brand: null },
            { name: 'Y12 Reinforcing Bar 6m', category: 'steel', quantity: 20, unit: 'lengths', brand: 'ArcelorMittal' }
        );
    }

    if (specs.structure?.trim()) {
        materials.push(
            { name: 'Maxi Brick 290x90x140mm', category: 'bricks', quantity: 3000, unit: 'each', brand: 'Corobrik' },
            { name: 'Building Lime 25kg', category: 'cement', quantity: 10, unit: 'bags', brand: null },
            { name: 'BRC Mesh Ref 193 (5.6m x 2.4m)', category: 'steel', quantity: 8, unit: 'sheets', brand: null }
        );
    }

    if (specs.roofing?.trim()) {
        materials.push(
            { name: 'IBR Roof Sheeting 0.47mm x 6m', category: 'roofing', quantity: 30, unit: 'sheets', brand: 'Safal' },
            { name: 'Roof Truss (Standard)', category: 'timber', quantity: 12, unit: 'each', brand: null },
            { name: 'Brandering 38x38mm SA Pine', category: 'timber', quantity: 40, unit: 'lengths', brand: null }
        );
    }

    if (specs.finishing?.trim()) {
        materials.push(
            { name: 'Plaster Sand', category: 'cement', quantity: 4, unit: 'm³', brand: null },
            { name: 'Premium Acrylic PVA 20L', category: 'paint', quantity: 4, unit: 'each', brand: 'Dulux' },
            { name: 'Ceramic Floor Tile 600x600mm', category: 'tiles', quantity: 60, unit: 'm²', brand: null }
        );
    }

    if (materials.length === 0) {
        materials.push(
            { name: 'OPC 42.5N Cement 50kg', category: 'cement', quantity: 20, unit: 'bags', brand: 'PPC', laborCostEstimate: specs.includeLabor ? 500 : 0 },
            { name: 'Building Sand', category: 'cement', quantity: 3, unit: 'm³', brand: null, laborCostEstimate: specs.includeLabor ? 150 : 0 }
        );
    }

    return materials;
}
