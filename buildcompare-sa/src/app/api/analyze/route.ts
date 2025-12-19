import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Material } from '@/types';
import { analyzeUploadedImage as mockAnalyze } from '@/data/mockData';

// Initialize Gemini
// NOTE: user needs to add GEMINI_API_KEY to .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;

        // 1. Fallback to mock if no API key is set
        if (!process.env.GEMINI_API_KEY) {
            console.log('⚠️ No GEMINI_API_KEY found, using mock data.');
            // Add a small artificial delay to simulate processing
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

        // 2. Prepare image for Gemini
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Buffer.from(arrayBuffer).toString('base64');

        // 3. Prompt Gemini Vision
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
        You are an expert Quantity Surveyor in South Africa.
        Analyze this image (which might be a photo of construction materials, a construction site, or a handwritten Bill of Quantities).
        
        Extract or identify the construction materials visible or listed.
        For each item found:
        - Identify the likely Brand if visible (e.g. PPC, Corobrik, Dulux). 
        - Categorize it (cement, bricks, steel, timber, paint, plumbing, electrical, other).
          * IMPORTANT: "Cement Primer" is PAINT, not cement. "Tile Adhesive" is OTHER (or adhesives), not cement.
        - Estimate a quantity.
        - Guess the unit (bags, units, m3, lengths).
        
        Return ONLY a VALID JSON array with objects matching this interface:
        {
          id: string (unique),
          name: string,
          brand: string (optional),
          category: string,
          quantity: number,
          unit: string
        }
      `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: bytes,
                        mimeType: file.type || 'image/jpeg'
                    }
                }
            ]);

            const response = result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            let materials: Material[] = [];
            try {
                materials = JSON.parse(text);
                materials = materials.map((m, i) => ({
                    ...m,
                    id: `ai-scan-${Date.now()}-${i}`
                }));

                return NextResponse.json({
                    success: true,
                    mode: 'live-ai',
                    materials
                });
            } catch (parseError) {
                console.error('AI JSON Parse Error:', parseError);
                throw new Error('Failed to parse AI response');
            }
        } catch (aiError) {
            console.error('⚠️ Google Gemini API Error:', aiError);
            console.log('🔄 Falling back to mock analysis due to API error...');

            // FALLBACK TO MOCK DATA ON ERROR
            return NextResponse.json({
                success: true,
                mode: 'mock-fallback',
                materials: mockAnalyze(fileName || 'image.jpg')
            });
        }

    } catch (error) {
        console.error('Critical Error in analyze route:', error);
        // Ultimate fallback
        return NextResponse.json({
            success: true,
            mode: 'critical-fallback',
            materials: mockAnalyze('fallback.jpg')
        });
    }
}
