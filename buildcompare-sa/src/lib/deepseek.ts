import OpenAI from 'openai';

// Initialize the OpenAI client dynamically to ensure we capture the env var at execution time
export const getDeepseekClient = () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    return new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey || 'missing-key',
    });
};

// Helper function to verify configuration at runtime
export const checkDeepseekConfigured = () => {
    const key = process.env.DEEPSEEK_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
};
