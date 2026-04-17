import OpenAI from 'openai';

// Initialize the OpenAI client pointed at DeepSeek's API
// This reads the DEEPSEEK_API_KEY from the environment
export const deepseekClient = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || 'missing-key',
});

// Helper flag so other modules know if we're actually configured
export const isDeepseekConfigured = process.env.DEEPSEEK_API_KEY !== undefined && process.env.DEEPSEEK_API_KEY !== '';
